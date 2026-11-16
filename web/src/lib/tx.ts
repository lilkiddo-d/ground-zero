"use client";

import { BaseError, ContractFunctionRevertedError } from "viem";

/** Human-readable error from a viem/wagmi failure. */
export function txError(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name) return friendly[name] ?? name;
    if (/User rejected|denied/i.test(e.message)) return "You rejected the transaction.";
    return e.shortMessage || e.message;
  }
  return (e as Error)?.message ?? String(e);
}

const friendly: Record<string, string> = {
  Slippage: "Price moved more than your slippage. Nothing was traded.",
  AlreadyGraduated: "This coin has moved to its pool. Refresh and trade again.",
  InsufficientPayment: "Not enough sent to cover the launch fee and deposit.",
  BadName: "Name must be 1–32 bytes.",
  BadSymbol: "Ticker must be 1–10 bytes.",
  Paused: "New launches are paused right now. Trading still works.",
  ZeroAmount: "Enter an amount.",
  InsufficientBalance: "Not enough tokens.",
};

/** Apply slippage tolerance (in %) to an expected output. */
export function withSlippage(amount: bigint, pct: number): bigint {
  const bps = BigInt(Math.round((100 - pct) * 100));
  return (amount * bps) / 10_000n;
}
