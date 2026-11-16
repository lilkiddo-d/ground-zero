"use client";

import { useEffect, useState } from "react";
import { brand } from "@/config/brand";
import { faq, feeTable } from "@/config/fees";
import { launchDate } from "@/lib/chain";
import { Mark, Seismo } from "../Logo";
import { Shockwaves } from "./Shockwaves";
import { MemeStudio } from "./MemeStudio";
import { EarlyList } from "./EarlyList";

const xIntent = (text: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

export function Landing() {
  return (
    <div>
      <div className="container row between" style={{ height: 68 }}>
        <div className="logo"><Mark /> {brand.name}</div>
        <div className="row">
          <span className="tag accent"><span className="pulse-dot" style={{ width: 6, height: 6 }} /> pre-launch</span>
          <a className="btn btn-sm" href={`https://x.com/${brand.x}`} target="_blank" rel="noreferrer">Follow @{brand.x}</a>
        </div>
      </div>

      {/* hero */}
      <section style={{ position: "relative", minHeight: "78vh", display: "grid", placeItems: "center", overflow: "hidden", borderBottom: "1px solid var(--line)" }}>
        <Shockwaves />
        <div className="container" style={{ position: "relative", textAlign: "center", pointerEvents: "none" }}>
          <div className="label" style={{ marginBottom: 18 }}>A launchpad for Zero · tap anywhere</div>
          <h1 className="display" style={{ fontSize: "clamp(40px, 9vw, 112px)", lineHeight: 0.95, margin: 0, fontWeight: 800, textTransform: "uppercase" }}>
            Every coin<br />starts at <span className="accent">ground zero</span>.
          </h1>
          <p className="muted" style={{ fontSize: 18, maxWidth: 620, margin: "22px auto 0" }}>
            Bots pay to snipe. Creators earn on every trade. Copies pay the original. Liquidity locks forever.
          </p>
          <Countdown />
          <div className="row" style={{ justifyContent: "center", marginTop: 26, pointerEvents: "auto", flexWrap: "wrap" }}>
            <a className="btn btn-primary btn-lg" href={`https://x.com/${brand.x}`} target="_blank" rel="noreferrer">Follow @{brand.x}</a>
            <a className="btn btn-lg" href={xIntent(`I'm early to @${brand.x}. ${brand.tagline} ${brand.domain}`)} target="_blank" rel="noreferrer">Post &ldquo;I&apos;m early&rdquo;</a>
          </div>
        </div>
      </section>

      {/* problem -> answer */}
      <section className="container" style={{ paddingTop: 80 }}>
        <div className="label">Why another launchpad</div>
        <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, margin: "10px 0 28px", maxWidth: 780 }}>
          Launchpads were built for the bots. We built this one for the people.
        </h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          {[
            { t: "Snipers pay", q: "the fastest bot buys first", d: "Every coin opens with a 99% sniper fee that falls to 1% within seconds. A bot racing the first block hands nearly everything over, half to the creator." },
            { t: "Know the original", q: "which one is the real one?", d: "The first coin with a ticker is the original. Copies of a live coin pay half their creator fee to it. Every coin shows its dev's record." },
            { t: "No rugs by design", q: "buy works, sell doesn't", d: "One standard contract for every coin. No owner, no mint, no blacklist, no tax. If you can buy it, you can sell it." },
            { t: "Creators get paid", q: "the dev made nothing", d: "Up to 75% of every trade fee goes to the creator, forever, claimable anytime. Plus half of every sniper fee." },
          ].map((c, i) => (
            <div key={c.t} className="panel panel-pad">
              <div className="mono faint" style={{ fontSize: 12, textDecoration: "line-through" }}>{c.q}</div>
              <h3 className="display" style={{ fontSize: 22, margin: "10px 0 8px", fontWeight: 700 }}>{c.t}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{c.d}</p>
              <div style={{ marginTop: 16, opacity: 0.7 }}><Seismo height={28} amp={0.3 + i * 0.2} seed={i + 3} width={300} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* life of a coin */}
      <section className="container" style={{ paddingTop: 80 }}>
        <div className="label">The life of a coin</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 18 }}>
          {[
            { n: "01", t: "Launch", s: "0s", d: "Name, ticker, image. Name your team wallets if you want. Your first buy lands in the same transaction." },
            { n: "02", t: "Open", s: "seconds", d: "The sniper fee starts at 99% and is gone in seconds. Then it's a bonding curve at 1%: buy or sell any time." },
            { n: "03", t: "Breakout", s: "curve full", d: "When the curve fills, liquidity moves into a locked pool at the same price. Your deposit comes back. Your cut rises." },
            { n: "04", t: "Forever", s: "7 days+", d: "Still trading a week later? The creator's cut rises to 75% of every fee." },
          ].map((f) => (
            <div key={f.n} className="panel panel-pad" style={{ position: "relative" }}>
              <div className="row between"><span className="display accent" style={{ fontSize: 32, fontWeight: 800 }}>{f.n}</span><span className="tag">{f.s}</span></div>
              <h3 style={{ margin: "12px 0 6px" }}>{f.t}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* fees */}
      <section className="container" style={{ paddingTop: 80 }}>
        <div className="label">Fees, in the open</div>
        <h2 className="display" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, margin: "10px 0 8px" }}>Every number is fixed in the contract.</h2>
        <p className="muted" style={{ marginBottom: 22 }}>None of them can change for a coin after it launches.</p>
        <div className="panel scroll-x">
          <table className="tbl">
            <tbody>
              {feeTable.map((f) => (
                <tr key={f.k}><td style={{ width: 170 }}><b>{f.k}</b></td><td className="mono accent" style={{ width: 140, fontSize: 15 }}>{f.v}</td><td className="muted">{f.d}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 80 }}><MemeStudio /></section>
      <section className="container" style={{ paddingTop: 80 }}><EarlyList /></section>

      <section className="container" style={{ paddingTop: 80, maxWidth: 860 }}>
        <div className="label" style={{ marginBottom: 14 }}>You asked</div>
        {faq.map((f) => (
          <details key={f.q} className="panel" style={{ padding: "14px 18px", marginBottom: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>{f.q}</summary>
            <p className="muted" style={{ marginBottom: 0 }}>{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}

function Countdown() {
  const target = new Date(launchDate).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const d = now === null ? null : Math.max(0, target - now);
  const parts = d === null
    ? ["--", "--", "--", "--"]
    : [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60].map((n) => String(n).padStart(2, "0"));
  return (
    <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 30 }}>
      {parts.map((p, i) => (
        <div key={i} className="panel" style={{ padding: "10px 14px", minWidth: 74, background: "color-mix(in srgb, var(--panel) 80%, transparent)" }}>
          <div className="display" style={{ fontSize: 30, fontWeight: 700 }}>{p}</div>
          <div className="label">{["days", "hrs", "min", "sec"][i]}</div>
        </div>
      ))}
    </div>
  );
}
