"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import { brand } from "@/config/brand";
import { explorer, nativeSymbol } from "@/lib/chain";
import { isGraduated, useCoin, useCoins, useHolders, useMeta, useTrades, ZERO_ADDR } from "@/lib/data";
import { shade, addrHue, fmtNative, fmtNum, fmtTokens, shortAddr, timeAgo } from "@/lib/format";
import { magnitude, pct, priceOf, startPrice as launchPrice } from "@/lib/market";
import { CoinArt, Gauge, Readout } from "../viz";
import { CoinAvatar, CoinBadges, Pressure } from "../Coin";
import { PriceChart } from "./PriceChart";
import { TradePanel } from "./TradePanel";

export function CoinPage({ token }: { token: Address }) {
  const { data: coin, error, refetch } = useCoin(token);
  const { data: meta } = useMeta(coin?.uri || undefined);
  const { data: trades, refetch: refetchTrades } = useTrades(token, coin?.pool);
  const { data: holders } = useHolders(token, coin?.pool);
  const { data: all } = useCoins();
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const [mode, setMode] = useState<"price" | "mcap">("mcap");
  const [copied, setCopied] = useState(false);

  const devCoins = useMemo(() => (all ?? []).filter((c) => coin && c.creator === coin.creator), [all, coin]);
  const original = useMemo(() => (all ?? []).find((c) => coin && c.token === coin.originalOf), [all, coin]);
  const creatorSells = useMemo(
    () => (trades ?? []).filter((t) => coin && t.trader === coin.creator && !t.isBuy).reduce((s, t) => s + t.tokens, 0n),
    [trades, coin],
  );
  const { vol24, trades24, base24 } = useMemo(() => {
    const since = Date.now() / 1000 - 86400;
    const list = (trades ?? []).filter((t) => t.time >= since);
    const before = (trades ?? []).filter((t) => t.time < since);
    return { vol24: list.reduce((s, t) => s + t.native, 0n), trades24: list, base24: before.length ? before[before.length - 1].price : undefined };
  }, [trades]);

  if (error) return <div className="container" style={{ paddingTop: 40 }}><div className="notice err">Coin not found on this launchpad.</div></div>;
  if (!coin) return <div className="container" style={{ paddingTop: 40 }}><div className="skeleton" style={{ height: 420 }} /></div>;

  const grad = isGraduated(coin);
  const startPrice = undefined; // first candle opens at the first trade's price
  const startP = launchPrice(coin);
  const holderCount = (holders ?? []).filter((h) => !h.tag).length;

  const price = priceOf(coin);
  const change = startP > 0 ? price / (base24 ?? startP) - 1 : 0;
  const mag = magnitude(vol24, trades24.length);
  const buys = trades24.filter((t) => t.isBuy).length;
  const buyPct = trades24.length ? (buys / trades24.length) * 100 : 50;
  const shareText = `$${coin.symbol} is shaking on ${brand.name}`;

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div className="coin-hero panel">
        <div className="coin-hero-art"><CoinArt coin={coin} height={220} /></div>
        <div className="coin-hero-body">
          <div className="coin-hero-avatar"><CoinAvatar coin={coin} size={96} /></div>
          <div className="grow" style={{ minWidth: 240 }}>
            <div className="row wrap" style={{ gap: 10 }}>
              <h1 className="display" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>${coin.symbol}</h1>
              <span className="muted" style={{ fontSize: 18 }}>{coin.name}</span>
              <CoinBadges coin={coin} />
              <span className="mag mono">M{mag.toFixed(1)}</span>
            </div>
            <div className="row wrap muted" style={{ gap: 14, fontSize: 13, marginTop: 8 }}>
              <span>by <Link href={`/wallet?address=${coin.creator}`} className="mono" style={{ color: "var(--ink)" }}>{shortAddr(coin.creator)}</Link></span>
              <span>launched {timeAgo(coin.launchedAt)}</span>
            </div>
            {meta?.description && <p className="muted" style={{ margin: "10px 0 0", maxWidth: 680, fontSize: 14 }}>{meta.description}</p>}
            <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
              <button className="chip-link mono" onClick={() => { navigator.clipboard.writeText(coin.token); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
                {copied ? "copied ✓" : `${shortAddr(coin.token)} ⧉`}
              </button>
              {explorer && <a className="chip-link" href={`${explorer}/token/${coin.token}`} target="_blank" rel="noreferrer">Explorer ↗</a>}
              {meta?.website && <a className="chip-link" href={meta.website} target="_blank" rel="noreferrer">Website ↗</a>}
              {meta?.x && <a className="chip-link" href={meta.x} target="_blank" rel="noreferrer">X ↗</a>}
              {meta?.telegram && <a className="chip-link" href={meta.telegram} target="_blank" rel="noreferrer">Telegram ↗</a>}
              <a className="chip-link" href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`} target="_blank" rel="noreferrer">Share on X</a>
            </div>
          </div>
          <div className="coin-price">
            <span className="label">Price ({nativeSymbol})</span>
            <span className="readout ink" style={{ fontSize: 30 }}>{fmtNum(price, 4)}</span>
            <span className={`mono ${change >= 0 ? "up" : "down"}`} style={{ fontSize: 14 }}>{pct(change)} <span className="faint">24h</span></span>
          </div>
        </div>
      </div>

      {coin.originalOf !== ZERO_ADDR && (
        <div className="notice" style={{ marginBottom: 16 }}>
          This coin reuses the ticker of an earlier coin.{" "}
          {original ? <Link href={`/coin/${original.token}`} className="accent">See the original ${original.symbol} ↗</Link> : null}{" "}
          While the original is still trading, half of this coin&apos;s creator fees go to the original&apos;s creator.
        </div>
      )}

      <div className="coin-layout">
        <div className="stack" style={{ gap: 18 }}>
          <div className="panel stats">
            <MiniStat label="Market cap" value={fmtNative(coin.marketCap, 3)} unit={nativeSymbol} accent />
            <MiniStat label="24h volume" value={fmtNative(vol24, 3)} unit={nativeSymbol} />
            <MiniStat label="Holders" value={String(holderCount)} />
            <MiniStat label={grad ? "Locked liquidity" : "Curve reserve"} value={fmtNative(coin.reserveNative, 3)} unit={nativeSymbol} />
            <div className="stat" style={{ padding: "12px 16px" }}>
              <span className="label">24h buys / sells</span>
              <div className="bs-bar"><i style={{ width: `${buyPct}%` }} /></div>
              <span className="mono" style={{ fontSize: 12 }}><span className="up">{buys}</span> <span className="faint">/</span> <span className="down">{trades24.length - buys}</span></span>
            </div>
          </div>

          <div className="panel">
            <div className="row between" style={{ padding: "8px 14px 0" }}>
              <div className="tabs">
                <button className={mode === "mcap" ? "on" : ""} onClick={() => setMode("mcap")}>MCap</button>
                <button className={mode === "price" ? "on" : ""} onClick={() => setMode("price")}>Price</button>
              </div>
            </div>
            <PriceChart trades={trades ?? []} startPrice={startPrice} mode={mode} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="tabs">
                <button className={tab === "trades" ? "on" : ""} onClick={() => setTab("trades")}>Trades</button>
                <button className={tab === "holders" ? "on" : ""} onClick={() => setTab("holders")}>Holders ({holderCount})</button>
              </div>
            </div>
            <div className="scroll-x">
              {tab === "trades" ? (
                <table className="tbl">
                  <thead><tr><th>Trader</th><th>Type</th><th className="r">{nativeSymbol}</th><th className="r">${coin.symbol}</th><th className="r">Venue</th><th className="r">When</th></tr></thead>
                  <tbody>
                    {[...(trades ?? [])].reverse().slice(0, 60).map((t) => (
                      <tr key={t.tx + t.tokens}>
                        <td className="mono">
                          <span className="tdot" style={{ background: shade(addrHue(t.trader), 62) }} />
                          {shortAddr(t.trader)}
                          {t.trader === coin.creator && <span className="tag" style={{ marginLeft: 6 }}>dev</span>}
                        </td>
                        <td className={t.isBuy ? "up" : "down"}>{t.isBuy ? "Buy" : "Sell"}</td>
                        <td className="r mono">{fmtNative(t.native, 5)}</td>
                        <td className="r mono">{fmtTokens(t.tokens)}</td>
                        <td className="r faint mono">{t.venue}</td>
                        <td className="r faint">{explorer ? <a href={`${explorer}/tx/${t.tx}`} target="_blank" rel="noreferrer">{timeAgo(t.time)}</a> : timeAgo(t.time)}</td>
                      </tr>
                    ))}
                    {(trades ?? []).length === 0 && <tr><td colSpan={6} className="faint" style={{ textAlign: "center", padding: 28 }}>No trades yet.</td></tr>}
                  </tbody>
                </table>
              ) : (
                <>
                <div className="dist">
                  {(holders ?? []).slice(0, 12).map((h) => (
                    <i key={h.address} title={`${shortAddr(h.address)} ${(Number((h.balance * 10000n) / 10n ** 27n) / 100).toFixed(2)}%`}
                      style={{ flex: Number((h.balance * 10000n) / 10n ** 27n) || 1, background: h.tag ? "var(--line-2)" : shade(addrHue(h.address), 62) }} />
                  ))}
                </div>
                <table className="tbl">
                  <thead><tr><th>#</th><th>Holder</th><th className="r">Amount</th><th className="r">% supply</th></tr></thead>
                  <tbody>
                    {(holders ?? []).slice(0, 50).map((h, i) => (
                      <tr key={h.address}>
                        <td className="faint mono">{i + 1}</td>
                        <td className="mono">
                          {shortAddr(h.address)}
                          {h.tag && <span className="tag accent" style={{ marginLeft: 6 }}>{h.tag}</span>}
                          {h.address === coin.creator && <span className="tag" style={{ marginLeft: 6 }}>dev</span>}
                        </td>
                        <td className="r mono">{fmtTokens(h.balance)}</td>
                        <td className="r mono">{(Number((h.balance * 10000n) / 10n ** 27n) / 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="stack" style={{ gap: 18, position: "sticky", top: 84 }}>
          <TradePanel coin={coin} onTraded={() => { refetch(); refetchTrades(); }} />

          <div className="panel panel-pad">
            <div className="row" style={{ gap: 14, marginBottom: 12 }}>
              <Gauge bps={coin.progressBps} size={78} />
              <div className="grow">
                <span className="label">{grad ? `${brand.words.graduated}` : `${brand.words.curve}`}</span>
                <div className="readout accent" style={{ fontSize: 26 }}>{(coin.progressBps / 100).toFixed(2)}%</div>
                {!grad && <span className="faint mono" style={{ fontSize: 11.5 }}>{fmtNative(coin.nativeToGraduate, 4)} {nativeSymbol} to {brand.words.graduate}</span>}
              </div>
            </div>
            <Pressure bps={coin.progressBps} height={12} />
            <div className="milestones mono">{[25, 50, 75, 100].map((m) => <span key={m} className={coin.progressBps / 100 >= m ? "on" : ""}>{m}%</span>)}</div>
            <p className="faint" style={{ fontSize: 12.5, marginBottom: 0 }}>
              {grad
                ? `Graduated ${timeAgo(coin.graduatedAt)}. Liquidity sits in a pool with no withdraw function, locked forever.`
                : `${fmtNative(coin.nativeToGraduate, 4)} ${nativeSymbol} more fills the curve. Then liquidity moves into a locked pool at the same price, in the same transaction.`}
            </p>
          </div>

          <div className="panel panel-pad">
            <div className="label" style={{ marginBottom: 10 }}>Dev record</div>
            <div className="kv"><span>Coins launched</span><span className="mono">{devCoins.length}</span></div>
            <div className="kv"><span>{brand.words.graduate}s</span><span className="mono">{devCoins.filter(isGraduated).length}</span></div>
            <div className="kv"><span>Dev holds</span><span className="mono">{fmtTokens(holders?.find((h) => h.address === coin.creator)?.balance ?? 0n)}</span></div>
            <div className="kv"><span>Dev sold (this coin)</span><span className={`mono ${creatorSells > 0n ? "down" : ""}`}>{fmtTokens(creatorSells)}</span></div>
            <div className="kv"><span>Creator fees earned</span><span className="mono">{fmtNative(coin.creatorFeesEarned, 5)} {nativeSymbol}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="stat" style={{ padding: "12px 16px" }}>
      <span className="label">{label}</span>
      <Readout value={value} unit={unit} tone={accent ? "accent" : "ink"} />
    </div>
  );
}
