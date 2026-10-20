import { completeChat } from "@/lib/chat/complete";
import { RATE_LIMIT } from "@/lib/chat/limits";
import { consumeRateLimit } from "@/lib/chat/rate-limit";
import { parseChatRequest } from "@/lib/chat/validate";

export type ChatResponseBody = { reply: string; responseId: string; model: string } | { error: string };

export type ChatHandlerResult = {
  status: number;
  retryAfterSeconds?: number;
  body: ChatResponseBody;
};

function failureMessage(error: unknown): { status: number; error: string } {
  const name = error instanceof Error ? error.name : "";
  if (name === "APIConnectionTimeoutError" || name === "TimeoutError" || name === "APIUserAbortError") {
    return { status: 504, error: "The assistant took too long. Try again." };
  }
  return { status: 502, error: "The assistant could not answer just now. Try again in a moment." };
}

export async function handleChatRequest(options: {
  body: unknown;
  apiKey: string | undefined;
  clientId: string;
  now: number;
}): Promise<ChatHandlerResult> {
  const parsed = parseChatRequest(options.body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };

  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return { status: 503, body: { error: "Ask Upwardia is not available right now. The assistant is not configured." } };
  }

  const limited = consumeRateLimit(options.clientId, options.now, RATE_LIMIT);
  if (!limited.ok) {
    return {
      status: 429,
      retryAfterSeconds: limited.retryAfterSeconds,
      body: { error: "Too many questions just now. Wait a minute and try again." },
    };
  }

  try {
    const result = await completeChat(apiKey, parsed.messages);
    if (result.failed || !result.reply) {
      return { status: 502, body: { error: "The assistant could not answer just now. Try again in a moment." } };
    }
    return { status: 200, body: { reply: result.reply, responseId: result.responseId, model: result.model } };
  } catch (error) {
    const failure = failureMessage(error);
    return { status: failure.status, body: { error: failure.error } };
  }
}
