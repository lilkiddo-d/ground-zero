import type { Coin, TradeRow } from "./data";

/**
 * Season 0 points, computed only from on-chain trades so anyone can recompute them.
 * Rules (edit freely, keep them public):
 *  - 1,000 points per 1 native bought (curve or pool).
 *  - A buy only counts if it is held 60 minutes: sells within 60 min cancel the most recent buys first.
 *  - Max 1 native of counted buys per wallet per UTC day. Buys under 0.0005 native, and buys of your own coin, earn nothing.
 *  - Breakout: +500 to a creator whose coin breaks out with at least 5 other wallets that bought >= 0.01 native.
 *  - Backer: +150 (max 5 per day) for buying >= 0.01 native of a coin on its curve before it broke out.
 */
export const RULES = {
  perNative: 1000,
  holdSec: 3600,
  dailyCap: 1,
  minBuy: 0.0005,
  breakoutBonus: 500,
  minBackers: 5,
  backerMin: 0.01,
  backerBonus: 150,
  backerDailyMax: 5,
};

export type PointsRow = { wallet: string; total: number; trade: number; breakout: number; backer: number; pending: number };

export function computePoints(trades: TradeRow[], coins: Coin[], now = Date.now() / 1000): PointsRow[] {
  const creatorOf = new Map(coins.map((c) => [c.token.toLowerCase(), c.creator.toLowerCase()]));
  const rows = new Map<string, PointsRow>();
  const row = (w: string) => {
    const k = w.toLowerCase();
    if (!rows.has(k)) rows.set(k, { wallet: w, total: 0, trade: 0, breakout: 0, backer: 0, pending: 0 });
    return rows.get(k)!;
  };

  // --- trade points
  type Lot = { amount: number; native: number; time: number; token: string };
  const lots = new Map<string, Lot[]>(); // wallet:token -> open buys
  const byWallet = new Map<string, Lot[]>();
  const sorted = [...trades].sort((a, b) => a.time - b.time);
  for (const t of sorted) {
    const w = t.trader.toLowerCase();
    const tok = t.token.toLowerCase();
    const key = `${w}:${tok}`;
    const native = Number(t.native) / 1e18;
    const amount = Number(t.tokens) / 1e18;
    if (t.isBuy) {
      if (native < RULES.minBuy || creatorOf.get(tok) === w) continue;
      const lot = { amount, native, time: t.time, token: tok };
      (lots.get(key) ?? lots.set(key, []).get(key)!).push(lot);
      (byWallet.get(w) ?? byWallet.set(w, []).get(w)!).push(lot);
    } else {
      // cancel the most recent buys still inside the hold window
      let left = amount;
      const open = lots.get(key) ?? [];
      for (let i = open.length - 1; i >= 0 && left > 0; i--) {
        const l = open[i];
        if (t.time - l.time >= RULES.holdSec) break;
        const take = Math.min(left, l.amount);
        const frac = take / l.amount;
        l.native -= l.native * frac;
        l.amount -= take;
        left -= take;
      }
    }
  }
  for (const [w, ls] of byWallet) {
    const daily = new Map<number, number>();
    const r = row(w);
    for (const l of ls) {
      if (l.native <= 0) continue;
      const day = Math.floor(l.time / 86400);
      const used = daily.get(day) ?? 0;
      const counted = Math.min(l.native, Math.max(0, RULES.dailyCap - used));
      daily.set(day, used + counted);
      const pts = counted * RULES.perNative;
      if (now - l.time < RULES.holdSec) r.pending += pts;
      else r.trade += pts;
    }
  }

  // --- breakout + backer bonuses
  for (const c of coins) {
    if (!c.graduatedAt) continue;
    const tok = c.token.toLowerCase();
    const backers = new Set<string>();
    for (const t of sorted) {
      if (t.token.toLowerCase() !== tok || !t.isBuy || t.venue !== "curve" || t.time > c.graduatedAt) continue;
      if (Number(t.native) / 1e18 >= RULES.backerMin && t.trader.toLowerCase() !== c.creator.toLowerCase()) backers.add(t.trader.toLowerCase());
    }
    if (backers.size >= RULES.minBackers) row(c.creator).breakout += RULES.breakoutBonus;
    for (const b of backers) row(b).backer += RULES.backerBonus;
  }

  for (const r of rows.values()) r.total = Math.round(r.trade + r.breakout + r.backer);
  return [...rows.values()].filter((r) => r.total > 0 || r.pending > 0).sort((a, b) => b.total - a.total);
}
