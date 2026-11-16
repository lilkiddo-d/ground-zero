import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAddress } from "viem";
import { webRoot } from "@/lib/paths";

// Early list storage. A JSON file is fine for local dev and a single server.
// For production, swap these two functions for a database (Postgres / Supabase / KV).
const FILE = path.join(webRoot, "data", "early-list.json");
type Entry = { wallet: string; x?: string; at: number };

async function load(): Promise<Entry[]> {
  try { return JSON.parse(await readFile(FILE, "utf8")); } catch { return []; }
}
async function save(list: Entry[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(list, null, 2));
}

export async function GET() {
  return NextResponse.json({ count: (await load()).length });
}

export async function POST(req: NextRequest) {
  const { wallet, x } = await req.json().catch(() => ({}));
  if (typeof wallet !== "string" || !isAddress(wallet)) return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  const handle = typeof x === "string" ? x.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15) : "";
  const list = await load();
  const i = list.findIndex((e) => e.wallet.toLowerCase() === wallet.toLowerCase());
  if (i >= 0) return NextResponse.json({ position: i + 1, count: list.length, already: true });
  list.push({ wallet, x: handle || undefined, at: Date.now() });
  await save(list);
  return NextResponse.json({ position: list.length, count: list.length });
}
