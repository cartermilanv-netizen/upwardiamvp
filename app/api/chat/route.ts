import { handleChatRequest } from "@/lib/chat/handle";

function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  return "local";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send your question as text." }, { status: 400 });
  }
  const result = await handleChatRequest({
    body,
    apiKey: process.env.OPENAI_API_KEY,
    clientId: clientAddress(request),
    now: Date.now(),
  });
  const headers = new Headers();
  if (result.retryAfterSeconds) headers.set("retry-after", String(result.retryAfterSeconds));
  return Response.json(result.body, { status: result.status, headers });
}
