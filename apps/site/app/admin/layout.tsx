import type { Metadata, Viewport } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Админка FOX", template: "%s · Админка FOX" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#101400" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
