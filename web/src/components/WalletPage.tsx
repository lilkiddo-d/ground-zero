"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { launchpadAbi } from "@/abi/Launchpad";
import { launchTokenAbi } from "@/abi/LaunchToken";
import { brand } from "@/config/brand";
import { explorer, launchpadAddress, nativeSymbol } from "@/lib/chain";
import { type Coin, isGraduated, useCoins, useTrades } from "@/lib/data";
import { addrHue, fmtNative, fmtTokens, shade, shortAddr, timeAgo } from "@/lib/format";
import { computeStats, pct } from "@/lib/market";
import { publicClient } from "@/lib/wagmi";
import { txError } from "@/lib/tx";
import { CoinAvatar, CoinBadges, Pressure } from "./Coin";
import { ConnectButton } from "./ConnectButton";
import { Readout, Sparkline } from "./viz";

type Tab = "holdings" | "created" | "activity";

/** Balances of every launchpad coin for one wallet (one batched RPC round trip). */
function useHoldings(who?: Address, coins?: Coin[]) {
  return useQuery({
    queryKey: ["holdings", who, coins?.length],
    enabled: !!who && !!coins,
    refetchInterval: 8000,
    queryFn: async () => {
      const bals = await Promise.all(
        coins!.map((c) => publicClient.readContract({ address: c.token, abi: launchTokenAbi, functionName: "balanceOf", args: [who!] }) as Promise<bigint>),
      );
      return coins!
        .map((coin, i) => ({ coin, balance: bals[i], value: (bals[i] * coin.priceWad) / 10n ** 18n }))
        .filter((h) => h.balance > 0n)
        .sort((a, b) => (b.value > a.value ? 1 : -1));
    },
  });
}

