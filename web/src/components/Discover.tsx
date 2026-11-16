"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { brand } from "@/config/brand";
import { nativeSymbol } from "@/lib/chain";
import { type Coin, isGraduated, useCoins, useTrades } from "@/lib/data";
import { fmtNative, fmtNum, shortAddr, timeAgo } from "@/lib/format";
import { buildFeed, computeStats, type CoinStats, type FeedEvent, magnitude, pct, priceOf } from "@/lib/market";
import { CoinAvatar, CoinBadges, Pressure } from "./Coin";
import { Shockwaves } from "./landing/Shockwaves";
import { CoinArt, Gauge, Readout, Sparkline } from "./viz";

type Tab = "trending" | "new" | "near" | "graduated";
type SortKey = "mcap" | "change" | "vol" | "pressure" | "age" | "price";
const EMPTY: CoinStats = { vol24: 0n, trades24: 0, buys24: 0, change24: 0, spark: [] };

export function Discover() {
  const { data: coins, isLoading, error } = useCoins();
  const { data: trades } = useTrades();
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 15_000); return () => clearInterval(i); }, []);

  const stats = useMemo(() => computeStats(coins, trades), [coins, trades]);
  const st = (c: Coin) => stats.get(c.token) ?? EMPTY;
  const feed = useMemo(() => buildFeed(coins, trades, 30), [coins, trades]);

  const all = coins ?? [];
  const live = all.filter((c) => !isGraduated(c));
  const near = [...live].sort((a, b) => b.progressBps - a.progressBps).slice(0, 5);
  const topCap = [...all].sort((a, b) => (b.marketCap > a.marketCap ? 1 : -1)).slice(0, 4);
  const epicenter = useMemo(() => {
    // The coin shaking the ground hardest right now: most 24h volume, then closest to breakout.
    return [...live].sort((a, b) => {
      const va = st(a).vol24, vb = st(b).vol24;
      return vb === va ? b.progressBps - a.progressBps : vb > va ? 1 : -1;
    })[0];
  }, [live, stats]); // eslint-disable-line react-hooks/exhaustive-deps

  const vol24 = all.reduce((s, c) => s + st(c).vol24, 0n);
  const trades24 = all.reduce((s, c) => s + st(c).trades24, 0);
  const activeHour = all.filter((c) => Date.now() / 1000 - c.lastTradeAt < 3600).length;
  const creatorPaid = all.reduce((s, c) => s + c.creatorFeesEarned, 0n);
  const recent = [...(trades ?? [])].reverse().slice(0, 24);

  return (
    <>
      {recent.length > 0 && (
        <div className="ticker">
          <div className="ticker-track">
            {[0, 1].map((k) => (
              <span key={k} className="row" style={{ gap: 36 }}>
                {recent.map((t, i) => {
                  const c = coins?.find((x) => x.token === t.token);
                  return (
                    <Link key={`${k}-${i}`} href={`/coin/${t.token}`} className="row" style={{ gap: 6 }}>
                      {c && <CoinAvatar coin={c} size={16} />}
                      <span className="faint">{shortAddr(t.trader)}</span>
                      <span className={t.isBuy ? "up" : "down"}>{t.isBuy ? "bought" : "sold"}</span>
                      {fmtNative(t.native, 3)} {nativeSymbol} of <b>${c?.symbol ?? "?"}</b>
                    </Link>
                  );
                })}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ hero */}
      <section className="container" style={{ paddingTop: 24 }}>
        <div className="hero panel">
          <div className="hero-bg"><Shockwaves /></div>
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="row" style={{ gap: 10, marginBottom: 18 }}>
                <span className="pulse-dot" />
                <span className="label">Live from ground zero · on Zero</span>
              </div>
              <h1 className="display hero-title">
                Every coin starts<br />at <span className="accent glow">ground zero.</span>
              </h1>
              <p className="muted" style={{ fontSize: 17, margin: "18px 0 0", maxWidth: 520 }}>
                Launch in one transaction. Bots pay to snipe, creators earn on every trade, and when the {brand.words.curve} fills,
                liquidity locks forever.
              </p>
              <div className="row wrap" style={{ marginTop: 26 }}>
                <Link href="/" className="btn btn-primary btn-lg">Launch a coin →</Link>
                <a href="#coins" className="btn btn-lg">Explore coins</a>
              </div>
              <div className="readouts">
                <Tile label="Coins launched" value={coins ? String(all.length) : "—"} />
                <Tile label={`${brand.words.graduate}s`} value={coins ? String(all.length - live.length) : "—"} />
                <Tile label="Active last hour" value={coins ? String(activeHour) : "—"} tone="ink" />
                <Tile label="24h volume" value={fmtNative(vol24, 3)} unit={nativeSymbol} />
                <Tile label="24h trades" value={String(trades24)} tone="ink" />
                <Tile label="Paid to creators" value={fmtNative(creatorPaid, 3)} unit={nativeSymbol} />
              </div>
            </div>
            {epicenter ? <EpicenterCard coin={epicenter} s={st(epicenter)} /> : <div className="epi-card panel epi-empty"><span className="label">{brand.words.hottest}</span><p className="muted">No live coins yet. The first launch takes ground zero.</p><Link href="/launch" className="btn btn-primary">Launch the first coin</Link></div>}
          </div>
        </div>
      </section>

      {error && (
        <section className="container" style={{ marginTop: 18 }}>
          <div className="notice err">Could not read the launchpad. Check NEXT_PUBLIC_LAUNCHPAD_ADDRESS and that the RPC is reachable.<br />{String((error as Error).message).slice(0, 200)}</div>
        </section>
      )}

      {/* ------------------------------------------------------------ near breakout */}
      {near.length > 0 && (
        <section className="container section">
          <SectionHead title={`About to ${brand.words.graduate}`} hint={`ranked by ${brand.words.curve}`} />
          <div className="rail">
            {near.map((c, i) => (
              <Link key={c.token} href={`/coin/${c.token}`} className="panel rail-card">
                <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                <Gauge bps={c.progressBps} size={70} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <CoinAvatar coin={c} size={22} />
                    <b className="ellipsis">${c.symbol}</b>
                  </div>
                  <div className="faint mono" style={{ fontSize: 11.5, marginTop: 6 }}>{fmtNative(c.nativeToGraduate, 3)} {nativeSymbol} to go</div>
                  <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>mcap {fmtNative(c.marketCap, 3)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ top by mcap */}
      {topCap.length > 0 && (
        <section className="container section">
          <SectionHead title={brand.words.biggest} hint="top by market cap" />
          <div className="art-grid">
            {topCap.map((c, i) => <ArtCard key={c.token} coin={c} s={st(c)} rank={i + 1} />)}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ all coins + feed */}
      <section className="container section" id="coins">
        <div className="main-split">
          <CoinBoard coins={all} stats={stats} loading={isLoading} />
          <SeismicLog feed={feed} />
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- pieces

function SectionHead({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="display">{title}</h2>
      {hint && <span className="label">{hint}</span>}
      <div className="grow" />
      {children}
    </div>
  );
}

function Tile({ label, value, unit, tone = "accent" }: { label: string; value: string; unit?: string; tone?: "accent" | "ink" }) {
  return (
    <div className="tile">
      <span className="label">{label}</span>
      <Readout value={value} unit={unit} tone={tone} />
    </div>
  );
}

function EpicenterCard({ coin, s }: { coin: Coin; s: CoinStats }) {
  const mag = magnitude(s.vol24, s.trades24);
  return (
    <Link href={`/coin/${coin.token}`} className="epi-card panel">
      <div className="epi-top">
        <span className="label accent row" style={{ gap: 8 }}><span className="pulse-dot" style={{ width: 6, height: 6 }} /> {brand.words.hottest}</span>
        <span className="mag mono">M{mag.toFixed(1)}</span>
      </div>
      <CoinArt coin={coin} height={150} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="display" style={{ fontSize: 22, fontWeight: 800 }}>${coin.symbol}</span>
              <CoinBadges coin={coin} />
            </div>
            <div className="muted ellipsis" style={{ fontSize: 13 }}>{coin.name} · by {shortAddr(coin.creator)}</div>
          </div>
          <Gauge bps={coin.progressBps} size={58} />
        </div>
        <div className="epi-stats">
          <div><span className="label">mcap</span><b className="mono">{fmtNative(coin.marketCap, 3)}</b></div>
          <div><span className="label">24h</span><b className={`mono ${s.change24 >= 0 ? "up" : "down"}`}>{pct(s.change24)}</b></div>
          <div><span className="label">vol 24h</span><b className="mono">{fmtNative(s.vol24, 3)}</b></div>
        </div>
        <div style={{ margin: "12px -2px 0" }}><Sparkline points={s.spark} width={320} height={44} /></div>
        <div style={{ marginTop: 12 }}><Pressure bps={coin.progressBps} height={8} /></div>
        <div className="row between mono faint" style={{ fontSize: 11, marginTop: 6 }}>
          <span>{brand.words.curve} {(coin.progressBps / 100).toFixed(1)}%</span>
          <span>{fmtNative(coin.nativeToGraduate, 3)} {nativeSymbol} to {brand.words.graduate}</span>
        </div>
        <div className="btn btn-primary btn-block" style={{ marginTop: 14 }}>Trade ${coin.symbol}</div>
      </div>
    </Link>
  );
}

function ArtCard({ coin, s, rank }: { coin: Coin; s: CoinStats; rank: number }) {
  return (
    <Link href={`/coin/${coin.token}`} className="panel art-card">
      <div style={{ position: "relative" }}>
        <CoinArt coin={coin} height={168} />
        <span className="art-rank mono">#{rank}</span>
        <span className="art-badges"><CoinBadges coin={coin} /></span>
      </div>
      <div style={{ padding: 14 }}>
        <div className="row between">
          <b className="ellipsis">${coin.symbol} <span className="muted" style={{ fontWeight: 400 }}>{coin.name}</span></b>
          <span className={`mono ${s.change24 >= 0 ? "up" : "down"}`} style={{ fontSize: 12 }}>{pct(s.change24)}</span>
        </div>
        <div className="row between mono" style={{ fontSize: 12, marginTop: 8 }}>
          <span className="faint">mcap</span><span>{fmtNative(coin.marketCap, 3)} {nativeSymbol}</span>
        </div>
        <div style={{ marginTop: 10 }}><Pressure bps={coin.progressBps} height={6} /></div>
      </div>
    </Link>
  );
}

function CoinBoard({ coins, stats, loading }: { coins: Coin[]; stats: Map<string, CoinStats>; loading: boolean }) {
  const [tab, setTab] = useState<Tab>("trending");
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [q, setQ] = useState("");
  const router = useRouter();
  const st = (c: Coin) => stats.get(c.token) ?? EMPTY;

  const list = useMemo(() => {
    let l = [...coins];
    if (q) {
      const s = q.toLowerCase();
      l = l.filter((c) => c.name.toLowerCase().includes(s) || c.symbol.toLowerCase().includes(s) || c.token.toLowerCase() === s);
    }
    if (tab === "near") l = l.filter((c) => !isGraduated(c));
    if (tab === "graduated") l = l.filter(isGraduated);
    const cmp = (a: number | bigint, b: number | bigint) => (a === b ? 0 : a > b ? 1 : -1);
    if (sort) {
      const v = (c: Coin): number | bigint =>
        sort.key === "mcap" ? c.marketCap : sort.key === "change" ? st(c).change24 : sort.key === "vol" ? st(c).vol24
          : sort.key === "pressure" ? c.progressBps : sort.key === "price" ? c.priceWad : c.launchedAt;
      return l.sort((a, b) => cmp(v(a), v(b)) * sort.dir);
    }
    switch (tab) {
      case "new": return l.sort((a, b) => b.launchedAt - a.launchedAt);
      case "near": return l.sort((a, b) => b.progressBps - a.progressBps);
      case "graduated": return l.sort((a, b) => cmp(b.marketCap, a.marketCap));
      default: return l.sort((a, b) => cmp(st(b).vol24, st(a).vol24) || b.lastTradeAt - a.lastTradeAt);
    }
  }, [coins, tab, q, sort, stats]); // eslint-disable-line react-hooks/exhaustive-deps

  const th = (key: SortKey, label: string, right = true) => (
    <th className={right ? "r" : ""}>
      <button className={`sort ${sort?.key === key ? "on" : ""}`} onClick={() => setSort(sort?.key === key ? (sort.dir === -1 ? { key, dir: 1 } : null) : { key, dir: -1 })}>
        {label} {sort?.key === key ? (sort.dir === -1 ? "↓" : "↑") : ""}
      </button>
    </th>
  );

  return (
    <div className="min0">
      <SectionHead title="All coins">
        <div className="view-toggle">
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")} aria-label="List view">☰</button>
          <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} aria-label="Grid view">▦</button>
        </div>
      </SectionHead>
      <div className="row between wrap" style={{ marginBottom: 14, gap: 12 }}>
        <div className="tabs">
          {(["trending", "new", "near", "graduated"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => { setTab(t); setSort(null); }}>
              {t === "trending" ? "🔥 Trending" : t === "new" ? "New" : t === "near" ? `Near ${brand.words.graduate}` : brand.words.graduated}
            </button>
          ))}
        </div>
        <input className="input" style={{ maxWidth: 260, borderRadius: 999, padding: "8px 14px" }} placeholder="Filter by name or ticker" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="stack" style={{ gap: 8 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 58 }} />)}</div>
      ) : list.length === 0 ? (
        <div className="panel panel-pad muted" style={{ textAlign: "center", padding: 48 }}>
          Nothing here yet. <Link href="/launch" className="accent">Be the first.</Link>
        </div>
      ) : view === "grid" ? (
        <div className="grid">{list.map((c) => <GridCard key={c.token} coin={c} s={st(c)} />)}</div>
      ) : (
        <div className="panel scroll-x">
          <table className="tbl board">
            <thead>
              <tr>
                <th>#</th>
                <th>Coin</th>
                {th("price", "Price")}
                {th("change", "24h")}
                {th("mcap", "Mcap")}
                {th("vol", "Vol 24h")}
                <th className="r hide-md">Chart</th>
                {th("pressure", brand.words.curve)}
                {th("age", "Age")}
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => {
                const s = st(c);
                return (
                  <tr key={c.token} onClick={() => router.push(`/coin/${c.token}`)}>
                    <td className="faint mono">{i + 1}</td>
                    <td>
                      <Link href={`/coin/${c.token}`} className="row" style={{ gap: 10, minWidth: 180 }}>
                        <CoinAvatar coin={c} size={36} />
                        <span style={{ minWidth: 0 }}>
                          <span className="row" style={{ gap: 6 }}><b>${c.symbol}</b><CoinBadges coin={c} /></span>
                          <span className="faint ellipsis" style={{ display: "block", fontSize: 12, maxWidth: 200 }}>{c.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="r mono">{fmtNum(priceOf(c), 3)}</td>
                    <td className={`r mono ${s.change24 >= 0 ? "up" : "down"}`}>{pct(s.change24)}</td>
                    <td className="r mono">{fmtNative(c.marketCap, 3)}</td>
                    <td className="r mono">{fmtNative(s.vol24, 3)}</td>
                    <td className="r hide-md"><div style={{ display: "inline-block" }}><Sparkline points={s.spark} width={96} height={28} /></div></td>
                    <td className="r">
                      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                        <div style={{ width: 70 }}><Pressure bps={c.progressBps} height={6} /></div>
                        <span className="mono" style={{ fontSize: 12, width: 40, textAlign: "right" }}>{isGraduated(c) ? "✓" : `${(c.progressBps / 100).toFixed(0)}%`}</span>
                      </div>
                    </td>
                    <td className="r faint mono" style={{ fontSize: 12 }}>{timeAgo(c.launchedAt).replace(" ago", "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GridCard({ coin, s }: { coin: Coin; s: CoinStats }) {
  return (
    <Link href={`/coin/${coin.token}`} className="panel card" style={{ flexDirection: "column", gap: 12 }}>
      <div className="row" style={{ gap: 12 }}>
        <CoinAvatar coin={coin} size={52} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row between"><b className="ellipsis">${coin.symbol}</b><span className={`mono ${s.change24 >= 0 ? "up" : "down"}`} style={{ fontSize: 12 }}>{pct(s.change24)}</span></div>
          <div className="faint ellipsis" style={{ fontSize: 12 }}>{coin.name} · {timeAgo(coin.launchedAt)}</div>
        </div>
      </div>
      <Sparkline points={s.spark} width={260} height={40} />
      <div className="row between mono" style={{ fontSize: 12 }}><span className="faint">mcap</span><span>{fmtNative(coin.marketCap, 3)} {nativeSymbol}</span></div>
      <Pressure bps={coin.progressBps} height={6} />
    </Link>
  );
}

function SeismicLog({ feed }: { feed: FeedEvent[] }) {
  return (
    <aside className="panel log">
      <div className="panel-head">
        <b className="display" style={{ fontSize: 15 }}>{brand.words.feed}</b>
        <span className="row label" style={{ gap: 6 }}><span className="pulse-dot" style={{ width: 6, height: 6 }} />live</span>
      </div>
      <div className="log-body">
        {feed.length === 0 && <div className="faint" style={{ padding: 24, textAlign: "center" }}>Quiet. No events yet.</div>}
        {feed.map((e, i) => {
          const c = e.coin;
          const icon = e.kind === "launch" ? "◎" : e.kind === "breakout" ? "✶" : e.trade.isBuy ? "▲" : "▼";
          const tone = e.kind === "launch" ? "accent" : e.kind === "breakout" ? "hot" : e.trade.isBuy ? "up" : "down";
          return (
            <Link key={i} href={c ? `/coin/${c.token}` : "#"} className="log-row">
              <span className={`log-icon ${tone}`}>{icon}</span>
              <span className="grow" style={{ minWidth: 0, fontSize: 13 }}>
                {e.kind === "launch" && <><b>${c?.symbol}</b> <span className="muted">launched by {shortAddr(c?.creator)}</span></>}
                {e.kind === "breakout" && <><b>${c?.symbol}</b> <span className="hot">{brand.words.graduated}!</span> <span className="muted">liquidity locked</span></>}
                {e.kind === "trade" && (
                  <>
                    <span className="mono faint">{shortAddr(e.trade.trader)}</span>{" "}
                    <span className={e.trade.isBuy ? "up" : "down"}>{e.trade.isBuy ? "bought" : "sold"}</span>{" "}
                    <span className="mono">{fmtNative(e.trade.native, 3)}</span> <span className="muted">of</span> <b>${c?.symbol ?? "?"}</b>
                  </>
                )}
              </span>
              <span className="faint mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(e.time).replace(" ago", "")}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
