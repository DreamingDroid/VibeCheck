import { ChatOllama } from '@langchain/ollama';

async function run() {
  const llm = new ChatOllama({
    model: 'llama3.3',
    baseUrl: 'http://localhost:11434',
  });
  console.log("Invoking ChatOllama...");
  try {
    const res = await llm.invoke("Hello");
    console.log("Res:", res.content);
  } catch (e) {
    console.error("Err:", e);
  }
}
run();
