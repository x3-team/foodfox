"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/upload", icon: "📤", label: "Отчёт", key: "upload" },
  { href: "/results", icon: "📊", label: "Результаты", key: "results" },
  { href: "/recipes", icon: "🥗", label: "Рецепты", key: "recipes" },
  { href: "/chat", icon: "💬", label: "Чат", key: "chat" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/chat/unread")
      .then((r) => r.json())
      .then((d) => setUnread(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <nav className="flex shrink-0 items-center justify-between border border-fox-border bg-white px-4 pb-7 pt-3">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`relative flex w-[72px] flex-col items-center gap-1 text-[11px] ${
              active ? "font-semibold text-fox-primary" : "font-normal text-fox-muted"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "chat" && unread > 0 && (
              <span className="absolute -right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
