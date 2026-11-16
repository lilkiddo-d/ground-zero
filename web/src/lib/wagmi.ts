import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { createPublicClient } from "viem";
import { activeChain } from "./chain";

// All client reads go through our own /api/rpc proxy so a paid RPC key never reaches the browser.
const rpc = typeof window === "undefined" ? activeChain.rpcUrls.default.http[0] : "/api/rpc";

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [activeChain.id]: http(rpc, { batch: true }) },
  ssr: true,
});

export const publicClient = createPublicClient({ chain: activeChain, transport: http(rpc, { batch: true }) });
