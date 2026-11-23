import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

const sampleReplies = {
  "How does compound interest work?":
    "Compound interest earns interest on your starting amount and on interest already added. At 5% per year, ₹1,000 grows to ₹1,050 after one year and ₹1,102.50 after two. The second year earns ₹52.50 because the balance already includes the first year's interest.",
  "Help me plan a productive week.":
    "Pick three outcomes you want by Friday. Give each one a block on your calendar, then leave gaps for smaller tasks and surprises. Spend five minutes at the end of each day choosing what to start tomorrow.",
  "Help me write a thank-you note.":
    "Start with what the person did and why it mattered. For example: “Thanks for taking the time to review my draft. Your notes helped me see where the introduction was getting in the way. I really appreciate the help.”",
};

export const starterPrompts = Object.keys(sampleReplies);
const replies = new Map(Object.entries(sampleReplies));

export const previewTransport: ChatTransport<UIMessage> = {
  async sendMessages({ messages }) {
    const prompt = messages.findLast((message) => message.role === "user")?.parts
      .flatMap((part) => part.type === "text" ? [part.text] : [])
      .join("");
    const reply = replies.get(prompt ?? "") ??
      "Your question went through. This preview uses sample replies. Live answers will be available when chat is connected.";

    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        controller.enqueue({ type: "start" });
        controller.enqueue({ type: "text-start", id: "reply" });
        controller.enqueue({ type: "text-delta", id: "reply", delta: reply });
        controller.enqueue({ type: "text-end", id: "reply" });
        controller.enqueue({ type: "finish", finishReason: "stop" });
        controller.close();
      },
    });
  },
  async reconnectToStream() {
    return null;
  },
};
