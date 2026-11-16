import type { Metadata } from "next";
// Fonts are bundled with the app (no download from Google at build time).
import "@fontsource-variable/unbounded";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { AgreeGate } from "@/components/AgreeGate";
import { brand } from "@/config/brand";
import { isPrelaunch } from "@/lib/chain";

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  openGraph: { title: brand.name, description: brand.description, siteName: brand.name },
  twitter: { card: "summary_large_image", site: `@${brand.x}` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {!isPrelaunch && <Sidebar />}
          {!isPrelaunch && <Header />}
          <main>{children}</main>
          <Footer />
          {!isPrelaunch && <AgreeGate />}
        </Providers>
      </body>
    </html>
  );
}
