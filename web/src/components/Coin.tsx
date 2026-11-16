"use client";

import Link from "next/link";
import { brand } from "@/config/brand";
import { nativeSymbol } from "@/lib/chain";
import { type Coin, isGraduated, useMeta, ZERO_ADDR } from "@/lib/data";
import { shade, addrHue, fmtNative, resolveUri, shortAddr, timeAgo } from "@/lib/format";

export function CoinAvatar({ coin, size = 56 }: { coin: Pick<Coin, "token" | "symbol" | "uri">; size?: number }) {
  const { data: meta } = useMeta(coin.uri || undefined);
  const img = resolveUri(meta?.image);
  const hue = addrHue(coin.token);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: img ? undefined : `radial-gradient(circle at 50% 45%, ${shade(hue, 70)}, ${shade(hue, 14)})`,
      }}
    >
      {img ? <img src={img} alt={coin.symbol} /> : <span>{coin.symbol.slice(0, 2)}</span>}
    </div>
  );
}

export function Pressure({ bps, height = 8 }: { bps: number; height?: number }) {
  const pct = Math.min(100, bps / 100);
  return (
    <div className={`pressure ${pct >= 100 ? "done" : ""}`} style={{ height }}>
      <i style={{ width: `${Math.max(pct, 1.5)}%` }} />
    </div>
  );
}

export function CoinBadges({ coin }: { coin: Coin }) {
  const sniperLive = Date.now() / 1000 - coin.launchedAt < 10 && !isGraduated(coin);
  return (
    <>
      {isGraduated(coin) && <span className="tag accent">{brand.words.graduated}</span>}
      {coin.originalOf !== ZERO_ADDR && <span className="tag">copy</span>}
      {sniperLive && <span className="tag hot">sniper fee</span>}
    </>
  );
}

export function CoinCard({ coin }: { coin: Coin }) {
  const grad = isGraduated(coin);
  return (
    <Link href={`/coin/${coin.token}`} className="panel card">
      <CoinAvatar coin={coin} size={72} />
      <div className="grow stack" style={{ gap: 6 }}>
        <div className="row between" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8, minWidth: 0 }}>
            <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>${coin.symbol}</b>
            <CoinBadges coin={coin} />
          </div>
          <span className="faint mono" style={{ fontSize: 11 }}>{timeAgo(coin.launchedAt)}</span>
        </div>
        <div className="muted" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {coin.name} <span className="faint">by {shortAddr(coin.creator)}</span>
        </div>
        <div className="row between mono" style={{ fontSize: 12 }}>
          <span className="faint">mcap</span>
          <span>{fmtNative(coin.marketCap, 3)} {nativeSymbol}</span>
        </div>
        <Pressure bps={coin.progressBps} />
        <div className="row between mono faint" style={{ fontSize: 11 }}>
          <span>{brand.words.curve} {(coin.progressBps / 100).toFixed(1)}%</span>
          <span>{grad ? "pool open" : `${fmtNative(coin.nativeToGraduate, 3)} ${nativeSymbol} to ${brand.words.graduate}`}</span>
        </div>
      </div>
    </Link>
  );
}
