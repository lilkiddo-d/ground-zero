import Link from "next/link";
import { brand } from "@/config/brand";
import { activeChain, explorer, launchpadAddress } from "@/lib/chain";
import { Wordmark } from "./Logo";

const cols = [
  { title: "Product", links: [["Launch a coin", "/"], ["Discover", "/discover"], ["Wallet", "/wallet"], ["Points", "/points"]] },
  { title: "Learn", links: [["How it works", "/docs"], ["Fees", "/docs#fees"], ["FAQ", "/docs#faq"]] },
  { title: "Legal", links: [["Terms of use", "/terms"], ["Privacy policy", "/privacy"], ["Risk disclosure", "/risk"]] },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" aria-label={brand.name}><Wordmark size={26} /></Link>
            <p>{brand.description}</p>
            <div className="row wrap" style={{ gap: 8 }}>
              <a className="chip-link" href={`https://x.com/${brand.x}`} target="_blank" rel="noreferrer">𝕏 @{brand.x}</a>
              {explorer && (
                <a className="chip-link mono" href={`${explorer}/address/${launchpadAddress}`} target="_blank" rel="noreferrer">Contract ↗</a>
              )}
              <span className="chip-link mono"><span className="pulse-dot" style={{ width: 6, height: 6, marginRight: 7 }} />{activeChain.name}</span>
            </div>
            {/* Network attribution only, not our logo. Check LayerZero's brand guidelines before launch. */}
            <a className="built-on" href="https://layerzero.network" target="_blank" rel="noreferrer" title="Zero, by LayerZero">
              <img src="/zero-logo.jpg" alt="" width={20} height={20} />
              <span>Built on <b>Zero</b></span>
            </a>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="footer-col">
              <span className="label">{c.title}</span>
              {c.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            </div>
          ))}
        </div>

        <p className="footer-risk">
          {brand.name} is an independent launchpad on Zero and is not affiliated with LayerZero Labs. Anyone can create a coin;
          {" "}{brand.name} does not review, endorse or vouch for any coin listed here. Coins are highly speculative and most lose all of their value.
          Nothing on this site is financial, investment or legal advice. Only use money you can afford to lose, and check that using
          this service is legal where you live.
        </p>

        <div className="footer-bottom">
          <span>© {year} {brand.name}. All rights reserved.</span>
          <span className="row wrap" style={{ gap: 16 }}>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/risk">Risk</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
