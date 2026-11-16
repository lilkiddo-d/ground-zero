import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { webRoot } from "@/lib/paths";

// Uploads a coin image + metadata JSON. Returns the metadata URI to store on-chain (max 256 bytes).
// With PINATA_JWT: pinned to IPFS (ipfs://CID). Without: written to public/uploads (local dev only).
const MAX_IMAGE = 2 * 1024 * 1024;
const OK_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const image = form.get("image");
  const str = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const https = (u: string) => (u && /^https:\/\/[^\s]+$/.test(u) ? u : "");

  const meta: Record<string, string> = {
    name: str("name", 32),
    symbol: str("symbol", 10),
    description: str("description", 280),
    website: https(str("website", 200)),
    x: https(str("x", 200)),
    telegram: https(str("telegram", 200)),
  };
  if (!meta.name || !meta.symbol) return NextResponse.json({ error: "name and symbol are required" }, { status: 400 });

  const jwt = process.env.PINATA_JWT;
  try {
    if (image instanceof File && image.size > 0) {
      if (image.size > MAX_IMAGE || !OK_TYPES.has(image.type)) {
        return NextResponse.json({ error: "image must be png/jpg/webp/gif under 2MB" }, { status: 400 });
      }
      meta.image = jwt ? await pinFile(jwt, image) : await saveLocal(req, Buffer.from(await image.arrayBuffer()), ext(image.type));
    } else {
      const url = https(str("imageUrl", 200));
      if (url) meta.image = url;
    }
    const json = JSON.stringify(meta);
    const uri = jwt ? await pinJson(jwt, meta) : await saveLocal(req, Buffer.from(json), "json");
    return NextResponse.json({ uri, meta });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function ext(type: string) {
  return type.split("/")[1].replace("jpeg", "jpg");
}

async function saveLocal(req: NextRequest, buf: Buffer, extension: string) {
  const name = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 24) + "." + extension;
  const dir = path.join(webRoot, "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `${req.nextUrl.origin}/uploads/${name}`;
}

async function pinFile(jwt: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: fd });
  if (!r.ok) throw new Error(`pinata image: ${r.status}`);
  return `ipfs://${(await r.json()).IpfsHash}`;
}

async function pinJson(jwt: string, meta: object) {
  const r = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" },
    body: JSON.stringify({ pinataContent: meta }),
  });
  if (!r.ok) throw new Error(`pinata json: ${r.status}`);
  return `ipfs://${(await r.json()).IpfsHash}`;
}
