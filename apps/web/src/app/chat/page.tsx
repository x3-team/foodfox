"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ChatBubble } from "@/components/ChatBubble";
import { IconSend } from "@/components/icons";

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
      <PageHeader title="Чат" subtitle="Бот-нутрициолог ответит по вашему плану и зонам" />
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-[14px] text-fox-muted">Загрузка сообщений…</p>
        )}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            role={msg.role}
            messageType={msg.messageType}
            content={msg.content}
          />
        ))}
        <div ref={bottomRef} />
      </main>
      <div className="flex items-end gap-2 bg-fox-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-nav">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Напишите сообщение…"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-fox-bg px-4 py-3 text-[15px] leading-relaxed text-fox-text outline-none ring-1 ring-fox-border focus:ring-2 focus:ring-fox-primary/30"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fox-primary text-white transition hover:bg-fox-primary-dark disabled:opacity-40"
          aria-label="Отправить"
        >
          <IconSend className="h-5 w-5" />
        </button>
      </div>
    </AppShell>
  );
}
