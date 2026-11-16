import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAddress } from "viem";
import { webRoot } from "@/lib/paths";

// Early list storage.
// - On Netlify: Netlify Blobs (persistent, no setup needed). Netlify sets NETLIFY=true at runtime.
// - Locally: a JSON file under web/data (gitignored).
// For a bigger launch, move this to a real database (Postgres / Supabase) behind the same two functions.
type Entry = { wallet: string; x?: string; at: number };
const FILE = path.join(webRoot, "data", "early-list.json");
const onNetlify = !!process.env.NETLIFY || !!process.env.NETLIFY_BLOBS_CONTEXT;

async function store() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "early-list", consistency: "strong" });
}

async function load(): Promise<Entry[]> {
  if (onNetlify) return ((await (await store()).get("entries", { type: "json" })) as Entry[] | null) ?? [];
  try { return JSON.parse(await readFile(FILE, "utf8")); } catch { return []; }
}

async function save(list: Entry[]) {
  if (onNetlify) return void (await (await store()).setJSON("entries", list));
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(list, null, 2));
}

export async function GET() {
  try {
    return NextResponse.json({ count: (await load()).length });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST(req: NextRequest) {
  const { wallet, x } = await req.json().catch(() => ({}));
  if (typeof wallet !== "string" || !isAddress(wallet)) return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  const handle = typeof x === "string" ? x.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15) : "";
  try {
    const list = await load();
    const i = list.findIndex((e) => e.wallet.toLowerCase() === wallet.toLowerCase());
    if (i >= 0) return NextResponse.json({ position: i + 1, count: list.length, already: true });
    list.push({ wallet, x: handle || undefined, at: Date.now() });
    await save(list);
    return NextResponse.json({ position: list.length, count: list.length });
  } catch (e) {
    console.error("early list:", e);
    return NextResponse.json({ error: "Could not save right now. Try again in a minute." }, { status: 503 });
  }
}
