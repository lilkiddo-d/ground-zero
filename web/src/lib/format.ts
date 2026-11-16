import { formatEther } from "viem";
import { ipfsGateway } from "./chain";

export function fmtNative(wei: bigint | undefined, digits = 4): string {
  if (wei === undefined) return "—";
  const n = Number(formatEther(wei));
  return fmtNum(n, digits);
}

export function fmtNum(n: number, digits = 4): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e4) return (n / 1e3).toFixed(1) + "K";
  if (abs >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: Math.min(digits, 3) });
  if (abs === 0) return "0";
  if (abs < 1e-6) {
    // 0.0₅123 style for tiny prices
    const s = n.toFixed(20);
    const m = s.match(/^0\.(0+)(\d{1,4})/);
    if (m) return `0.0${sub(m[1].length)}${m[2]}`;
  }
  return n.toPrecision(digits).replace(/\.?0+$/, "");
}

const SUBS = "₀₁₂₃₄₅₆₇₈₉";
function sub(k: number) {
  return String(k).split("").map((d) => SUBS[+d]).join("");
}

export function fmtTokens(wei: bigint | undefined): string {
  if (wei === undefined) return "—";
  return fmtNum(Number(formatEther(wei)), 4);
}

export function shortAddr(a?: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

export function timeAgo(unixSeconds: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function resolveUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) return ipfsGateway + uri.slice(7);
  return uri;
}

/** Deterministic hue from an address, for coins without an image. */
export function addrHue(a: string): number {
  let h = 0;
  for (let i = 2; i < a.length; i++) h = (h * 31 + a.charCodeAt(i)) % 360;
  return h;
}

/** Monochrome shade from a hue, so coins stay distinguishable in the black-and-white theme. */
export function shade(hue: number, base = 50): string {
  return `hsl(0 0% ${Math.max(6, Math.min(94, base + ((hue % 36) - 18)))}%)`;
}
