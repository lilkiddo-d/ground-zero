"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/config/brand";
import { Mark } from "./Logo";

// Icon rail on the left. Hover (or keyboard focus) expands it to show labels; it overlays the page instead of pushing it.
// On phones it turns into a bottom tab bar.
const I = {
  launch: <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />,
  discover: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h2" /></>,
  points: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />,
  docs: <><path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4M8 12h8M8 16h6" /></>,
  x: <path d="M4 4l16 16M20 4 4 20" />,
};

const links = [
  { href: "/", label: "Launch", icon: I.launch },
  { href: "/discover", label: "Discover", icon: I.discover },
  { href: "/wallet", label: "Wallet", icon: I.wallet },
  { href: "/points", label: "Points", icon: I.points, badge: "S0" },
  { href: "/docs", label: "Docs", icon: I.docs },
];

const isActive = (href: string, path: string) =>
  href === "/" ? path === "/" || path.startsWith("/launch") : path.startsWith(href);

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function Sidebar() {
  const path = usePathname();
  if (path.startsWith("/welcome")) return null;
  return (
    <>
      <aside className="sidebar" aria-label="Main" onClick={(e) => (e.target as HTMLElement).closest("a")?.blur()}>
        <Link href="/" className="sb-logo">
          <span className="sb-icon"><Mark size={26} /></span>
          <span className="sb-label display">{brand.name}</span>
        </Link>
        <nav className="sb-nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`sb-link ${isActive(l.href, path) ? "active" : ""}`} title={l.label}>
              <span className="sb-icon"><Icon>{l.icon}</Icon></span>
              <span className="sb-label">{l.label}</span>
              {l.badge && <span className="sb-badge">{l.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="grow" />
        <a className="sb-link" href={`https://x.com/${brand.x}`} target="_blank" rel="noreferrer" title={`@${brand.x}`}>
          <span className="sb-icon"><Icon>{I.x}</Icon></span>
          <span className="sb-label">@{brand.x}</span>
        </a>
      </aside>

      <nav className="mobile-nav" aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={isActive(l.href, path) ? "active" : ""}>
            <Icon>{l.icon}</Icon>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
