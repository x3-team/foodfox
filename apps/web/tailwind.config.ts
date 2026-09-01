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
          bg: "#f1f8e9",
          primary: "#2e7d33",
          "primary-light": "#4db04f",
          text: "#1a1a1a",
          muted: "#666666",
          border: "#e0e0e0",
          reminder: "#e3f2e3",
        },
      },
      maxWidth: {
        phone: "430px",
      },
    },
  },
  plugins: [],
};
export default config;
