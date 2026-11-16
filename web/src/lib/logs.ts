"use client";

import type { AbiEvent, Address, Log } from "viem";
import { publicClient } from "./wagmi";
import { startBlock } from "./chain";

// Public RPCs cap eth_getLogs ranges (sepolia.base.org: 200 blocks). We read in chunks and cache
// what we already have, so each refresh only asks for the new blocks since the last call.
// NEXT_PUBLIC_LOG_CHUNK=0 means "no limit" (anvil, or paid RPCs that allow big ranges).
const CHUNK = BigInt(process.env.NEXT_PUBLIC_LOG_CHUNK ?? "0");
const PARALLEL = 6;

type Entry = { to: bigint; logs: Log[]; pending?: Promise<Log[]> };
const cache = new Map<string, Entry>();

export async function getLogsCached<E extends AbiEvent>(p: { address: Address; event: E; args?: Record<string, unknown> }) {
  const key = `${p.address}:${p.event.name}:${JSON.stringify(p.args ?? {})}`.toLowerCase();
  const hit = cache.get(key);
  if (hit?.pending) return hit.pending as Promise<Log<bigint, number, false, E>[]>;

  const run = (async () => {
    const head = await publicClient.getBlockNumber();
    const from = hit ? hit.to + 1n : startBlock;
    const fresh: Log[] = [];
    if (from <= head) {
      const ranges: [bigint, bigint][] = [];
      if (CHUNK <= 0n) ranges.push([from, head]);
      else for (let a = from; a <= head; a += CHUNK) ranges.push([a, a + CHUNK - 1n > head ? head : a + CHUNK - 1n]);
      for (let i = 0; i < ranges.length; i += PARALLEL) {
        const part = await Promise.all(
          ranges.slice(i, i + PARALLEL).map(([fromBlock, toBlock]) =>
            publicClient.getLogs({ address: p.address, event: p.event, args: p.args as any, fromBlock, toBlock }),
          ),
        );
        for (const l of part) fresh.push(...(l as Log[]));
      }
    }
    const logs = [...(hit?.logs ?? []), ...fresh];
    cache.set(key, { to: head, logs });
    return logs;
  })();

  cache.set(key, { to: hit?.to ?? startBlock - 1n, logs: hit?.logs ?? [], pending: run });
  try {
    return (await run) as Log<bigint, number, false, E>[];
  } catch (e) {
    if (hit) cache.set(key, hit); else cache.delete(key);
    throw e;
  }
}
