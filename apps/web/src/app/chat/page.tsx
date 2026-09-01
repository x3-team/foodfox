"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell, Header } from "@/components/AppShell";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  messageType: string;
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = () => {
    fetch("/api/chat/messages")
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
    fetch("/api/chat/unread", { method: "PATCH" }).catch(() => {});
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: "user", messageType: "chat", content: text },
    ]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      else loadMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <Header title="Чат с ботом" />
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isReminder = msg.messageType === "daily_reminder";
          return (
            <div
              key={msg.id}
              className={`max-w-[90%] rounded-2xl px-3.5 py-3 text-sm ${
                isReminder
                  ? "border border-fox-primary-light bg-fox-reminder text-fox-text"
                  : isUser
                    ? "ml-auto bg-fox-primary text-white"
                    : "bg-white text-fox-text"
              }`}
            >
              {isReminder && (
                <p className="mb-1 text-[11px] font-semibold text-fox-primary">
                  {msg.content.split("\n")[0]}
                </p>
              )}
              <p className="whitespace-pre-wrap">
                {isReminder ? msg.content.split("\n").slice(1).join("\n") : msg.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>
      <div className="flex items-center gap-2 border border-fox-border bg-white px-4 pb-7 pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Напишите сообщение..."
          className="flex-1 rounded-full bg-fox-bg px-4 py-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fox-primary text-lg text-white disabled:opacity-60"
          aria-label="Отправить"
        >
          ➤
        </button>
      </div>
    </AppShell>
  );
}
