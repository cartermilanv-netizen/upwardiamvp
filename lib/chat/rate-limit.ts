import { RATE_LIMIT, RATE_WINDOW_MS } from "@/lib/chat/limits";

const hits = new Map<string, number[]>();

export function resetRateLimit(): void {
  hits.clear();
}

export function consumeRateLimit(
  clientId: string,
  now: number,
  limit = RATE_LIMIT,
  windowMs = RATE_WINDOW_MS,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const recent = (hits.get(clientId) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    hits.set(clientId, recent);
    const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }
  recent.push(now);
  hits.set(clientId, recent);
  return { ok: true };
}
