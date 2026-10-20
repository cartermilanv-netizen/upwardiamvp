import OpenAI from "openai";
import { catalogInstructions } from "@/lib/chat/grounding";
import { CHAT_MODEL, CHAT_TIMEOUT_MS } from "@/lib/chat/limits";
import type { ChatMessage } from "@/lib/chat/validate";
import { residentCatalog } from "@/lib/catalog";

export function buildResponsesRequest(messages: readonly ChatMessage[]) {
  return {
    model: CHAT_MODEL,
    store: false as const,
    temperature: 0.2,
    max_output_tokens: 600,
    instructions: catalogInstructions(residentCatalog),
    input: messages.map((message) => ({ role: message.role, content: message.content })),
  };
}

export async function completeChat(apiKey: string, messages: readonly ChatMessage[]) {
  const client = new OpenAI({ apiKey, timeout: CHAT_TIMEOUT_MS, maxRetries: 0 });
  const request = buildResponsesRequest(messages);
  const response = await client.responses.create(request, { timeout: CHAT_TIMEOUT_MS, maxRetries: 0 });
  return {
    reply: response.output_text.trim(),
    responseId: response.id,
    model: response.model,
    failed: Boolean(response.error) || response.output_text.trim() === "",
  };
}
