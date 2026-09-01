import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

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
      <body className={`${inter.variable} min-h-screen bg-fox-bg font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
