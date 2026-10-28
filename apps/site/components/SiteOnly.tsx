"use client";

import { usePathname } from "next/navigation";

/** Site-wide overlays (cookie bar, menus, toasts, the reveal observer) stay out of the admin. */
export function SiteOnly({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return path === "/admin" || path?.startsWith("/admin/") ? null : <>{children}</>;
}
