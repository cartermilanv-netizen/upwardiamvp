"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { residentCatalog } from "@/lib/catalog";
import { PublishedListing } from "@/components/published-listing";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat/limits";
import { withAssistantReply, withUserMessage } from "@/lib/chat/thread";
import type { ChatMessage } from "@/lib/chat/validate";
import { emptyNeedChatMessage, programsForNeed, resourceNeed } from "@/lib/resources";

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
  const params = useSearchParams();
  const program = residentCatalog.find((entry) => entry.id === params.get("program"));
  const need = resourceNeed(params.get("need"));
  const notice = need && programsForNeed(residentCatalog, need.id).length === 0 ? emptyNeedChatMessage(need.label) : null;
  const initialQuestion = program ? `What can you tell me about ${program.name}?` : "";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialQuestion);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [messages, status, error]);

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
      setMessages(withAssistantReply(next, reply.trim()));
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
    const next = withUserMessage(messages, content);
    setMessages(next);
    setDraft("");
    void send(next);
    fieldRef.current?.focus();
  }

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col">
      <header className="shrink-0 px-4 pt-4 pb-3">
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Ask a question</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#092451] sm:text-3xl">Ask Upwardia</h1>
        <div className="mt-2 h-1.5 w-16 rounded-full bg-[#FFC928]" aria-hidden />
        {notice && (
          <p className="mt-3 rounded-2xl border border-[#e4e0d8] bg-white px-4 py-3 text-sm leading-relaxed text-stone-800" role="note">
            {notice}
          </p>
        )}
        {initialQuestion && (
          <p className="mt-3 text-sm leading-relaxed text-stone-700">
            This question names a published program. Household answers are not sent.
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-stone-700 sm:text-base">
          {residentCatalog.length === 0
            ? "Ask about resources. The assistant can mention a program only when it is in the verified catalog. No verified resources are loaded right now, so it should say when a listing is missing. Your household assessment, profile, and application drafts are not sent. Nothing is submitted."
            : "Ask about a published listing. The assistant uses only the verified facts below, cites the official source, and links to the application instructions. Upwardia prepares an application. It does not submit one. Your household assessment, profile, and application drafts are not sent."}
        </p>
      </header>
      <div
        ref={logRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={status === "loading"}
        tabIndex={0}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
      >
        {residentCatalog.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[#092451]">Published facts the assistant can use</p>
            {residentCatalog.map((entry) => (
              <PublishedListing key={entry.id} entry={entry} />
            ))}
          </div>
        )}
        {messages.length === 0 && status === "idle" && residentCatalog.length === 0 && (
          <p className="rounded-2xl border border-[#e4e0d8] bg-white px-4 py-3 text-sm text-stone-700">
            Try a question such as what food help is listed. Your questions stay in this thread, so you can ask a follow-up. If nothing is verified, the answer will say so.
          </p>
        )}
        {messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-8 max-w-[85%] self-end rounded-2xl bg-[#092451] px-4 py-3 text-base leading-relaxed break-words text-white sm:ml-16"
                : "mr-8 max-w-[85%] self-start rounded-2xl border-y border-r border-[#e4e0d8] border-l-4 border-l-[#FFC928] bg-white px-4 py-3 text-base leading-relaxed break-words text-stone-900 sm:mr-16"
            }
          >
            <span className="mb-1 block text-xs font-semibold tracking-wide uppercase opacity-70">
              {message.role === "user" ? "You" : "Upwardia"}
            </span>
            {message.content}
          </p>
        ))}
        {status === "loading" && (
          <p className="mr-8 max-w-[85%] self-start rounded-2xl border-y border-r border-[#e4e0d8] border-l-4 border-l-[#FFC928] bg-white px-4 py-3 text-base text-stone-700">
            Looking that up…
          </p>
        )}
      </div>
      {error && (
        <div role="alert" className="mx-4 mb-3 shrink-0 rounded-2xl border border-rose-200 bg-white px-4 py-3">
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
      <form method="dialog" onSubmit={onSubmit} className="shrink-0 border-t border-[#e4e0d8] bg-white px-4 py-3">
        <label htmlFor="ask-question" className="text-base font-medium text-stone-900">
          Your question
        </label>
        <div className="mt-2 flex items-end gap-2">
          <textarea
            ref={fieldRef}
            id="ask-question"
            name="question"
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="min-h-12 w-full flex-1 resize-y rounded-xl border border-[#e4e0d8] bg-white px-3 py-3 text-base text-stone-950 focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={status === "loading" || draft.trim() === ""}
            className="h-12 shrink-0 rounded-lg bg-[#092451] px-4 text-base font-medium text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
          >
            {status === "loading" ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </main>
  );
}
