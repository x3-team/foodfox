import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  variable: "--font",
});

export const metadata: Metadata = {
  title: {
    default: "Блог о пищевой непереносимости — FOX Food Xplorer",
    template: "%s — FOX Food Xplorer",
  },
  description:
    "Статьи врачей и нутрициологов: как понять свои симптомы, что показывает тест FOX и что делать с результатом.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={manrope.variable} style={{ fontFamily: "var(--font), Manrope, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
