"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
import { launchpadAbi } from "@/abi/Launchpad";
import { publicClient } from "./wagmi";
import { DEAD, indexerUrl, launchpadAddress } from "./chain";
import { resolveUri } from "./format";
import { getLogsCached } from "./logs";

// ------------------------------------------------------------------ types

export type Coin = {
  token: Address;
  name: string;
  symbol: string;
  uri: string;
  creator: Address;
  launchedAt: number;
  graduatedAt: number;
  lastTradeAt: number;
  pool: Address;
  originalOf: Address;
  priceWad: bigint;
  marketCap: bigint;
  progressBps: number;
  reserveNative: bigint;
  reserveToken: bigint;
  virtualNative: bigint;
  virtualToken: bigint;
  tokensSold: bigint;
  nativeToGraduate: bigint;
  creatorFeesEarned: bigint;
};

export type TradeRow = {
  token: Address;
  trader: Address;
  isBuy: boolean;
  native: bigint;
  tokens: bigint;
  fee: bigint;
  price: number; // native per token after the trade
  block: bigint;
  time: number;
  tx: `0x${string}`;
  venue: "curve" | "pool";
};

export type Meta = {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  website?: string;
  x?: string;
  telegram?: string;
};

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
export const isGraduated = (c: Pick<Coin, "pool">) => c.pool !== ZERO_ADDR;

function toCoin(v: any): Coin {
  return {
    ...v,
    launchedAt: Number(v.launchedAt),
    graduatedAt: Number(v.graduatedAt),
    lastTradeAt: Number(v.lastTradeAt),
    progressBps: Number(v.progressBps),
  };
}

// ------------------------------------------------------------------ coins (on-chain views)

export function useCoins(limit = 300) {
  return useQuery({
    queryKey: ["coins", limit],
    queryFn: async () => {
      const res = await publicClient.readContract({
        address: launchpadAddress,
        abi: launchpadAbi,
        functionName: "getCoins",
        args: [0n, BigInt(limit)],
      });
      return (res as any[]).map(toCoin);
    },
    refetchInterval: 6_000,
  });
}

export function useCoin(token?: Address) {
  return useQuery({
    queryKey: ["coin", token],
    enabled: !!token,
    queryFn: async () =>
      toCoin(
        await publicClient.readContract({
          address: launchpadAddress,
          abi: launchpadAbi,
          functionName: "getCoin",
          args: [token!],
        }),
      ),
    refetchInterval: 4_000,
  });
}

// ------------------------------------------------------------------ metadata (ipfs json)

const metaCache = new Map<string, Meta>();
export function useMeta(uri?: string) {
  return useQuery({
    queryKey: ["meta", uri],
    enabled: !!uri,
    staleTime: Infinity,
    queryFn: async (): Promise<Meta> => {
      if (metaCache.has(uri!)) return metaCache.get(uri!)!;
      try {
        const r = await fetch(resolveUri(uri)!);
        const m = (await r.json()) as Meta;
        metaCache.set(uri!, m);
        return m;
      } catch {
        return {};
      }
    },
  });
}

// ------------------------------------------------------------------ trades (logs or indexer)

const tradeEvent = parseAbiItem(
  "event Trade(address indexed token, address indexed trader, bool isBuy, uint256 nativeAmount, uint256 tokenAmount, uint256 fee, uint256 virtualNative, uint256 virtualToken, uint256 tokensSold)",
);
const swapEvent = parseAbiItem(
  "event Swap(address indexed trader, bool isBuy, uint256 nativeAmount, uint256 tokenAmount, uint256 fee, uint256 reserveNative, uint256 reserveToken)",
);
const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

const blockTimes = new Map<bigint, number>();
async function timesFor(blocks: bigint[]) {
  const missing = [...new Set(blocks)].filter((b) => !blockTimes.has(b));
  await Promise.all(
    missing.map(async (b) => {
      const blk = await publicClient.getBlock({ blockNumber: b });
      blockTimes.set(b, Number(blk.timestamp));
    }),
  );
}

const ratio = (a: bigint, b: bigint) => (b === 0n ? 0 : Number((a * 10n ** 18n) / b) / 1e18);

