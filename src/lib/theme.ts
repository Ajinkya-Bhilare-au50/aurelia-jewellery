// Shared by server (layout reads the cookie) and client (toggle writes it).
export type Theme = "dark" | "light";
export const THEME_COOKIE = "aurelia_theme";
export const DEFAULT_THEME: Theme = "dark"; // brand default ("Dark Luxury")
export const THEME_COLOR: Record<Theme, string> = { dark: "#101010", light: "#FAF7F2" }; // browser UI / address bar
export const parseTheme = (v: string | undefined | null): Theme => (v === "light" || v === "dark" ? v : DEFAULT_THEME);
