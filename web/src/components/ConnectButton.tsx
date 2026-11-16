"use client";

import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useEffect, useState } from "react";
import { activeChain, nativeSymbol } from "@/lib/chain";
import { fmtNative, shortAddr } from "@/lib/format";

export function ConnectButton({ block }: { block?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: bal } = useBalance({ address, query: { refetchInterval: 8000 } });

  const cls = `btn btn-sm ${block ? "btn-block" : ""}`;
  if (!mounted) return <button className={cls}>Connect wallet</button>;

  if (!isConnected) {
    return (
      <button
        className={`${cls} btn-primary`}
        disabled={isPending}
        onClick={() => {
          const c = connectors[0];
          if (!c) return alert("No wallet found. Install Rabby or MetaMask.");
          connect({ connector: c, chainId: activeChain.id });
        }}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }
  if (chainId !== activeChain.id) {
    return (
      <button className={`${cls} btn-primary`} onClick={() => switchChain({ chainId: activeChain.id })}>
        Switch to {activeChain.name}
      </button>
    );
  }
  return (
    <button className={cls} onClick={() => disconnect()} title="Disconnect">
      <span className="mono faint">{fmtNative(bal?.value, 3)} {nativeSymbol}</span>
      <span className="mono">{shortAddr(address)}</span>
    </button>
  );
}
