import Link from "next/link";
import { brand } from "@/config/brand";

// Placeholder legal copy. Replace with text reviewed by a lawyer for your jurisdiction before launch.
export const LEGAL_UPDATED = "November 14, 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container legal">
      <div className="label">Legal</div>
      <h1 className="display">{title}</h1>
      <p className="faint mono" style={{ fontSize: 12 }}>Last updated {LEGAL_UPDATED}</p>
      <div className="notice" style={{ margin: "18px 0 28px" }}>
        Draft text. {brand.name} will publish final terms before mainnet. Questions: <a href={`https://x.com/${brand.x}`} target="_blank" rel="noreferrer">@{brand.x}</a>.
      </div>
      {children}
      <div className="row wrap legal-nav">
        <Link href="/terms">Terms of use</Link>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/risk">Risk disclosure</Link>
      </div>
    </div>
  );
}
