import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";

// Inter (opsz 14, as served by Google Fonts) from the repo; the build-time
// Google Fonts fetch made VPS deploys fail intermittently.
const inter = localFont({
  src: "../fonts/Inter-var.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FoodFox — FOX Food Xplorer",
  description: "Персональный план питания по результатам FOX IgG",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} min-h-screen bg-fox-bg font-sans antialiased`}>
        {process.env.NEXT_PUBLIC_FIGMA_CAPTURE === "1" ? (
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="beforeInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
