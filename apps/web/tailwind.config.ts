import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fox: {
          bg: "#F7F9F4",
          surface: "#FFFFFF",
          primary: "#256029",
          "primary-dark": "#1B4D1F",
          "primary-soft": "#E8F5E9",
          "primary-muted": "#C8E6C9",
          text: "#1C1C1E",
          muted: "#6B7280",
          border: "#E5E7EB",
          reminder: "#F0FDF4",
          green: "#059669",
          yellow: "#D97706",
          red: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(27,94,32,0.06)",
        nav: "0 -1px 12px rgba(0,0,0,0.06)",
      },
      maxWidth: {
        phone: "430px",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        gentleSpin: {
          "0%, 100%": { transform: "rotate(-6deg)" },
          "50%": { transform: "rotate(6deg)" },
        },
      },
      animation: {
        slideUp: "slideUp 0.35s ease-out",
        gentleSpin: "gentleSpin 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
