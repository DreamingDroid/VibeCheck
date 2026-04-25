import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
  });
  console.log("Invoking...");
  try {
    const res = await llm.invoke("Hello");
    console.log("Res:", res.content);
  } catch (e) {
    console.error("Err:", e);
  }
}
run();
