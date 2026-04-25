import { ChatOllama } from '@langchain/ollama';

async function run() {
  const llm = new ChatOllama({
    model: 'qwen2.5-coder:7b',
    baseUrl: 'http://localhost:11434',
  });
  const prompt = `You are an expert event marketer.

Generate a short marketing promo kit for the following event:
Title: Tech Startup Mixer
Category: Networking
Location: Downtown Hub
Date: 2026-05-10
Description: A casual mixer for local founders and investors to connect over drinks and discuss the latest trends in the tech ecosystem.

Please output strictly in the following Markdown format:

### 📱 Instagram Captions
1. [Caption option 1]
2. [Caption option 2]
3. [Caption option 3]

### 💬 WhatsApp Blast
[A punchy, emoji-filled, short message to send to past attendees or groups]

### ✉️ Newsletter Blurb
[A slightly longer, exciting paragraph for an email newsletter]

Keep it fun, high-energy, and suited to the event category! Do not include any other text besides the requested sections.`;

  console.log("Invoking ChatOllama with qwen2.5-coder:7b...");
  const start = Date.now();
  try {
    const res = await llm.invoke(prompt);
    console.log("Res:", res.content);
    console.log("Time ms:", Date.now() - start);
  } catch (e) {
    console.error("Err:", e);
  }
}
run();
