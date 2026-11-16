"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { brand } from "@/config/brand";

/** Early list: an EVM wallet + optional X handle. No signature, no connection. Stored by /api/early. */
export function EarlyList() {
  const [wallet, setWallet] = useState("");
  const [x, setX] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<{ kind: string; msg?: string }>({ kind: "idle" });

  useEffect(() => {
    fetch("/api/early").then((r) => r.json()).then((d) => setCount(d.count)).catch(() => {});
  }, []);

  async function join() {
    if (!isAddress(wallet)) return setStatus({ kind: "err", msg: "Enter a valid EVM wallet address (0x…)." });
    setStatus({ kind: "busy" });
    const r = await fetch("/api/early", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet, x }) });
    const d = await r.json();
    if (!r.ok) return setStatus({ kind: "err", msg: d.error });
    setCount(d.count);
    setStatus({ kind: "ok", msg: d.already ? `Already on the list as #${d.position}.` : `You're #${d.position} on the early list.` });
  }

  return (
    <div className="panel" style={{ padding: "clamp(22px, 4vw, 44px)", borderColor: "#ffffff44", background: "radial-gradient(circle at 100% 0%, #ffffff14, transparent 50%), var(--panel)" }}>
      <div className="row between wrap" style={{ gap: 24, alignItems: "flex-start" }}>
        <div style={{ maxWidth: 520 }}>
          <div className="label accent">The early list</div>
          <h2 className="display" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, margin: "10px 0 8px" }}>Be there before the first block.</h2>
          <p className="muted" style={{ margin: 0 }}>
            Add the wallet you&apos;ll use on Zero. Early wallets get first access to the public test, and points from the test carry into Season 0.
          </p>
          {count !== null && <div className="mono faint" style={{ marginTop: 14, fontSize: 13 }}>{count.toLocaleString()} wallets so far</div>}
        </div>
        <div className="stack" style={{ minWidth: 300, flex: 1, maxWidth: 440 }}>
          <input className="input mono" placeholder="0x… your wallet" value={wallet} onChange={(e) => setWallet(e.target.value.trim())} />
          <input className="input" placeholder="@your X handle (optional)" value={x} onChange={(e) => setX(e.target.value.trim())} />
          <button className="btn btn-primary btn-lg" disabled={status.kind === "busy"} onClick={join}>Join the early list</button>
          {status.kind === "err" && <div className="notice err">{status.msg}</div>}
          {status.kind === "ok" && (
            <div className="notice ok">
              {status.msg}{" "}
              <a style={{ textDecoration: "underline" }} target="_blank" rel="noreferrer"
                href={`https://x.com/intent/post?text=${encodeURIComponent(`I'm on the early list for @${brand.x}, the launchpad for Zero. ${brand.domain}`)}`}>Tell X</a>
            </div>
          )}
          <div className="faint" style={{ fontSize: 12 }}>No connection or signature. We never DM first and never ask for your seed phrase.</div>
        </div>
      </div>
    </div>
  );
}
