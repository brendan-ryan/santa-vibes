"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, markMessagesRead } from "./actions";

type Message = {
  id: string;
  senderRole: "GIVER" | "RECEIVER";
  body: string;
  isCanned: boolean;
  sentAt: string;
  readAt: string | null;
};

type Props = {
  pairingId: string;
  role: "GIVER" | "RECEIVER";
  partnerName: string;
  messages: Message[];
};

const CANNED: Record<"GIVER" | "RECEIVER", string[]> = {
  GIVER: [
    "Any hints on what you'd like? 🤔",
    "I think I found the perfect gift! 🎁",
    "Almost ready — so excited! 🎄",
  ],
  RECEIVER: [
    "Thanks for being my Secret Santa! 🎄",
    "I just updated my wishlist!",
    "Can't wait for Christmas! 🎁",
  ],
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
}

export default function MessageThread({ pairingId, role, partnerName, messages }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark incoming messages as read on mount, then refresh so the layout
  // re-fetches unreadCount and the nav badge clears on next navigation
  useEffect(() => {
    markMessagesRead(pairingId).then(() => startTransition(() => router.refresh()));
  }, [pairingId]);

  async function handleSend(body: string, isCanned = false) {
    const trimmed = body.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    const result = await sendMessage(pairingId, trimmed, isCanned);

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setInput("");
    setLoading(false);
    startTransition(() => router.refresh());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleSend(input);
  }

  const charsLeft = 255 - input.length;

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderRole === role;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "bg-red-700 text-white rounded-tr-sm"
                      : "bg-zinc-100 text-zinc-800 rounded-tl-sm"
                  }`}
                >
                  {msg.body}
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[11px] text-zinc-400">{formatTime(msg.sentAt)}</span>
                  {isMine && msg.readAt && (
                    <span className="text-[11px] text-zinc-400">· Read</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Canned message chips */}
      <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-zinc-100">
        {CANNED[role].map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => handleSend(text, true)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full border border-zinc-300 text-zinc-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
        {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              rows={1}
              maxLength={255}
              placeholder={`Message ${partnerName}…`}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent resize-none text-base leading-relaxed"
              style={{ minHeight: "42px", maxHeight: "120px" }}
            />
            {input.length > 200 && (
              <span
                className={`absolute bottom-2 right-2 text-[10px] ${
                  charsLeft < 20 ? "text-red-500" : "text-zinc-400"
                }`}
              >
                {charsLeft}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-700 text-white flex items-center justify-center hover:bg-red-800 disabled:opacity-40 transition-colors"
            aria-label="Send"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M15 9H3M15 9l-5-5M15 9l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
