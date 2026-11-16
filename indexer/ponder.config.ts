import { createConfig, factory } from "ponder";
import { getAbiItem, type Address } from "viem";
import { launchpadAbi } from "./abis/Launchpad";
import { poolAbi } from "./abis/Pool";

const chainId = Number(process.env.CHAIN_ID ?? 31337);
const launchpad = (process.env.LAUNCHPAD_ADDRESS ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3") as Address;
const startBlock = Number(process.env.START_BLOCK ?? 0);

export default createConfig({
  database: process.env.DATABASE_URL ? { kind: "postgres", connectionString: process.env.DATABASE_URL } : { kind: "pglite" },
  chains: {
    target: {
      id: chainId,
      rpc: process.env.PONDER_RPC_URL ?? "http://127.0.0.1:8545",
      disableCache: chainId === 31337, // anvil: blocks can be reset, never cache
    },
  },
  contracts: {
    Launchpad: { chain: "target", abi: launchpadAbi, address: launchpad, startBlock },
    // Every graduated coin gets its own Pool clone; discover them from the Graduated event.
    Pool: {
      chain: "target",
      abi: poolAbi,
      address: factory({ address: launchpad, event: getAbiItem({ abi: launchpadAbi, name: "Graduated" }), parameter: "pool" }),
      startBlock,
    },
  },
});
