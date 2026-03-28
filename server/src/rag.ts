import { Pool } from 'pg';
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { z } from 'zod';

const RUN_MODE = process.env.RUN_MODE || 'local';
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

const embeddings = new OllamaEmbeddings({
  model: process.env.EMBED_MODEL || 'mxbai-embed-large',
  baseUrl: OLLAMA_BASE,
});

// ── Chat Model: Ollama (local) or Gemini (cloud) ─────────────────────────────
let chatModel: any;
if (RUN_MODE === 'cloud') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
  chatModel = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
  });
  console.log('[RAG] Running with Gemini Flash (cloud mode)');
} else {
  chatModel = new ChatOllama({
    model: process.env.CHAT_MODEL || 'llama3.1',
    baseUrl: OLLAMA_BASE,
  });
  console.log('[RAG] Running with Ollama (local mode)');
}

const QuerySchema = z.object({
  query: z.string().min(1),
  city: z.string().optional(),
  userId: z.string().optional(),
});

// 1. Define the Graph State using Annotation
export const GraphState = Annotation.Root({
  query: Annotation<string>(),
  city: Annotation<string | undefined>(),
  userId: Annotation<string | undefined>(),
  preferences: Annotation<string | null>(),
  events: Annotation<any[]>(),
  answer: Annotation<string>(),
});

// Factory to create the compiled RAG Graph
export function buildRagGraph(pool: Pool) {
  
  // Node 1: Fetch user preferences if userId is provided
  async function retrievePreferences(state: typeof GraphState.State) {
    const { userId } = state;
    if (!userId) {
      return { preferences: null };
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT preferences FROM users WHERE phone_number = $1`,
        [userId]
      );
      if (rows.length > 0 && rows[0].preferences) {
        return { preferences: JSON.stringify(rows[0].preferences) };
      }
      return { preferences: null };
    } finally {
      client.release();
    }
  }

  // Node 2: Retrieve matching events from pgvector
  async function retrieveEvents(state: typeof GraphState.State) {
    const { query } = state;
    const queryEmbedding = await embeddings.embedQuery(query);
    const client = await pool.connect();
    
    try {
      const { rows } = await client.query(
        `
        SELECT
          id,
          title,
          description,
          location,
          date_time AS event_date,
          category,
          1 - (embedding <=> $1::vector) AS similarity
        FROM events
        ORDER BY embedding <=> $1::vector
        LIMIT 8;
        `,
        [queryEmbedding]
      );
      
      // Update state with events found
      return { events: rows };
    } finally {
      client.release();
    }
  }

  // Node 3: Generate answer using the retrieved context
  async function generateAnswer(state: typeof GraphState.State) {
    const { query, events, preferences } = state;
    
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
          `${idx + 1}. ${r.title} @ ${r.location ?? 'TBA'}\n` +
          `   When: ${r.event_date}\n` +
          `   Category: ${r.category ?? 'general'}\n` +
          `   Details: ${r.description}`
      )
      .join('\n\n');

    let systemPrompt = `
You are VibeCheck, a friendly WhatsApp concierge helping people discover events in their city.
Answer concisely, in a conversational tone, and reference specific events from the context below.
If something is not in the context, do not hallucinate – say you don't know.`;

    // Inject user preferences here if any
    if (preferences) {
      systemPrompt += `\n\nTake the following user preferences into consideration when making your suggestion tone and highlights:\n"${preferences}"`;
    }

    const userPrompt = `
User query: "${query}"

Here are candidate events from the database:

${context}

Craft a short answer for WhatsApp (max ~4 sentences) suggesting the best options depending on the user's vibe and request.
`;

    const response = await chatModel.invoke([
      ['system', systemPrompt],
      ['user', userPrompt],
    ]);

    // Update state with the final answer
    return { answer: response.content as string };
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
  const { query, city, userId } = QuerySchema.parse(body);

  // Lazy-load the compiled graph once
  if (!compiledGraph) {
    compiledGraph = buildRagGraph(pool);
  }

  // Invoke the workflow with the initial state
  const finalState = await compiledGraph.invoke({
    query,
    city,
    userId,
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
  const queryEmbedding = await embeddings.embedQuery(preferences);
  
  const client = await pool.connect();
  try {
    await client.query(
      `
      INSERT INTO users (phone_number, preferences)
      VALUES ($1, jsonb_build_object('interaction_history', $2::text))
      ON CONFLICT (phone_number) DO UPDATE
      SET preferences = jsonb_set(
            COALESCE(users.preferences, '{}'::jsonb),
            '{interaction_history}',
            to_jsonb($2::text)
          ),
          updated_at = CURRENT_TIMESTAMP;
      `,
      [userId, preferences]
    );
    return { success: true, message: "User preferences updated." };
  } finally {
    client.release();
  }
}
