"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockNumber } from "wagmi";
import { brand } from "@/config/brand";
import { activeChain, nativeSymbol } from "@/lib/chain";
import { useCoins } from "@/lib/data";
import { fmtNative } from "@/lib/format";
import { CoinAvatar } from "./Coin";
import { Mark } from "./Logo";
import { ConnectButton } from "./ConnectButton";

const FAUCETS: Record<number, string> = { 84532: "https://portal.cdp.coinbase.com/products/faucet" };

export function Header() {
  const path = usePathname();
  if (path.startsWith("/welcome")) return null; // the landing page has its own bar
  const faucet = FAUCETS[activeChain.id];
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo header-logo">
          <Mark /> <span>{brand.name}</span>
        </Link>
        <div className="grow" />
        <Search />
        <NetPill />
        {faucet && <a href={faucet} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost hide-sm">Get test {nativeSymbol}</a>}
        <Link href="/launch" className="btn btn-primary btn-sm hide-xs">+ {brand.words.launch}</Link>
        <ConnectButton />
      </div>
    </header>
  );
}

function NetPill() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data: block } = useBlockNumber({ watch: true, query: { refetchInterval: 4000 } });
  return (
    <span className="net-pill hide-sm" title={`${activeChain.name} · chain ${activeChain.id}`}>
      <span className="pulse-dot" style={{ width: 6, height: 6 }} />
      <span>{activeChain.name}</span>
      <span className="faint">#{mounted && block ? block.toString() : "…"}</span>
    </span>
  );
}

function Search() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: coins } = useCoins();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "/" && !typing) || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 0); else { setQ(""); setSel(0); } }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = coins ?? [];
    return (s ? l.filter((c) => c.symbol.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || c.token.toLowerCase() === s) : l).slice(0, 8);
  }, [q, coins]);

  const go = (token: string) => { setOpen(false); router.push(`/coin/${token}`); };

  return (
    <>
      <button className="search-btn" onClick={() => setOpen(true)} aria-label="Search coins">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="hide-sm">Search</span>
        <kbd>/</kbd>
      </button>
      {open && createPortal(
        <div className="cmdk-overlay" onMouseDown={() => setOpen(false)}>
          <div className="cmdk panel" onMouseDown={(e) => e.stopPropagation()}>
            <input
              ref={input}
              className="cmdk-input"
              placeholder="Search coins by name, ticker or address"
              value={q}
              onChange={(e) => { setQ(e.target.value); setSel(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setSel((n) => Math.min(n + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setSel((n) => Math.max(n - 1, 0)); }
                if (e.key === "Enter" && results[sel]) go(results[sel].token);
              }}
            />
            <div className="cmdk-list">
              {results.length === 0 && <div className="faint" style={{ padding: 18 }}>No coins match “{q}”.</div>}
              {results.map((c, i) => (
                <button key={c.token} className={`cmdk-item ${i === sel ? "on" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => go(c.token)}>
                  <CoinAvatar coin={c} size={30} />
                  <span className="grow" style={{ textAlign: "left", minWidth: 0 }}>
                    <b>${c.symbol}</b> <span className="muted">{c.name}</span>
                  </span>
                  <span className="mono faint" style={{ fontSize: 12 }}>{fmtNative(c.marketCap, 3)} {nativeSymbol}</span>
                </button>
              ))}
            </div>
            <div className="cmdk-foot faint mono">↑↓ to move · enter to open · esc to close</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
