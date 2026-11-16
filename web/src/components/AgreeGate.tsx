"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { brand } from "@/config/brand";
import { Mark } from "./Logo";

// First-visit notice. Bump the version to show it again to everyone after changing the terms.
const KEY = `${brand.short.toLowerCase()}-agreed-v1`;

export function AgreeGate() {
  const path = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let agreed = false;
    try { agreed = localStorage.getItem(KEY) === "1"; } catch {}
    setShow(!agreed);
  }, []);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  if (!show || ["/welcome", "/docs", "/terms", "/privacy", "/risk"].some((p) => path.startsWith(p))) return null;

  const agree = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setShow(false);
  };

  return createPortal(
    <div className="gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate panel">
        <div className="row" style={{ gap: 10 }}>
          <Mark size={30} />
          <span className="label">Before you start</span>
        </div>
        <h2 id="gate-title" className="display" style={{ margin: "16px 0 6px", fontSize: 26, fontWeight: 800 }}>How {brand.name} works</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Every coin launches fair: no presale, no team allocation, same curve for everyone.</p>

        <ol className="gate-steps">
          <li><b>Launch</b><span>Name it, add an image, launch in one transaction.</span></li>
          <li><b>Pressure builds</b><span>People buy and sell on a bonding curve. Bots sniping the first seconds pay a fee that drops to 1%.</span></li>
          <li><b>{brand.words.graduate[0].toUpperCase() + brand.words.graduate.slice(1)}</b><span>When the curve fills, liquidity moves into a pool that is locked forever.</span></li>
          <li><b>Creators earn</b><span>The coin&apos;s creator gets a share of every trade, for life.</span></li>
        </ol>

        <div className="gate-risk">
          Coins here are experimental and can lose all their value. Nothing on this site is financial advice.
          Only use money you can afford to lose. By continuing you confirm you are allowed to use this service where you live,
          and you agree to the <a href="/terms" target="_blank" rel="noreferrer">terms of use</a> and <a href="/risk" target="_blank" rel="noreferrer">risk disclosure</a>.
        </div>

        <button className="btn btn-primary btn-lg btn-block" onClick={agree} autoFocus>Agree and continue</button>
      </div>
    </div>,
    document.body,
  );
}
