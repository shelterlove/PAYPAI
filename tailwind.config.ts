import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        pp: {
          cyan: "#00E5FF",
          blue: "#0099FF",
          purple: "#8B5CF6",
          violet: "#A855F7",
        },
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        tilt: {
          "0%": { transform: "rotate3d(0, 0, 0, 0deg)" },
          "100%": { transform: "rotate3d(1, 1, 0, 5deg)" },
        },
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        ripple: "ripple 0.6s linear",
        tilt: "tilt 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
