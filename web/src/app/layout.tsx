import type { Metadata } from "next";
import { Unbounded, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { AgreeGate } from "@/components/AgreeGate";
import { brand } from "@/config/brand";
import { isPrelaunch } from "@/lib/chain";

const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", weight: ["400", "600", "700", "800"] });
const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-inter" });
const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  openGraph: { title: brand.name, description: brand.description, siteName: brand.name },
  twitter: { card: "summary_large_image", site: `@${brand.x}` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${inter.variable} ${jet.variable}`}>
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