export function WalletPage() {
  const params = useSearchParams();
  const { address: me } = useAccount();
  const q = params.get("address");
  const who = (q && isAddress(q) ? q : me) as Address | undefined;
  const isMe = !!me && who?.toLowerCase() === me.toLowerCase();
  const [origin, setOrigin] = useState("");
  const [tab, setTab] = useState<Tab>("holdings");
  const [copied, setCopied] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const { data: coins } = useCoins();
  const { data: trades } = useTrades();
  const { data: holdings, isLoading: loadingHoldings } = useHoldings(who, coins);
  const { data: bal } = useBalance({ address: who, query: { enabled: !!who, refetchInterval: 8000 } });
  const stats = useMemo(() => computeStats(coins, trades), [coins, trades]);

  const created = useMemo(() => (coins ?? []).filter((c) => who && c.creator.toLowerCase() === who.toLowerCase()), [coins, who]);
  const myTrades = useMemo(
    () => [...(trades ?? [])].filter((t) => who && t.trader.toLowerCase() === who.toLowerCase()).reverse(),
    [trades, who],
  );
  const { data: claimable, refetch } = useReadContract({
    address: launchpadAddress, abi: launchpadAbi, functionName: "claimable", args: [who!],
    query: { enabled: !!who, refetchInterval: 6000 },
  });
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<{ kind: string; msg?: string }>({ kind: "idle" });

  const portfolio = (holdings ?? []).reduce((s, h) => s + h.value, 0n);
  const earned = created.reduce((s, c) => s + c.creatorFeesEarned, 0n);
  const refLink = `${origin}/?ref=${me ?? ""}`;
  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1200); };

  async function claim() {
    try {
      setStatus({ kind: "busy", msg: "Confirm in your wallet…" });
      const hash = await writeContractAsync({ address: launchpadAddress, abi: launchpadAbi, functionName: "claim" });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus({ kind: "ok", msg: "Claimed to your wallet." });
      refetch();
    } catch (e) {
      setStatus({ kind: "err", msg: txError(e) });
    }
  }

  if (!who) {
    return (
      <div className="container" style={{ paddingTop: 80, maxWidth: 520, textAlign: "center" }}>
        <div className="wallet-orb" />
        <h1 className="display" style={{ fontWeight: 800, margin: "22px 0 8px" }}>Your wallet</h1>
        <p className="muted">Connect to see your coins, your trades, and fees you can claim.</p>
        <div style={{ display: "inline-block", marginTop: 8 }}><ConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 28 }}>
      {/* ------------------------------------------------ identity */}
      <div className="panel wallet-head">
        <div className="wallet-id" style={{ background: `radial-gradient(circle at 35% 30%, ${shade(addrHue(who), 80)}, ${shade(addrHue(who), 12)})` }} />
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="label">{isMe ? "Your wallet" : "Wallet"}</span>
            {created.length > 0 && <span className="tag">creator</span>}
          </div>
          <div className="row wrap" style={{ gap: 10, marginTop: 4 }}>
            <h1 className="display mono" style={{ fontSize: 26, margin: 0, fontWeight: 700 }}>{shortAddr(who)}</h1>
            <button className="chip-link mono" onClick={() => copy(who, "addr")}>{copied === "addr" ? "copied ✓" : "copy ⧉"}</button>
            {explorer && <a className="chip-link" href={`${explorer}/address/${who}`} target="_blank" rel="noreferrer">Explorer ↗</a>}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ numbers */}
      <div className="panel stats" style={{ marginTop: 14 }}>
        <Stat label={`${nativeSymbol} balance`} value={fmtNative(bal?.value, 4)} unit={nativeSymbol} />
        <Stat label="Coins value" value={fmtNative(portfolio, 4)} unit={nativeSymbol} accent />
        <Stat label="Coins held" value={String(holdings?.length ?? "—")} />
        <Stat label="Trades" value={String(myTrades.length)} />
      </div>

      <div className="wallet-cards">
        <div className="panel panel-pad">
          <div className="label">Claimable now</div>
          <div style={{ margin: "8px 0 4px" }}><Readout value={fmtNative(claimable as bigint | undefined, 5)} unit={nativeSymbol} /></div>
          <div className="faint" style={{ fontSize: 12.5, marginBottom: 14 }}>Creator fees, referral fees and refunded launch deposits, in one balance.</div>
          {isMe && (
            <button className="btn btn-primary btn-block" disabled={!claimable || status.kind === "busy"} onClick={claim}>
              {status.kind === "busy" ? status.msg : "Claim all"}
            </button>
          )}
          {status.kind === "err" && <div className="notice err" style={{ marginTop: 10 }}>{status.msg}</div>}
          {status.kind === "ok" && <div className="notice ok" style={{ marginTop: 10 }}>{status.msg}</div>}
        </div>
        <div className="panel panel-pad">
          <div className="label" style={{ marginBottom: 6 }}>Creator record</div>
          <div className="kv"><span>Coins launched</span><span className="mono">{created.length}</span></div>
          <div className="kv"><span>{brand.words.graduate}s</span><span className="mono">{created.filter(isGraduated).length}</span></div>
          <div className="kv"><span>Fees earned, all time</span><span className="mono">{fmtNative(earned, 5)} {nativeSymbol}</span></div>
          <Link href="/" className="btn btn-sm btn-block" style={{ marginTop: 10 }}>+ Launch a coin</Link>
        </div>
        {isMe && (
          <div className="panel panel-pad">
            <div className="label">Referral link</div>
            <p className="faint" style={{ fontSize: 12.5, margin: "6px 0 12px" }}>Anyone who trades through your link earns you 10% of the protocol&apos;s share of their fees, forever.</p>
            <div className="row" style={{ gap: 8 }}>
              <input className="input mono" readOnly value={refLink} style={{ fontSize: 12 }} />
              <button className="btn btn-sm" onClick={() => copy(refLink, "ref")}>{copied === "ref" ? "✓" : "Copy"}</button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ tabs */}
      <div className="tabs" style={{ marginTop: 32, marginBottom: 14 }}>
        <button className={tab === "holdings" ? "on" : ""} onClick={() => setTab("holdings")}>Holdings ({holdings?.length ?? 0})</button>
        <button className={tab === "created" ? "on" : ""} onClick={() => setTab("created")}>Created ({created.length})</button>
        <button className={tab === "activity" ? "on" : ""} onClick={() => setTab("activity")}>Activity ({myTrades.length})</button>
      </div>

      <div className="panel scroll-x">
        {tab === "holdings" && (
          <table className="tbl board">
            <thead><tr><th>Coin</th><th className="r">Balance</th><th className="r">Value</th><th className="r">24h</th><th className="r hide-md">Chart</th><th className="r">{brand.words.curve}</th></tr></thead>
            <tbody>
              {loadingHoldings && <tr><td colSpan={6} className="faint" style={{ padding: 28, textAlign: "center" }}>Reading balances…</td></tr>}
              {!loadingHoldings && (holdings ?? []).length === 0 && <tr><td colSpan={6} className="faint" style={{ padding: 28, textAlign: "center" }}>No coins in this wallet yet. <Link href="/discover" className="accent">Find one →</Link></td></tr>}
              {(holdings ?? []).map(({ coin, balance, value }) => {
                const s = stats.get(coin.token);
                return (
                  <tr key={coin.token}>
                    <td><CoinCell coin={coin} /></td>
                    <td className="r mono">{fmtTokens(balance)} <span className="faint" style={{ fontSize: 11 }}>{(Number((balance * 10000n) / 10n ** 27n) / 100).toFixed(2)}%</span></td>
                    <td className="r mono">{fmtNative(value, 4)} {nativeSymbol}</td>
                    <td className={`r mono ${(s?.change24 ?? 0) >= 0 ? "up" : "down"}`}>{pct(s?.change24 ?? 0)}</td>
                    <td className="r hide-md"><div style={{ display: "inline-block" }}><Sparkline points={s?.spark ?? []} width={90} height={26} /></div></td>
                    <td className="r"><div style={{ width: 80, marginLeft: "auto" }}><Pressure bps={coin.progressBps} height={6} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tab === "created" && (
          <table className="tbl board">
            <thead><tr><th>Coin</th><th className="r">Mcap</th><th className="r">Fees earned</th><th className="r">{brand.words.curve}</th><th className="r">Launched</th></tr></thead>
            <tbody>
              {created.length === 0 && <tr><td colSpan={5} className="faint" style={{ padding: 28, textAlign: "center" }}>No coins launched from this wallet. <Link href="/" className="accent">Launch one →</Link></td></tr>}
              {created.map((c) => (
                <tr key={c.token}>
                  <td><CoinCell coin={c} /></td>
                  <td className="r mono">{fmtNative(c.marketCap, 3)} {nativeSymbol}</td>
                  <td className="r mono">{fmtNative(c.creatorFeesEarned, 5)}</td>
                  <td className="r"><div className="row" style={{ gap: 8, justifyContent: "flex-end" }}><div style={{ width: 70 }}><Pressure bps={c.progressBps} height={6} /></div><span className="mono" style={{ fontSize: 12 }}>{(c.progressBps / 100).toFixed(0)}%</span></div></td>
                  <td className="r faint mono" style={{ fontSize: 12 }}>{timeAgo(c.launchedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "activity" && (
          <table className="tbl board">
            <thead><tr><th>Coin</th><th>Type</th><th className="r">{nativeSymbol}</th><th className="r">Tokens</th><th className="r">When</th></tr></thead>
            <tbody>
              {myTrades.length === 0 && <tr><td colSpan={5} className="faint" style={{ padding: 28, textAlign: "center" }}>No trades from this wallet yet.</td></tr>}
              {myTrades.slice(0, 100).map((t) => {
                const c = coins?.find((x) => x.token === t.token);
                return (
                  <tr key={t.tx + t.tokens}>
                    <td>{c ? <CoinCell coin={c} /> : shortAddr(t.token)}</td>
                    <td className={t.isBuy ? "up" : "down"}>{t.isBuy ? "Buy" : "Sell"}</td>
                    <td className="r mono">{fmtNative(t.native, 5)}</td>
                    <td className="r mono">{fmtTokens(t.tokens)}</td>
                    <td className="r faint">{explorer ? <a href={`${explorer}/tx/${t.tx}`} target="_blank" rel="noreferrer">{timeAgo(t.time)}</a> : timeAgo(t.time)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {tab === "activity" && <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>Shows trades on the curve. Trades in a coin&apos;s pool after {brand.words.graduate} appear on that coin&apos;s page.</p>}
    </div>
  );
}

function CoinCell({ coin }: { coin: Coin }) {
  return (
    <Link href={`/coin/${coin.token}`} className="row" style={{ gap: 10, minWidth: 170 }}>
      <CoinAvatar coin={coin} size={34} />
      <span style={{ minWidth: 0 }}>
        <span className="row" style={{ gap: 6 }}><b>${coin.symbol}</b><CoinBadges coin={coin} /></span>
        <span className="faint ellipsis" style={{ display: "block", fontSize: 12, maxWidth: 180 }}>{coin.name}</span>
      </span>
    </Link>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="stat" style={{ padding: "14px 18px" }}>
      <span className="label">{label}</span>
      <Readout value={value} unit={unit} tone={accent ? "accent" : "ink"} />
    </div>
  );
}
