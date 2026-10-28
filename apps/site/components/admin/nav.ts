import type { Area } from "@/lib/admin/auth";

export type NavItem = { href: string; label: string; icon: string; area: Area; group?: string };

export const NAV: NavItem[] = [
  { href: "/admin", label: "Сводка", icon: "dashboard", area: "dashboard" },
  { href: "/admin/leads", label: "Заявки", icon: "leads", area: "leads" },
  { href: "/admin/partners", label: "Партнёры", icon: "partners", area: "partners" },
  { href: "/admin/reviews", label: "Отзывы", icon: "reviews", area: "reviews" },
  { href: "/admin/content", label: "Страницы", icon: "content", area: "content", group: "Сайт" },
  { href: "/admin/course", label: "Курс и программы", icon: "course", area: "course" },
  { href: "/admin/blog", label: "Блог", icon: "blog", area: "blog" },
  { href: "/admin/prices", label: "Цены", icon: "prices", area: "prices" },
  { href: "/admin/seo", label: "SEO", icon: "seo", area: "seo" },
  { href: "/admin/media", label: "Медиатека", icon: "media", area: "media" },
  { href: "/admin/users", label: "Пользователи", icon: "users", area: "users", group: "Система" },
  { href: "/admin/audit", label: "Журнал действий", icon: "audit", area: "audit" },
];
