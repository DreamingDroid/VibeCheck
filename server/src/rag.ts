import { Pool } from 'pg';
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { z } from 'zod';

const RUN_MODE = process.env.RUN_MODE || 'cloud';
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

const embeddings = new OllamaEmbeddings({
  model: process.env.EMBED_MODEL || 'mxbai-embed-large',
  baseUrl: OLLAMA_BASE,
});

// ── Chat Model: Ollama (local) or Gemini (cloud) ─────────────────────────────
let chatModel: any = null;

export function getChatModel() {
  if (chatModel) return chatModel;
  const currentRunMode = (process.env.RUN_MODE || 'cloud').trim();
  if (currentRunMode === 'cloud') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
    chatModel = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: process.env.GEMINI_API_KEY?.trim(),
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
    const { query, city } = state;
    const queryEmbedding = await embeddings.embedQuery(query);
    const client = await pool.connect();
    
    try {
      let rows: any[];

      if (city) {
        // Explicit city boost: events in the requested city sort first, then by vector similarity
        const result = await client.query(
          `
          SELECT
            id,
            title,
            description,
            location,
            city,
            date_time AS event_date,
            category,
            1 - (embedding <=> $1::vector) AS similarity,
            CASE WHEN city ILIKE $2 THEN 0 ELSE 1 END AS city_rank
          FROM events
          ORDER BY city_rank ASC, embedding <=> $1::vector ASC
          LIMIT 8;
          `,
          [queryEmbedding, `%${city}%`]
        );
        rows = result.rows;
        console.log(`[RAG] City boost applied for city: "${city}" — matches: ${rows.filter(r => r.city_rank === 0).length}`);
      } else {
        // No city preference — pure vector similarity
        const result = await client.query(
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
        rows = result.rows;
      }

      // Update state with events found
      return { events: rows };
    } finally {
      client.release();
    }
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

    // ── Plain async RSVP action (no LangChain wrapper = no TS2589) ─────────
    const executeRsvp = async (eventId: string): Promise<string> => {
      try {
        await pool.query(
          `INSERT INTO event_rsvps (event_id, phone_number) VALUES ($1, $2)`,
          [eventId, state.userId || 'unknown']
        );
        console.log(`[Agent] RSVP inserted for event ${eventId} by ${state.userId}`);
        return 'Successfully registered the user for the event.';
      } catch (e: any) {
        console.error('[Agent] RSVP DB Error:', e.message);
        return 'Failed to register. The user may already be registered for this event.';
      }
    };

    // Gemini function declaration (native format — no LangChain generics)
    const rsvpFunctionDeclaration = {
      name: 'rsvp_to_event',
      description: 'RSVP or book the user to a specific event using its database UUID.',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'The UUID of the event to RSVP to.',
          },
        },
        required: ['eventId'],
      },
    };

    const llm = getChatModel().bind({ tools: [{ functionDeclarations: [rsvpFunctionDeclaration] }] } as any);

    const messages: any[] = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
    let response = await llm.invoke(messages);

    // ── Autonomous Tool Execution Loop ──────────────────────────────────────
    if (response.tool_calls && response.tool_calls.length > 0) {
      messages.push(response);
      for (const call of response.tool_calls) {
        if (call.name === 'rsvp_to_event') {
          const result = await executeRsvp(call.args.eventId as string);
          messages.push(new ToolMessage({ content: result, tool_call_id: call.id }));
        }
      }
      response = await llm.invoke(messages);
    }

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
  const queryEmbedding = await embeddings.embedQuery(preferences);
  
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

// ── NEW: AI Personalization Engine for WhatsApp ────────────────────────────
export async function extractAndSavePreferences(pool: Pool, phoneNumber: string, message: string) {
  try {
    const prompt = `You are a user profiling assistant for an event discovery app. The user sent this message: "${message}".
Extract any implicit or explicit event preferences, vibes, or interests (e.g. relaxing, techno, food, acoustic, sports, networking, quiet, loud, etc).
ALSO, extract their physical city, location, or neighborhood if they naturally mention it (e.g. "I am in Vizag", "Events near MVP Colony").
If there are no clear preferences or location, output exactly "NONE". Keep it very brief, just a 1 sentence summary. Example: "User is in Vizag and wants an acoustic beach party."`;

    const response = await getChatModel().invoke([
      ['system', prompt],
    ]);

    const extracted = typeof response?.content === 'string' ? response.content.trim() : '';
    if (extracted === 'NONE' || !extracted || extracted.toLowerCase().includes('none')) {
      return; 
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT preferences FROM users WHERE phone_number = $1`, [phoneNumber]
      );
      
      const currentPrefs = rows[0]?.preferences || {};
      let history = Array.isArray(currentPrefs.interaction_history) ? currentPrefs.interaction_history : [];
      if (typeof history === 'string') history = [history]; 

      history.push(`${new Date().toISOString().split('T')[0]}: ${extracted}`);
      if (history.length > 5) history.shift(); // Keep last 5 behavioral impressions

      await client.query(
        `UPDATE users SET preferences = jsonb_set(
            COALESCE(preferences, '{}'::jsonb),
            '{interaction_history}',
            $1::jsonb
        ) WHERE phone_number = $2`,
        [JSON.stringify(history), phoneNumber]
      );

      console.log(`[Personalization Engine] Deduced vibe for ${phoneNumber}: ${extracted}`);
    } finally {
      client.release();
    }
  } catch(e) {
    console.error("[Personalization Engine] LLM extraction failed:", e);
  }
}
