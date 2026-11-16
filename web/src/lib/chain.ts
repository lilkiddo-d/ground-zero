import { defineChain, type Address, type Chain } from "viem";
import { anvil, baseSepolia } from "viem/chains";

const zero = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ZERO_CHAIN_ID || 0) || 999_999,
  name: "Zero",
  nativeCurrency: { name: "ZRO", symbol: process.env.NEXT_PUBLIC_ZERO_NATIVE_SYMBOL || "ZRO", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ZERO_RPC_URL || "http://127.0.0.1:8545"] } },
  blockExplorers: process.env.NEXT_PUBLIC_ZERO_EXPLORER
    ? { default: { name: "Zero Explorer", url: process.env.NEXT_PUBLIC_ZERO_EXPLORER } }
    : undefined,
});

const chains: Record<string, Chain> = {
  local: anvil,
  "base-sepolia": baseSepolia,
  zero,
};

export const activeChain: Chain = chains[process.env.NEXT_PUBLIC_CHAIN || "local"] ?? anvil;
export const nativeSymbol = activeChain.nativeCurrency.symbol;
export const launchpadAddress = (process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;
export const startBlock = BigInt(process.env.NEXT_PUBLIC_START_BLOCK || "0");
export const explorer = activeChain.blockExplorers?.default.url;
export const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL || "";
export const isPrelaunch = process.env.NEXT_PUBLIC_PRELAUNCH === "true";
export const launchDate = process.env.NEXT_PUBLIC_LAUNCH_DATE || "2026-11-30T16:00:00Z";
export const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/";

export const DEAD = "0x000000000000000000000000000000000000dEaD" as Address;
