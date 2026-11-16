import { NextRequest, NextResponse } from "next/server";
import { activeChain } from "@/lib/chain";

// JSON-RPC proxy: keeps a paid RPC key server-side and lets us rate-limit / cache later.
const UPSTREAM = process.env.RPC_URL || activeChain.rpcUrls.default.http[0];

// Only read methods + raw tx relay. Wallet signing never goes through here.
const ALLOWED = new Set([
  "eth_chainId", "eth_blockNumber", "eth_call", "eth_getBalance", "eth_getLogs", "eth_getBlockByNumber",
  "eth_getBlockByHash", "eth_getTransactionReceipt", "eth_getTransactionByHash", "eth_estimateGas",
  "eth_gasPrice", "eth_maxPriorityFeePerGas", "eth_feeHistory", "eth_getCode", "eth_getTransactionCount",
  "eth_sendRawTransaction", "net_version",
]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 });
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length > 50 || calls.some((c) => !ALLOWED.has(c?.method))) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32601, message: "method not allowed" } }, { status: 400 });
  }
  const r = await fetch(UPSTREAM, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
}
