"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconChart, IconChat, IconRecipe, IconUpload } from "./icons";

const NAV = [
  { href: "/upload", label: "Отчёт", key: "upload", Icon: IconUpload },
  { href: "/results", label: "Результаты", key: "results", Icon: IconChart },
  { href: "/recipes", label: "Рецепты", key: "recipes", Icon: IconRecipe },
  { href: "/chat", label: "Чат", key: "chat", Icon: IconChat },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch(withBasePath("/api/chat/unread"))
      .then((r) => r.json())
      .then((d) => setUnread(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <nav className="flex shrink-0 items-stretch justify-around bg-fox-surface px-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-nav">
      {NAV.map(({ href, label, key, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            className={`relative flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
              active ? "bg-fox-primary-soft text-fox-primary" : "text-fox-muted"
            }`}
          >
            <Icon className="h-6 w-6" aria-hidden />
            <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
            {key === "chat" && unread > 0 && (
              <span className="absolute right-3 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fox-red px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
