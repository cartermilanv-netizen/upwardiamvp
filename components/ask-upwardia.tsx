"use client";

import { useState, type FormEvent } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat/limits";
import type { ChatMessage } from "@/lib/chat/validate";

type Status = "idle" | "loading" | "error";

function errorText(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  if (status === 429) return "Too many questions just now. Wait a minute and try again.";
  if (status === 504) return "The assistant took too long. Try again.";
  return "The assistant could not answer just now. Try again in a moment.";
}

export function AskUpwardia() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(next: ChatMessage[]) {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        setStatus("error");
        setError(errorText(payload, response.status));
        return;
      }
      const reply = payload && typeof payload === "object" && "reply" in payload ? payload.reply : null;
      if (typeof reply !== "string" || !reply.trim()) {
        setStatus("error");
        setError("The assistant could not answer just now. Try again in a moment.");
        return;
      }
      setMessages([...next, { role: "assistant", content: reply.trim() }]);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("The assistant could not answer just now. Try again in a moment.");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || status === "loading") return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    void send(next);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:py-12">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Ask a question</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#092451]">Ask Upwardia</h1>
        <div className="mt-3 h-1.5 w-16 rounded-full bg-[#FFC928]" aria-hidden />
        <p className="mt-4 text-base leading-relaxed text-stone-700">
          Ask about resources. The assistant can mention a program only when it is in the verified catalog. No verified resources are loaded right now, so it should say when a listing is missing. Your household assessment, profile, and application drafts are not sent. Nothing is submitted.
        </p>
      </div>
      <div role="log" aria-live="polite" aria-busy={status === "loading"} className="flex flex-col gap-3">
        {messages.length === 0 && status === "idle" && (
          <p className="rounded-2xl border border-[#e4e0d8] bg-white px-4 py-3 text-sm text-stone-700">
            Try a question such as what food help is listed. If nothing is verified, the answer will say so.
          </p>
        )}
        {messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-8 rounded-2xl bg-[#092451] px-4 py-3 text-base leading-relaxed text-white"
                : "mr-8 rounded-2xl border border-[#e4e0d8] bg-white px-4 py-3 text-base leading-relaxed text-stone-900"
            }
          >
            <span className="mb-1 block text-xs font-semibold tracking-wide uppercase opacity-70">
              {message.role === "user" ? "You" : "Upwardia"}
            </span>
            {message.content}
          </p>
        ))}
        {status === "loading" && (
          <p className="mr-8 rounded-2xl border border-[#e4e0d8] bg-white px-4 py-3 text-base text-stone-700">Looking that up…</p>
        )}
      </div>
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-white px-4 py-3">
          <p className="text-sm text-rose-800">{error}</p>
          {messages.at(-1)?.role === "user" && (
            <button
              type="button"
              className="mt-3 h-11 rounded-lg bg-[#092451] px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => void send(messages)}
            >
              Try again
            </button>
          )}
        </div>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="ask-question" className="text-base font-medium text-stone-900">
          Your question
        </label>
        <textarea
          id="ask-question"
          name="question"
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          value={draft}
          disabled={status === "loading"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="w-full rounded-xl border border-[#e4e0d8] bg-white px-3 py-3 text-base text-stone-950 focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading" || draft.trim() === ""}
          className="h-12 rounded-lg bg-[#092451] text-base font-medium text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {status === "loading" ? "Sending…" : "Send"}
        </button>
      </form>
    </main>
  );
}
