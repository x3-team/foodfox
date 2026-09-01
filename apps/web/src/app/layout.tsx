import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodFox — FOX Food Xplorer",
  description: "Персональный план питания по результатам FOX IgG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-fox-bg antialiased">{children}</body>
    </html>
  );
}
