"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import type { NavItem } from "./nav";

type Props = {
  nav: NavItem[];
  me: { name: string; email: string; role: "admin" | "manager" | "accountant" };
  counts: Record<string, number>;
  logout: () => Promise<void>;
  children: React.ReactNode;
};

const ROLE = { admin: "Администратор", manager: "Менеджер", accountant: "Бухгалтер" };

function isActive(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);
}

export function Shell({ nav, me, counts, logout, children }: Props) {
  const path = usePathname() ?? "/admin";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = nav.find((item) => isActive(path, item.href));
  const initials = (me.name || me.email).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const tabs = ["/admin", "/admin/leads", "/admin/content"].map((href) => nav.find((item) => item.href === href)).filter(Boolean) as NavItem[];

  return (
    <div className={`a-shell${open ? " is-open" : ""}`}>
      <header className="a-top">
        <button type="button" className="a-burger" aria-label="Меню" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" size={24} />
        </button>
        <img src="/icons/logo-light.svg" alt="FOX" />
        <span className="a-top-title">{current?.label ?? "Админка"}</span>
      </header>
      <div className="a-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className="a-side" aria-label="Разделы админки">
        <Link href="/admin" className="a-brand">
          <img src="/icons/logo-light.svg" alt="FOX Food Xplorer" />
          <span>Админка</span>
        </Link>
        <nav className="a-nav">
          {nav.map((item) => (
            <div key={item.href} style={{ display: "contents" }}>
              {item.group && <div className="a-nav-group">{item.group}</div>}
              <Link href={item.href} aria-current={isActive(path, item.href) ? "page" : undefined}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {counts[item.href] ? <span className="a-count">{counts[item.href]}</span> : null}
              </Link>
            </div>
          ))}
        </nav>
        <div className="a-side-foot">
          <Link href="/admin/account" className="a-me">
            <span className="a-avatar">{initials}</span>
            <span>
              <b>{me.name || me.email}</b>
              <small>{ROLE[me.role]}</small>
            </span>
          </Link>
          <Link href="/" target="_blank" className="a-nav-ext" style={{ color: "rgba(248,249,246,.7)", fontSize: 14, padding: "8px 0", display: "flex", gap: 8, alignItems: "center", textDecoration: "none" }}>
            <Icon name="external" size={16} /> Открыть сайт
          </Link>
          <form action={logout}>
            <button type="submit">Выйти</button>
          </form>
        </div>
      </aside>
      <div className="a-main" id="admin-main" role="main">
        <div className="a-main-inner">{children}</div>
      </div>
      <nav className="a-tabs" aria-label="Быстрые разделы">
        {tabs.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(path, item.href) ? "page" : undefined}>
            <Icon name={item.icon} />
            {item.label}
            {counts[item.href] ? <span className="a-dot">{counts[item.href]}</span> : null}
          </Link>
        ))}
        <button type="button" onClick={() => setOpen(true)}>
          <Icon name="more" />
          Ещё
        </button>
      </nav>
    </div>
  );
}
