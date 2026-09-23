export function ChatBubble({
  role,
  messageType,
  content,
}: {
  role: "user" | "assistant" | "system";
  messageType: string;
  content: string;
}) {
  const isUser = role === "user";
  const isReminder = messageType === "daily_reminder";

  if (isReminder) {
    const [header, ...bodyParts] = content.split("\n");
    const body = bodyParts.join("\n");
    return (
      <div className="w-full max-w-[92%] rounded-2xl border border-fox-primary-muted bg-fox-reminder px-4 py-3 shadow-sm">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-fox-primary">
          {header.replace(/^☀️\s*/, "☀️ ")}
        </p>
        <p className="text-[15px] leading-relaxed text-fox-text">{body}</p>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? "bg-fox-primary text-white"
            : "bg-fox-surface text-fox-text ring-1 ring-fox-border/60"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}
