"use client";

import { useState } from "react";
import MessageThread from "./message-thread";

type Message = {
  id: string;
  senderRole: "GIVER" | "RECEIVER";
  body: string;
  isCanned: boolean;
  sentAt: string;
  readAt: string | null;
};

type Thread = {
  pairingId: string;
  role: "GIVER" | "RECEIVER";
  partnerName: string;
  messages: Message[];
  unreadCount: number;
};

export default function MessagesView({ threads }: { threads: Thread[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const thread = threads[activeTab];

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-zinc-100 bg-white">
        <h1 className="text-xl font-bold text-zinc-900 mb-3">Messages</h1>

        {threads.length > 1 && (
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {threads.map((t, i) => (
              <button
                key={t.pairingId}
                onClick={() => setActiveTab(i)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === i
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="truncate max-w-[120px]">
                  {t.role === "GIVER" ? "To " : "From "}
                  {t.partnerName}
                </span>
                {t.unreadCount > 0 && (
                  <span className="flex-shrink-0 text-[10px] font-bold bg-red-700 text-white rounded-full w-4 h-4 flex items-center justify-center">
                    {t.unreadCount > 9 ? "9+" : t.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {threads.length === 1 && (
          <div>
            <p className="text-sm text-zinc-500">
              {thread.role === "GIVER"
                ? `Your conversation with ${thread.partnerName}`
                : "Your conversation with Your Secret Santa 🎅"}
            </p>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-400 flex-shrink-0" aria-hidden>
            <path d="M6 1a3 3 0 0 0-3 3v1H2.5A.5.5 0 0 0 2 5.5v5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5H9V4a3 3 0 0 0-3-3zm-2 3a2 2 0 0 1 4 0v1H4V4z" fill="currentColor" />
          </svg>
          <p className="text-xs text-zinc-400">
            Messages are anonymous — your person only sees &ldquo;Your Secret Santa&rdquo;
          </p>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 min-h-0">
        <MessageThread
          key={thread.pairingId}
          pairingId={thread.pairingId}
          role={thread.role}
          partnerName={thread.partnerName}
          messages={thread.messages}
        />
      </div>
    </div>
  );
}
