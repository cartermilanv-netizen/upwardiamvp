import type { ChatMessage } from "@/lib/chat/validate";

export function withUserMessage(messages: readonly ChatMessage[], content: string): ChatMessage[] {
  return [...messages, { role: "user", content }];
}

export function withAssistantReply(messages: readonly ChatMessage[], content: string): ChatMessage[] {
  return [...messages, { role: "assistant", content }];
}
