import type { Config } from "tailwindcss";

// Tokens follow design.md §3 (Dark Luxury). Use these names only; no raw hex in components.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware: values live in CSS variables (globals.css) for dark + light mode.
        background: "rgb(var(--background) / <alpha-value>)",
        surface: { DEFAULT: "rgb(var(--surface) / <alpha-value>)", elevated: "rgb(var(--surface-elevated) / <alpha-value>)", muted: "rgb(var(--surface-muted) / <alpha-value>)" },
        gold: { DEFAULT: "rgb(var(--gold) / <alpha-value>)", hover: "rgb(var(--gold-hover) / <alpha-value>)" },
        ivory: "rgb(var(--ivory) / <alpha-value>)", // primary text colour (dark in light mode)
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        error: "rgb(var(--error) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        // Profile initials backgrounds (Teams-style, one per user). All pass WCAG AA with white text.
        avatar: {
          1: "#8B1E3F", // garnet
          2: "#0F6E6E", // teal
          3: "#4B4FA6", // indigo
          4: "#6B3FA0", // amethyst
          5: "#2F5F8A", // sapphire
          6: "#2E6B3F", // emerald
          7: "#9C3D2E", // rust
          8: "#7A2E6B", // plum
          9: "#8A5A00", // amber
          10: "#4A5568", // slate
          11: "#A23B72", // rose
          12: "#3D5A1E", // olive
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { label: "0.16em" },
      maxWidth: { page: "1440px" },
      keyframes: {
        fade: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        reveal: { from: { transform: "scale(1.04)" }, to: { transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        fade: "fade .5s cubic-bezier(.2,.7,.2,1) both",
        reveal: "reveal 1.2s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
