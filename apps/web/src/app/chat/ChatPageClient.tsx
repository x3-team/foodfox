"use client";

import { withBasePath } from "@/lib/base-path";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ChatBubble } from "@/components/ChatBubble";
import { IconSend } from "@/components/icons";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  messageType: string;
  content: string;
}

const SUGGESTIONS = [
  "Можно ли гречку?",
  "Что исключить на этой неделе?",
  "Расскажите про 6 неделю",
];

export default function ChatPageClient() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  const loadMessages = () => {
    fetch(withBasePath("/api/chat/messages"))
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
    fetch(withBasePath("/api/chat/unread"), { method: "PATCH" }).catch(() => {});
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: "user", messageType: "chat", content: trimmed },
    ]);
    try {
      const res = await fetch(withBasePath("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      else loadMessages();
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSent.current) {
      autoSent.current = true;
      setInput(q);
      void sendMessage(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <AppShell>
      <PageHeader title="Чат" subtitle="Бот-нутрициолог ответит по вашему плану и зонам FOX" />
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

        {messages.length > 0 && messages.length < 4 && !sending && (
          <div className="flex flex-wrap gap-2 px-1 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="rounded-full bg-fox-primary-soft px-3 py-1.5 text-[13px] font-medium text-fox-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </main>
      <div className="flex items-end gap-2 bg-fox-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-nav">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage(input);
            }
          }}
          rows={1}
          placeholder="Напишите сообщение…"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-fox-bg px-4 py-3 text-[15px] leading-relaxed text-fox-text outline-none ring-1 ring-fox-border focus:ring-2 focus:ring-fox-primary/30"
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
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
