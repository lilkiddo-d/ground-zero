"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { brand } from "@/config/brand";
import { nativeSymbol } from "@/lib/chain";
import { useCoins, useTrades } from "@/lib/data";
import { fmtNum, shortAddr } from "@/lib/format";
import { computePoints, RULES } from "@/lib/points";

export function PointsPage() {
  const { address } = useAccount();
  const { data: trades } = useTrades();
  const { data: coins } = useCoins();
  const [lookup, setLookup] = useState("");
  const rows = useMemo(() => computePoints(trades ?? [], coins ?? []), [trades, coins]);
  const target = (lookup || address || "").toLowerCase();
  const rank = rows.findIndex((r) => r.wallet.toLowerCase() === target);
  const mine = rank >= 0 ? rows[rank] : undefined;

  return (
    <div className="container" style={{ paddingTop: 36 }}>
      <div className="label accent">Season 0 · provisional</div>
      <h1 className="display" style={{ fontSize: 40, margin: "6px 0 8px", fontWeight: 800 }}>Points</h1>
      <p className="muted" style={{ maxWidth: 680 }}>
        Points come only from what wallets do on-chain, and anyone can recompute them. Final numbers are set at a snapshot announced 7 days ahead, after a public sybil review.
      </p>

      <div className="row wrap" style={{ gap: 18, alignItems: "stretch", margin: "24px 0" }}>
        <div className="panel panel-pad grow" style={{ minWidth: 300 }}>
          <div className="row between">
            <span className="label">{lookup ? "Lookup" : "Your points"}</span>
            <input className="input mono" style={{ maxWidth: 260, padding: "6px 10px", fontSize: 12 }} placeholder="look up any wallet 0x…" value={lookup} onChange={(e) => setLookup(e.target.value.trim())} />
          </div>
          {target ? (
            <>
              <div className="display" style={{ fontSize: 44, fontWeight: 800, margin: "10px 0 4px" }}>{fmtNum(mine?.total ?? 0, 0)}</div>
              <div className="muted mono" style={{ fontSize: 13 }}>
                rank {rank >= 0 ? `#${rank + 1}` : "—"} · trade {fmtNum(mine?.trade ?? 0, 0)} · {brand.words.graduate} {mine?.breakout ?? 0} · backer {mine?.backer ?? 0}
                {mine?.pending ? <> · <span className="accent">{fmtNum(mine.pending, 0)} pending</span></> : null}
              </div>
            </>
          ) : (
            <p className="faint">Connect a wallet or look one up.</p>
          )}
        </div>
        <div className="panel panel-pad grow" style={{ minWidth: 300 }}>
          <div className="label" style={{ marginBottom: 8 }}>How to earn</div>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7 }}>
            <li><b>{RULES.perNative.toLocaleString()}</b> per 1 {nativeSymbol} you buy, held {RULES.holdSec / 60} minutes. Max {RULES.dailyCap} {nativeSymbol} a day counts.</li>
            <li><b>+{RULES.backerBonus}</b> when a coin you backed on its curve (≥{RULES.backerMin} {nativeSymbol}) breaks out.</li>
            <li><b>+{RULES.breakoutBonus}</b> to creators whose coin breaks out with {RULES.minBackers}+ backers.</li>
            <li>Selling never earns. Buying your own coin earns nothing.</li>
          </ul>
        </div>
      </div>

      <div className="panel scroll-x">
        <table className="tbl">
          <thead><tr><th>#</th><th>Wallet</th><th className="r">Trade</th><th className="r">Bonus</th><th className="r">Pending</th><th className="r">Total</th></tr></thead>
          <tbody>
            {rows.slice(0, 100).map((r, i) => (
              <tr key={r.wallet} style={r.wallet.toLowerCase() === target ? { background: "var(--accent-dim)" } : undefined}>
                <td className="mono faint">{i + 1}</td>
                <td className="mono">{shortAddr(r.wallet)}</td>
                <td className="r mono">{fmtNum(r.trade, 0)}</td>
                <td className="r mono">{r.breakout + r.backer}</td>
                <td className="r mono faint">{fmtNum(r.pending, 0)}</td>
                <td className="r mono"><b>{fmtNum(r.total, 0)}</b></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="faint" style={{ textAlign: "center", padding: 28 }}>No points yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