async function fetchTradesFromLogs(token?: Address, pool?: Address): Promise<TradeRow[]> {
  const curveLogs = await getLogsCached({
    address: launchpadAddress,
    event: tradeEvent,
    args: token ? { token } : undefined,
  });
  const poolLogs =
    pool && pool !== ZERO_ADDR
      ? await getLogsCached({ address: pool, event: swapEvent })
      : [];
  await timesFor([...curveLogs, ...poolLogs].map((l) => l.blockNumber!));

  const rows: (TradeRow & { _i: number })[] = [
    ...curveLogs.map((l) => ({
      token: l.args.token!,
      trader: l.args.trader!,
      isBuy: l.args.isBuy!,
      native: l.args.nativeAmount!,
      tokens: l.args.tokenAmount!,
      fee: l.args.fee!,
      price: ratio(l.args.virtualNative!, l.args.virtualToken!),
      block: l.blockNumber!,
      time: blockTimes.get(l.blockNumber!)!,
      tx: l.transactionHash!,
      venue: "curve" as const,
      _i: l.logIndex!,
    })),
    ...poolLogs.map((l) => ({
      token: token!,
      trader: l.args.trader!,
      isBuy: l.args.isBuy!,
      native: l.args.nativeAmount!,
      tokens: l.args.tokenAmount!,
      fee: l.args.fee!,
      price: ratio(l.args.reserveNative!, l.args.reserveToken!),
      block: l.blockNumber!,
      time: blockTimes.get(l.blockNumber!)!,
      tx: l.transactionHash!,
      venue: "pool" as const,
      _i: l.logIndex!,
    })),
  ];
  rows.sort((a, b) => (a.block === b.block ? a._i - b._i : a.block < b.block ? -1 : 1));
  return rows.map(({ _i, ...r }) => r);
}

async function fetchTradesFromIndexer(token?: Address): Promise<TradeRow[]> {
  const r = await fetch(`${indexerUrl}/trades${token ? `?token=${token}` : ""}`);
  const json = (await r.json()) as any[];
  return json.map((t) => ({
    ...t,
    native: BigInt(t.native),
    tokens: BigInt(t.tokens),
    fee: BigInt(t.fee),
    block: BigInt(t.block),
  }));
}

/** Trades for one coin (curve + pool), oldest first. Without a token: every curve trade on the launchpad. */
export function useTrades(token?: Address, pool?: Address) {
  return useQuery({
    queryKey: ["trades", token ?? "all", pool],
    queryFn: () => (indexerUrl ? fetchTradesFromIndexer(token) : fetchTradesFromLogs(token, pool)),
    refetchInterval: 5_000,
  });
}

export type Holder = { address: Address; balance: bigint; tag?: string };

export function useHolders(token?: Address, pool?: Address) {
  return useQuery({
    queryKey: ["holders", token, pool],
    enabled: !!token,
    refetchInterval: 8_000,
    queryFn: async (): Promise<Holder[]> => {
      const logs = await getLogsCached({ address: token!, event: transferEvent });
      const bal = new Map<string, bigint>();
      for (const l of logs) {
        const { from, to, value } = l.args as { from: Address; to: Address; value: bigint };
        if (from !== ZERO_ADDR) bal.set(from, (bal.get(from) ?? 0n) - value);
        bal.set(to, (bal.get(to) ?? 0n) + value);
      }
      const tagOf = (a: string) =>
        a.toLowerCase() === launchpadAddress.toLowerCase()
          ? "curve"
          : pool && a.toLowerCase() === pool.toLowerCase()
            ? "pool (locked)"
            : a.toLowerCase() === DEAD.toLowerCase()
              ? "burned"
              : undefined;
      return [...bal.entries()]
        .filter(([, b]) => b > 0n)
        .map(([address, balance]) => ({ address: address as Address, balance, tag: tagOf(address) }))
        .sort((a, b) => (b.balance > a.balance ? 1 : -1));
    },
  });
}

// ------------------------------------------------------------------ candles

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export function toCandles(trades: TradeRow[], intervalSec: number, startPrice?: number): Candle[] {
  const out: Candle[] = [];
  let prevClose = startPrice;
  for (const t of trades) {
    const bucket = Math.floor(t.time / intervalSec) * intervalSec;
    const last = out[out.length - 1];
    const vol = Number(t.native) / 1e18;
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, t.price);
      last.low = Math.min(last.low, t.price);
      last.close = t.price;
      last.volume += vol;
    } else {
      const open = prevClose ?? t.price;
      out.push({ time: bucket, open, high: Math.max(open, t.price), low: Math.min(open, t.price), close: t.price, volume: vol });
    }
    prevClose = t.price;
  }
  return out;
}
