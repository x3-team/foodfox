import type { Area } from "@/lib/admin/auth";

export type NavItem = { href: string; label: string; icon: string; area: Area; group?: string };

/* `group` opens a heading above the item; the layout drops items the role cannot open, so a group heading moves
   to the first visible item of its group. */
export const NAV: NavItem[] = [
  { href: "/admin", label: "Сводка", icon: "dashboard", area: "dashboard" },
  { href: "/admin/leads", label: "Заявки", icon: "leads", area: "leads" },
  { href: "/admin/partners", label: "Партнёры", icon: "partners", area: "partners" },
  { href: "/admin/reviews", label: "Отзывы", icon: "reviews", area: "reviews" },
  { href: "/admin/app/users", label: "Клиенты", icon: "phone", area: "app_users", group: "Приложение" },
  { href: "/admin/app/reports", label: "Отчёты", icon: "report", area: "app_reports", group: "Приложение" },
  { href: "/admin/content", label: "Страницы", icon: "content", area: "content", group: "Сайт" },
  { href: "/admin/course", label: "Курс и программы", icon: "course", area: "course", group: "Сайт" },
  { href: "/admin/blog", label: "Блог", icon: "blog", area: "blog", group: "Сайт" },
  { href: "/admin/prices", label: "Цены", icon: "prices", area: "prices", group: "Сайт" },
  { href: "/admin/seo", label: "SEO", icon: "seo", area: "seo", group: "Сайт" },
  { href: "/admin/media", label: "Медиатека", icon: "media", area: "media", group: "Сайт" },
  { href: "/admin/users", label: "Сотрудники", icon: "users", area: "users", group: "Система" },
  { href: "/admin/audit", label: "Журнал действий", icon: "audit", area: "audit", group: "Система" },
];

/** The visible items, with each group heading kept only on the first item of its group. */
export function visibleNav(can: (area: Area) => boolean): NavItem[] {
  let last: string | undefined;
  return NAV.filter((item) => can(item.area)).map((item) => {
    const group = item.group && item.group !== last ? item.group : undefined;
    if (item.group) last = item.group;
    return { ...item, group };
  });
}
