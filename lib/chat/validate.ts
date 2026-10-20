import { MAX_MESSAGE_LENGTH, MAX_MESSAGES } from "@/lib/chat/limits";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ParseResult = { ok: true; messages: ChatMessage[] } | { ok: false; error: string };

const ROLES = new Set<ChatRole>(["user", "assistant"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseChatRequest(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: "Send your question as text." };
  if (Object.keys(body).some((key) => key !== "messages")) {
    return { ok: false, error: "Send only the conversation." };
  }
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "Send your question as text." };
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: "That conversation is too long. Start a new question." };
  }
  const parsed: ChatMessage[] = [];
  for (const message of messages) {
    if (!isRecord(message)) return { ok: false, error: "Send your question as text." };
    if (Object.keys(message).some((key) => key !== "role" && key !== "content")) {
      return { ok: false, error: "Send only the conversation." };
    }
    if (typeof message.role !== "string" || !ROLES.has(message.role as ChatRole)) {
      return { ok: false, error: "Send your question as text." };
    }
    if (typeof message.content !== "string") {
      return { ok: false, error: "Send your question as text." };
    }
    const content = message.content.trim();
    if (!content) return { ok: false, error: "Send your question as text." };
    if (content.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: "That message is too long. Shorten it and try again." };
    }
    parsed.push({ role: message.role as ChatRole, content });
  }
  if (parsed[parsed.length - 1]?.role !== "user") {
    return { ok: false, error: "Send a question to continue." };
  }
  return { ok: true, messages: parsed };
}
