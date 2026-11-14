import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { CartDrawer } from "@/components/CartDrawer";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WishlistProvider } from "@/components/WishlistProvider";
import { getUser, toPublicUser } from "@/lib/auth";
import { getLiveSales } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { THEME_COLOR, THEME_COOKIE, parseTheme } from "@/lib/theme";
import { cookies } from "next/headers";
import "./globals.css";

// Self-hosted fonts (src/fonts): no Google download at build/dev time. §18: only the weights we use.
const display = localFont({
  src: [
    { path: "../fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});
const sans = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Aurelia Fine Jewellery", template: "%s · Aurelia" },
  description: "BIS hallmarked fine jewellery: diamond rings, pearl necklaces, gold earrings and bracelets. Free insured shipping across India.",
  // Served from /public: an app/icon.svg file convention causes a reload loop under `next dev --turbo` (Next 14.2).
  icons: { icon: { url: "/icon.svg", type: "image/svg+xml" } },
};

export const viewport: Viewport = { colorScheme: "dark light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, live] = await Promise.all([getUser(), getLiveSales()]);
  // Banner for the live sale ending soonest (that has banner text).
  const bannerSale = live.filter((s) => s.bannerText).sort((a, b) => a.endsAt.localeCompare(b.endsAt))[0];
  const sale = bannerSale ? { text: bannerSale.bannerText!, ends: formatDate(bannerSale.endsAt) } : null;
  const theme = parseTheme(cookies().get(THEME_COOKIE)?.value);
  return (
    // Theme comes from a cookie, so the server renders the right palette: no flash on load.
    <html lang="en-IN" data-theme={theme} className={`${display.variable} ${sans.variable}`}>
      <head>
        <meta name="theme-color" content={THEME_COLOR[theme]} />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <CartProvider>
          <WishlistProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-gold focus:px-4 focus:py-2 focus:text-background">Skip to content</a>
            <Header user={user ? toPublicUser(user) : null} sale={sale} theme={theme} />
            <main id="main" className="flex-1">{children}</main>
            <Footer />
            <CartDrawer />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
