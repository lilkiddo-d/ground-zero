import type { Address } from "viem";
import { type Coin, type TradeRow, isGraduated } from "./data";

// Derived market stats, computed client-side from the coin list + trade history.
// With the indexer running these could come from SQL instead; the shape stays the same.

export type CoinStats = {
  vol24: bigint;
  trades24: number;
  buys24: number;
  change24: number; // fraction, 0.12 = +12%
  spark: number[]; // price points, oldest first
  lastTrade?: TradeRow;
};

const T0 = 1_073_000_000n * 10n ** 18n; // initial virtual token reserve

/** Launch price from the curve invariant: k = vN * vT stays constant on the curve. */
export function startPrice(c: Coin): number {
  const k = c.virtualNative * c.virtualToken;
  if (k === 0n) return 0;
  const n0 = k / T0;
  return Number((n0 * 10n ** 18n) / T0) / 1e18;
}

export const priceOf = (c: Coin) => Number(c.priceWad) / 1e18;

export function computeStats(coins: Coin[] = [], trades: TradeRow[] = []): Map<Address, CoinStats> {
  const since = Date.now() / 1000 - 86400;
  const byToken = new Map<string, TradeRow[]>();
  for (const t of trades) {
    const k = t.token.toLowerCase();
    if (!byToken.has(k)) byToken.set(k, []);
    byToken.get(k)!.push(t);
  }
  const out = new Map<Address, CoinStats>();
  for (const c of coins) {
    const list = byToken.get(c.token.toLowerCase()) ?? [];
    let vol24 = 0n, trades24 = 0, buys24 = 0;
    let base: number | undefined;
    for (const t of list) {
      if (t.time < since) base = t.price;
      else {
        vol24 += t.native;
        trades24++;
        if (t.isBuy) buys24++;
      }
    }
    const start = startPrice(c);
    if (base === undefined) base = start;
    const now = priceOf(c);
    const spark = [start, ...list.map((t) => t.price)];
    if (spark[spark.length - 1] !== now && now > 0) spark.push(now);
    out.set(c.token, {
      vol24,
      trades24,
      buys24,
      change24: base > 0 ? now / base - 1 : 0,
      spark: spark.slice(-40),
      lastTrade: list[list.length - 1],
    });
  }
  return out;
}

export type FeedEvent =
  | { kind: "launch"; time: number; coin: Coin }
  | { kind: "breakout"; time: number; coin: Coin }
  | { kind: "trade"; time: number; coin?: Coin; trade: TradeRow };

/** Launches, breakouts and trades merged into one newest-first feed. */
export function buildFeed(coins: Coin[] = [], trades: TradeRow[] = [], limit = 40): FeedEvent[] {
  const bySym = new Map(coins.map((c) => [c.token.toLowerCase(), c]));
  const ev: FeedEvent[] = [
    ...coins.map((c) => ({ kind: "launch" as const, time: c.launchedAt, coin: c })),
    ...coins.filter(isGraduated).map((c) => ({ kind: "breakout" as const, time: c.graduatedAt, coin: c })),
    ...trades.map((t) => ({ kind: "trade" as const, time: t.time, coin: bySym.get(t.token.toLowerCase()), trade: t })),
  ];
  return ev.sort((a, b) => b.time - a.time).slice(0, limit);
}

/** Richter-style magnitude of a coin's 24h activity, 0.0 – 9.9. Purely cosmetic. */
export function magnitude(vol24: bigint, trades24: number): number {
  const v = Number(vol24) / 1e18;
  if (v <= 0 && trades24 === 0) return 0;
  return Math.min(9.9, Math.max(0.1, 3 + Math.log10(v + 1e-3) + Math.log10(trades24 + 1) * 1.2));
}

export const pct = (f: number) => `${f >= 0 ? "+" : ""}${(f * 100).toFixed(Math.abs(f) >= 10 ? 0 : 1)}%`;
