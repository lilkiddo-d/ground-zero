"use client";

import { type Coin, useMeta } from "@/lib/data";
import { addrHue, resolveUri, shade } from "@/lib/format";

/** Tiny price line. Green when the last point is above the first. */
export function Sparkline({ points, width = 120, height = 34, fill = true }: { points: number[]; width?: number; height?: number; fill?: boolean }) {
  if (points.length < 2) return <svg width={width} height={height} aria-hidden><line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="var(--line-2)" strokeDasharray="3 3" /></svg>;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || max || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * width, height - 3 - ((p - min) / span) * (height - 6)] as const);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  const color = up ? "var(--up)" : "var(--down)";
  const id = `sp${Math.round(points[0] * 1e12) % 99999}${points.length}${up ? "u" : "d"}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: "block" }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity=".28" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${height} ${line} ${width},${height}`} fill={`url(#${id})`} />
        </>
      )}
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

/** Radial pressure gauge: an arc that fills toward breakout, with tick marks like a dial. */
export function Gauge({ bps, size = 64, label = true }: { bps: number; size?: number; label?: boolean }) {
  const pct = Math.min(100, bps / 100);
  const r = size / 2 - 5, c = size / 2;
  const start = 135, sweep = 270;
  const arc = (from: number, to: number) => {
    const p = (a: number) => [c + r * Math.cos((a * Math.PI) / 180), c + r * Math.sin((a * Math.PI) / 180)];
    const [x1, y1] = p(from), [x2, y2] = p(to);
    return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const end = start + (sweep * Math.max(pct, 0.5)) / 100;
  const hot = pct >= 80;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${pct.toFixed(0)}% pressure`} style={{ flex: "none" }}>
      {Array.from({ length: 19 }).map((_, i) => {
        const a = ((start + (sweep * i) / 18) * Math.PI) / 180;
        const r1 = r + 3, r2 = r + (i % 3 === 0 ? 0 : 1.5);
        return <line key={i} x1={c + r1 * Math.cos(a)} y1={c + r1 * Math.sin(a)} x2={c + r2 * Math.cos(a)} y2={c + r2 * Math.sin(a)} stroke="var(--line-2)" strokeWidth="1" />;
      })}
      <path d={arc(start, start + sweep)} fill="none" stroke="var(--panel-inset)" strokeWidth="5" strokeLinecap="round" />
      <path d={arc(start, end)} fill="none" stroke={hot ? "var(--hot)" : "var(--accent)"} strokeWidth="5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${hot ? "#ffffff88" : "#ffffff88"})` }} />
      {label && (
        <text x={c} y={c + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={size * 0.2} fill="var(--ink)" fontWeight="600">
          {pct >= 100 ? "MAX" : `${pct.toFixed(0)}%`}
        </text>
      )}
    </svg>
  );
}

/** Generated cover art: shockwave rings radiating from the coin's image, rings scale with pressure. */
export function CoinArt({ coin, height = 170, intensity, imageSrc }: { coin: Pick<Coin, "token" | "symbol" | "uri" | "progressBps">; height?: number; intensity?: number; imageSrc?: string }) {
  const { data: meta } = useMeta(coin.uri || undefined);
  const img = imageSrc || resolveUri(meta?.image);
  const hue = addrHue(coin.token);
  const k = intensity ?? Math.min(1, coin.progressBps / 10000);
  const W = 400, H = 200, cx = W / 2, cy = H / 2 + 6;
  const rings = 5 + Math.round(k * 9);
  const id = `art${coin.token.slice(2, 10)}`;
  // deterministic seismic trace along the bottom
  let s = parseInt(coin.token.slice(2, 8), 16) || 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const trace = Array.from({ length: 101 }, (_, i) => {
    const x = (i / 100) * W;
    const d = Math.abs(x - cx) / (W / 2);
    const env = Math.max(0.05, Math.exp(-d * d * 5)) * (0.3 + k * 0.7);
    return `${x.toFixed(1)},${(H - 16 + (rnd() - 0.5) * 26 * env).toFixed(1)}`;
  }).join(" ");
  return (
    <div className="coin-art" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id={`${id}g`} cx="50%" cy="53%" r="60%">
            <stop offset="0" stopColor={shade(hue, 40)} stopOpacity=".55" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}c`}><circle cx={cx} cy={cy} r="38" /></clipPath>
          <pattern id={`${id}d`} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#ffffff14" /></pattern>
        </defs>
        <rect width={W} height={H} fill="#050505" />
        <rect width={W} height={H} fill={`url(#${id}d)`} />
        <rect width={W} height={H} fill={`url(#${id}g)`} />
        {Array.from({ length: rings }).map((_, i) => (
          <circle key={i} cx={cx} cy={cy} r={48 + i * 17} fill="none" stroke="var(--accent)" strokeOpacity={Math.max(0.05, 0.42 - i * 0.035)} strokeWidth={i === 0 ? 1.6 : 1} strokeDasharray={i % 3 === 2 ? "2 5" : undefined} />
        ))}
        <line x1="0" x2={W} y1={cy} y2={cy} stroke="#ffffff10" />
        <line x1={cx} x2={cx} y1="0" y2={H} stroke="#ffffff10" />
        <polyline points={trace} fill="none" stroke="var(--accent)" strokeOpacity=".7" strokeWidth="1.2" />
        {img ? (
          <image href={img} x={cx - 38} y={cy - 38} width="76" height="76" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}c)`} />
        ) : (
          <>
            <circle cx={cx} cy={cy} r="38" fill={shade(hue, 78)} />
            <text x={cx} y={cy + 9} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="26" fill="#000000">{coin.symbol.slice(0, 2)}</text>
          </>
        )}
        <circle cx={cx} cy={cy} r="40" fill="none" stroke="var(--accent)" strokeWidth="2" />
      </svg>
    </div>
  );
}

/** LED-style numeric readout used for headline stats. */
export function Readout({ value, unit, tone = "accent" }: { value: string; unit?: string; tone?: "accent" | "ink" | "hot" }) {
  return (
    <span className={`readout ${tone}`}>
      {value}
      {unit && <small>{unit}</small>}
    </span>
  );
}
