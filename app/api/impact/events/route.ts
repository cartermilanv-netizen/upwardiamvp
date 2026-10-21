import { getDb } from "@/lib/impact/db";
import { ingestResidentEvent } from "@/lib/impact/ingest";

const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return Response.json({ error: "Authentication required." }, { status: 401, headers: noStore });
  const textBody = await request.text();
  if (textBody.length > 4000) return Response.json({ error: "Payload is too large." }, { status: 413, headers: noStore });
  let body: unknown;
  try {
    body = JSON.parse(textBody) as unknown;
  } catch {
    return Response.json({ error: "Payload must be JSON." }, { status: 400, headers: noStore });
  }
  const result = ingestResidentEvent(getDb(), token, body);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: noStore });
  return Response.json({ status: result.status, eventId: result.eventId }, { headers: noStore });
}
