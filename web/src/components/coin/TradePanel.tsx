"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther, type Address } from "viem";
import { launchpadAbi } from "@/abi/Launchpad";
import { poolAbi } from "@/abi/Pool";
import { launchTokenAbi } from "@/abi/LaunchToken";
import { brand } from "@/config/brand";
import { explorer, launchpadAddress, nativeSymbol } from "@/lib/chain";
import { type Coin, isGraduated } from "@/lib/data";
import { fmtNative, fmtTokens } from "@/lib/format";
import { publicClient } from "@/lib/wagmi";
import { captureReferral, getReferral } from "@/lib/referral";
import { txError, withSlippage } from "@/lib/tx";
import { ConnectButton } from "../ConnectButton";

export function TradePanel({ coin, onTraded }: { coin: Coin; onTraded: () => void }) {
  const { address, isConnected } = useAccount();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slip, setSlip] = useState(1);
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "ok" | "err"; msg?: string; tx?: string }>({ kind: "idle" });
  const { writeContractAsync } = useWriteContract();
  const grad = isGraduated(coin);

  useEffect(captureReferral, []);

  const { data: nativeBal, refetch: refetchNative } = useBalance({ address, query: { refetchInterval: 6000 } });
  const { data: tokenBal, refetch: refetchToken } = useReadContract({
    address: coin.token, abi: launchTokenAbi, functionName: "balanceOf", args: [address!],
    query: { enabled: !!address, refetchInterval: 6000 },
  });
  const { data: feeBps } = useReadContract({
    address: launchpadAddress, abi: launchpadAbi, functionName: "currentBuyFeeBps",
    args: [coin.token, address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !grad, refetchInterval: 1000 },
  });

  const amountWei = useMemo(() => {
    try { return amount ? parseEther(amount) : 0n; } catch { return 0n; }
  }, [amount]);

  const { data: quote } = useReadContract({
    address: launchpadAddress, abi: launchpadAbi,
    functionName: side === "buy" ? "quoteBuy" : "quoteSell",
    args: side === "buy"
      ? [coin.token, amountWei, address ?? "0x0000000000000000000000000000000000000000"]
      : ([coin.token, amountWei] as any),
    query: { enabled: amountWei > 0n, refetchInterval: 3000 },
  });
  const out = (quote as readonly bigint[] | undefined)?.[0] ?? 0n;
  const fee = (quote as readonly bigint[] | undefined)?.[1] ?? 0n;
  const refund = side === "buy" ? ((quote as readonly bigint[] | undefined)?.[2] ?? 0n) : 0n;
  const graduates = side === "buy" ? Boolean((quote as readonly unknown[] | undefined)?.[3]) : false;

  const sniper = !grad && feeBps !== undefined && Number(feeBps) > 100;
  const insufficient = side === "buy" ? amountWei > (nativeBal?.value ?? 0n) : amountWei > ((tokenBal as bigint) ?? 0n);

  async function trade() {
    if (amountWei === 0n) return;
    try {
      setStatus({ kind: "busy", msg: "Confirm in your wallet…" });
      const ref = getReferral();
      const min = withSlippage(out, slip);
      let hash: `0x${string}`;
      if (grad) {
        hash = side === "buy"
          ? await writeContractAsync({ address: coin.pool, abi: poolAbi, functionName: "buy", args: [min, address!, ref], value: amountWei })
          : await writeContractAsync({ address: coin.pool, abi: poolAbi, functionName: "sell", args: [amountWei, min, address!, ref] });
      } else {
        hash = side === "buy"
          ? await writeContractAsync({
              address: launchpadAddress, abi: launchpadAbi, functionName: "buy", args: [coin.token, min, address!, ref], value: amountWei,
              gas: graduates ? 3_000_000n : undefined, // breakout deploys the pool in the same tx
            })
          : await writeContractAsync({ address: launchpadAddress, abi: launchpadAbi, functionName: "sell", args: [coin.token, amountWei, min, address!, ref] });
      }
      setStatus({ kind: "busy", msg: "Waiting for confirmation…" });
      const r = await publicClient.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error("Transaction reverted");
      setStatus({ kind: "ok", msg: graduates ? `You triggered the ${brand.words.graduate}! Liquidity is now locked in the pool.` : "Done.", tx: hash });
      setAmount("");
      refetchNative(); refetchToken(); onTraded();
    } catch (e) {
      setStatus({ kind: "err", msg: txError(e) });
    }
  }

  const presets = side === "buy" ? ["0.01", "0.05", "0.1", "0.5"] : ["25", "50", "75", "100"];

  return (
    <div className="panel panel-pad stack" style={{ gap: 14 }}>
      <div className="seg">
        <button className={`buy ${side === "buy" ? "on" : ""}`} onClick={() => { setSide("buy"); setAmount(""); }}>Buy</button>
        <button className={`sell ${side === "sell" ? "on" : ""}`} onClick={() => { setSide("sell"); setAmount(""); }}>Sell</button>
      </div>

      {sniper && (
        <div className="notice hot">
          Sniper fee active: <b>{(Number(feeBps) / 100).toFixed(1)}%</b> on buys right now, falling to 1% within seconds. Half goes to the creator.
        </div>
      )}

      <div className="field">
        <div className="field-row">
          <span className="label">{side === "buy" ? `Amount (${nativeSymbol})` : `Amount ($${coin.symbol})`}</span>
          <span className="faint mono" style={{ fontSize: 11 }}>
            bal {side === "buy" ? `${fmtNative(nativeBal?.value, 4)} ${nativeSymbol}` : fmtTokens(tokenBal as bigint | undefined)}
          </span>
        </div>
        <input className="input mono" style={{ fontSize: 20, padding: "14px 12px" }} inputMode="decimal" placeholder="0.0" value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        <div className="chips">
          {presets.map((p) => (
            <button key={p} onClick={() => {
              if (side === "buy") setAmount(p);
              else if (tokenBal) setAmount(formatEther(((tokenBal as bigint) * BigInt(p)) / 100n));
            }}>{side === "buy" ? `${p} ${nativeSymbol}` : `${p}%`}</button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ background: "var(--panel-inset)", padding: "8px 12px" }}>
        <div className="kv"><span>You receive</span><b className="mono">{side === "buy" ? `${fmtTokens(out)} $${coin.symbol}` : `${fmtNative(out, 6)} ${nativeSymbol}`}</b></div>
        <div className="kv"><span>Fee</span><span className="mono">{fmtNative(fee, 6)} {nativeSymbol}</span></div>
        {refund > 0n && <div className="kv"><span>Refunded (curve full)</span><span className="mono">{fmtNative(refund, 6)} {nativeSymbol}</span></div>}
        <div className="kv"><span>Slippage</span>
          <span className="row" style={{ gap: 4 }}>
            {[0.5, 1, 3, 10].map((s) => (
              <button key={s} onClick={() => setSlip(s)} className="mono" style={{ border: 0, background: "transparent", cursor: "pointer", color: slip === s ? "var(--accent)" : "var(--ink-3)", fontSize: 12 }}>{s}%</button>
            ))}
          </span>
        </div>
        <div className="kv"><span>Venue</span><span className="mono">{grad ? "pool (locked)" : `curve · ${(coin.progressBps / 100).toFixed(1)}%`}</span></div>
      </div>

      {graduates && <div className="notice ok">This buy fills the curve and triggers the {brand.words.graduate}. Any extra is refunded.</div>}

      {!isConnected ? (
        <ConnectButton block />
      ) : (
        <button className="btn btn-primary btn-lg btn-block" disabled={amountWei === 0n || insufficient || status.kind === "busy"} onClick={trade}
          style={side === "sell" ? { background: "var(--down)", borderColor: "var(--down)", color: "#1a0505" } : { background: "var(--up)", borderColor: "var(--up)", color: "#04140a" }}>
          {status.kind === "busy" ? status.msg : insufficient ? "Insufficient balance" : `${side === "buy" ? "Buy" : "Sell"} $${coin.symbol}`}
        </button>
      )}
      {status.kind === "err" && <div className="notice err">{status.msg}</div>}
      {status.kind === "ok" && (
        <div className="notice ok">
          {status.msg}{" "}
          {explorer && status.tx ? <a href={`${explorer}/tx/${status.tx}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>View tx</a> : null}
        </div>
      )}
      {!grad && <div className="faint" style={{ fontSize: 12 }}>No approval needed to sell. The token trusts only this launchpad and its own pool, and they only move tokens from your wallet.</div>}
    </div>
  );
}

export type { Address };
