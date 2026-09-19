import { Pool } from 'pg';
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { z } from 'zod';
import { getUserByPhone } from './queries/users';
import { searchEventsByVector, insertEventRSVP } from './queries/events';
import { config } from './config';

let embeddings: any = null;

export function getEmbeddings() {
  if (embeddings) return embeddings;
  embeddings = new OllamaEmbeddings({
    model: config.EMBED_MODEL || 'mxbai-embed-large',
    baseUrl: config.OLLAMA_BASE_URL,
  });
  console.log('[RAG] Initialized OllamaEmbeddings with', config.EMBED_MODEL || 'mxbai-embed-large');
  return embeddings;
}

// ── Chat Model: Ollama (local) or Gemini (cloud) ─────────────────────────────
let chatModel: any = null;

export function getChatModel() {
  if (chatModel) return chatModel;
  
  if (config.RUN_MODE === 'cloud') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
    chatModel = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: config.GEMINI_API_KEY
    });
    console.log('[RAG] Running with Gemini Flash (cloud mode)');
  } else {
    chatModel = new ChatOllama({
      model: config.CHAT_MODEL,
      baseUrl: config.OLLAMA_BASE_URL,
    });
    console.log('[RAG] Running with Ollama (local mode)');
  }
  return chatModel;
}


const QuerySchema = z.object({
  query: z.string().min(1),
  city: z.string().optional(),
  userId: z.string().optional(),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

// 1. Define the Graph State using Annotation
export const GraphState = Annotation.Root({
  query: Annotation<string>(),
  city: Annotation<string | undefined>(),
  userId: Annotation<string | undefined>(),
  history: Annotation<any[] | undefined>(),
  preferences: Annotation<string | null>(),
  events: Annotation<any[]>(),
  answer: Annotation<string>(),
});

// Factory to create the compiled RAG Graph
export function buildRagGraph(pool: Pool) {
  
  // Node 1: Fetch user preferences if userId is provided
  async function retrievePreferences(state: typeof GraphState.State) {
    const { userId } = state;
    if (!userId) return { preferences: null };

    const user = await getUserByPhone(pool, userId);
    if (user && user.preferences) {
      return { preferences: JSON.stringify(user.preferences) };
    }
    return { preferences: null };
  }

  // Node 2: Retrieve matching events from pgvector
  async function retrieveEvents(state: typeof GraphState.State) {
    const { query, city } = state;
    const queryEmbedding = await getEmbeddings().embedQuery(query);
    
    const rows = await searchEventsByVector(pool, queryEmbedding, city);
    
    if (city) {
      console.log(`[RAG] City boost applied for city: "${city}" — matches: ${rows.filter((r: any) => r.city_rank === 0).length}`);
    }

    return { events: rows };
  }

  // Node 3: Generate answer using the retrieved context
  async function generateAnswer(state: typeof GraphState.State) {
    const { query, events, preferences, history } = state;
    
    // Fallback if no events matched
    if (!events || events.length === 0) {
      return {
        answer: "I couldn't find any events matching that vibe right now. Try a broader query or a different date range."
      };
    }

    // Format events for the prompt context
    const context = events
      .map(
        (r, idx) =>
          `Event Target ID: ${r.id}\n` +
          `${idx + 1}. ${r.title} @ ${r.location ?? 'TBA'}\n` +
          `   When: ${r.event_date}\n` +
          `   Category: ${r.category ?? 'general'}\n` +
          `   Details: ${r.description}`
      )
      .join('\n\n');

    let systemPrompt = `
You are VibeCheck, a friendly WhatsApp concierge helping people discover events in their city.
Answer concisely, in a conversational tone, and reference specific events from the context below.
If something is not in the context, do not hallucinate – say you don't know.
CRITICAL INSTRUCTION: If the user explicitly asks to book, RSVP, or secure a ticket to an event, YOU MUST USE YOUR 'rsvp_to_event' TOOL. Do not just say you will do it, literally execute the tool call!`;

    // Inject user preferences here if any
    if (preferences) {
      systemPrompt += `\n\nTake the following user preferences into consideration when making your suggestion tone and highlights:\n"${preferences}"`;
    }

    if (history && history.length > 0) {
      systemPrompt += `\n\nRecent Conversation History:\n`;
      history.forEach((msg: any) => {
        systemPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      });
    }

    const userPrompt = `
User query: "${query}"

Here are candidate events from the database:

${context}

Craft a short answer for WhatsApp (max ~4 sentences) suggesting the best options depending on the user's vibe and request.
`;

    const llm = getChatModel();
    const messages: any[] = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
    const response = await llm.invoke(messages);

    return { answer: typeof response.content === 'string' ? response.content : JSON.stringify(response.content) };
  }

  // Compile the StateGraph
  const workflow = new StateGraph(GraphState)
    .addNode('retrievePreferences', retrievePreferences)
    .addNode('retrieve', retrieveEvents)
    .addNode('generate', generateAnswer)
    .addEdge('__start__', 'retrievePreferences')
    .addEdge('retrievePreferences', 'retrieve')
    .addEdge('retrieve', 'generate')
    .addEdge('generate', '__end__');

  return workflow.compile();
}

let compiledGraph: ReturnType<typeof buildRagGraph> | null = null;

// The main export to handle API requests
export async function handleEventQuery(pool: Pool, body: unknown) {
  const { query, city, userId, history } = QuerySchema.parse(body);

  // Lazy-load the compiled graph once
  if (!compiledGraph) {
    compiledGraph = buildRagGraph(pool);
  }

  // Invoke the workflow with the initial state
  const finalState = await compiledGraph.invoke({
    query,
    city,
    userId,
    history,
    preferences: null,
    events: [],
    answer: ""
  });

  return {
    answer: finalState.answer,
    events: finalState.events,
    preferencesApplied: finalState.preferences !== null
  };
}

const PreferencesSchema = z.object({
  userId: z.string().min(1),
  preferences: z.string().min(1),
});

// A new function to save the user's personality or preferences
export async function saveUserPreferences(pool: Pool, body: unknown) {
  const { userId, preferences } = PreferencesSchema.parse(body);
  const queryEmbedding = await getEmbeddings().embedQuery(preferences);
  
  const client = await pool.connect();
  try {
    await client.query(
      `
      INSERT INTO users (phone_number, preferences)
      VALUES ($1, jsonb_build_object('interaction_history', $2::jsonb))
      ON CONFLICT (phone_number) DO UPDATE
      SET preferences = jsonb_set(
            COALESCE(users.preferences, '{}'::jsonb),
            '{interaction_history}',
            $2::jsonb
          ),
          updated_at = CURRENT_TIMESTAMP;
      `,
      [userId, JSON.stringify([preferences])]
    );
    return { success: true, message: "User preferences updated." };
  } finally {
    client.release();
  }
}

