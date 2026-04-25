import { config } from './config';
import { getChatModel } from './rag';
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

async function run() {
  console.log("API KEY LENGTH:", config.GEMINI_API_KEY.length);
  const llm = getChatModel();
  console.log("LLM created. Invoking...");
  try {
    const res = await llm.invoke([
      new SystemMessage('You are an expert event marketer.'),
      new HumanMessage("Hello")
    ]);
    console.log("Res:", res.content);
  } catch (e) {
    console.error("Err:", e);
  }
}
run();
