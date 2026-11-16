"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { decodeEventLog, isAddress, parseEther, type Address } from "viem";
import { launchpadAbi } from "@/abi/Launchpad";
import { brand } from "@/config/brand";
import { launchpadAddress, nativeSymbol } from "@/lib/chain";
import { fmtNative, fmtNum } from "@/lib/format";
import { publicClient } from "@/lib/wagmi";
import { captureReferral, getReferral } from "@/lib/referral";
import { txError, withSlippage } from "@/lib/tx";
import { ConnectButton } from "./ConnectButton";
import { CoinArt } from "./viz";

const VIRTUAL_TOKEN = 1_073_000_000n * 10n ** 18n;
const CURVE_SUPPLY = 793_100_000n * 10n ** 18n;
const bytes = (s: string) => new TextEncoder().encode(s).length;

export function LaunchForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  // fake address from the ticker, so the preview art gets a stable colour
  const previewToken = useMemo(() => ("0x" + Array.from(symbol || "TICKER").map((c) => c.charCodeAt(0).toString(16)).join("").padEnd(40, "7").slice(0, 40)) as Address, [symbol]);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [team, setTeam] = useState("");
  const [initialBuy, setInitialBuy] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "err" | "ok"; msg?: string }>({ kind: "idle" });

  useEffect(captureReferral, []);

  const { data: cfg } = useReadContracts({
    contracts: (["creationFee", "launchDeposit", "initialVirtualNative", "launchesPaused"] as const).map((fn) => ({
      address: launchpadAddress, abi: launchpadAbi, functionName: fn,
    })),
  });
  const creationFee = cfg?.[0]?.result as bigint | undefined;
  const deposit = cfg?.[1]?.result as bigint | undefined;
  const v0 = cfg?.[2]?.result as bigint | undefined;
  const paused = cfg?.[3]?.result as boolean | undefined;

  const buyWei = useMemo(() => {
    try { return initialBuy ? parseEther(initialBuy) : 0n; } catch { return 0n; }
  }, [initialBuy]);

  // Exact quote for the creator's first buy (nobody can trade before it, it's in the same tx).
  const tokensOut = useMemo(() => {
    if (!v0 || buyWei === 0n) return 0n;
    const net = buyWei - (buyWei * 100n) / 10_000n;
    const k = v0 * VIRTUAL_TOKEN;
    const newVT = (k + (v0 + net) - 1n) / (v0 + net);
    const out = VIRTUAL_TOKEN - newVT;
    return out > CURVE_SUPPLY ? CURVE_SUPPLY : out;
  }, [v0, buyWei]);

  const teamList = team.split(/[\s,]+/).filter(Boolean);
  const teamOk = teamList.length <= 5 && teamList.every((a) => isAddress(a));
  const total = (creationFee ?? 0n) + (deposit ?? 0n) + buyWei;
  const valid = bytes(name) >= 1 && bytes(name) <= 32 && bytes(symbol) >= 1 && bytes(symbol) <= 10 && teamOk && description.length <= 280;

  async function onFile(f?: File) {
    if (!f) return;
    const blob = await resizeTo512(f);
    setImage(blob);
    setPreview(URL.createObjectURL(blob));
  }

  async function submit() {
    if (!valid || creationFee === undefined || deposit === undefined) return;
    try {
      setStatus({ kind: "busy", msg: "Uploading image and metadata…" });
      const fd = new FormData();
      fd.set("name", name); fd.set("symbol", symbol); fd.set("description", description);
      fd.set("website", website); fd.set("x", x); fd.set("telegram", telegram); fd.set("imageUrl", imageUrl);
      if (image) fd.set("image", new File([image], "image.webp", { type: image.type }));
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (up.error) throw new Error(up.error);

      setStatus({ kind: "busy", msg: "Confirm in your wallet…" });
      const hash = await writeContractAsync({
        address: launchpadAddress,
        abi: launchpadAbi,
        functionName: "launch",
        args: [name, symbol, up.uri, teamList as Address[], withSlippage(tokensOut, 1), getReferral()],
        value: total,
      });
      setStatus({ kind: "busy", msg: "Launching…" });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: launchpadAbi, data: log.data, topics: log.topics });
          if (ev.eventName === "CoinLaunched") {
            setStatus({ kind: "ok", msg: "Launched." });
            router.push(`/coin/${(ev.args as any).token}`);
            return;
          }
        } catch {}
      }
      setStatus({ kind: "ok", msg: "Launched." });
    } catch (e) {
      setStatus({ kind: "err", msg: txError(e) });
    }
  }

  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <h1 className="display" style={{ fontSize: 40, margin: 0, fontWeight: 800 }}>Launch a coin</h1>
      <p className="muted" style={{ marginTop: 8 }}>Name it, give it a face, and put it at the center. One transaction, no code.</p>

      <div className="row wrap mono" style={{ gap: 8, margin: "18px 0 24px" }}>
        <span className="tag">Supply 1,000,000,000</span>
        <span className="tag">Fee {creationFee !== undefined ? fmtNative(creationFee, 4) : "—"} {nativeSymbol}</span>
        <span className="tag accent">Deposit {deposit !== undefined ? fmtNative(deposit, 4) : "—"} {nativeSymbol} · back at {brand.words.graduate}</span>
        <span className="tag">1% trade fee · 50% to you</span>
      </div>

      {paused && <div className="notice hot" style={{ marginBottom: 16 }}>New launches are paused right now.</div>}

      <div className="coin-layout">
        <div className="panel panel-pad stack" style={{ gap: 18 }}>
          <div className="row wrap" style={{ gap: 16, alignItems: "stretch" }}>
            <div className="field grow" style={{ minWidth: 220 }}>
              <div className="field-row"><span className="label">Name</span><span className="faint mono" style={{ fontSize: 11 }}>{bytes(name)}/32</span></div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Zero Cat" />
            </div>
            <div className="field" style={{ width: 180 }}>
              <div className="field-row"><span className="label">Ticker</span><span className="faint mono" style={{ fontSize: 11 }}>{bytes(symbol)}/10</span></div>
              <input className="input mono" value={symbol} onChange={(e) => setSymbol(e.target.value.replace(/\s/g, "").toUpperCase())} placeholder="ZCAT" />
            </div>
          </div>

          <div className="field">
            <span className="label">Image</span>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
              style={{ border: "1px dashed var(--line-2)", borderRadius: 12, padding: 18, cursor: "pointer", display: "flex", gap: 16, alignItems: "center", background: "var(--panel-inset)" }}
            >
              <div className="avatar" style={{ width: 88, height: 88 }}>
                {preview ? <img src={preview} alt="" /> : <span className="faint" style={{ fontSize: 28 }}>+</span>}
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                Click or drop an image. It is resized to 512×512.
                <div className="faint" style={{ fontSize: 12 }}>PNG, JPG, WebP or GIF</div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            {!image && <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste an https:// image link" />}
          </div>

          <div className="field">
            <div className="field-row"><span className="label">Description</span><span className="faint mono" style={{ fontSize: 11 }}>{description.length}/280</span></div>
            <textarea className="textarea" value={description} maxLength={280} onChange={(e) => setDescription(e.target.value)} placeholder="What makes it different?" />
          </div>

          <div className="row wrap" style={{ gap: 12 }}>
            <div className="field grow"><span className="label">Website</span><input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
            <div className="field grow"><span className="label">X</span><input className="input" value={x} onChange={(e) => setX(e.target.value)} placeholder="https://x.com/…" /></div>
            <div className="field grow"><span className="label">Telegram</span><input className="input" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/…" /></div>
          </div>

          <div className="field">
            <span className="label">Team wallets (optional, up to 5)</span>
            <input className="input mono" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="0x… 0x…" />
            <span className="faint" style={{ fontSize: 12 }}>These wallets skip the sniper fee, like you. They are shown publicly on the coin page.</span>
            {!teamOk && <span className="down" style={{ fontSize: 12 }}>Enter up to 5 valid addresses.</span>}
          </div>

          <div className="field">
            <div className="field-row"><span className="label">Your first buy ({nativeSymbol}), optional</span><span className="faint mono" style={{ fontSize: 11 }}>same transaction</span></div>
            <input className="input mono" inputMode="decimal" value={initialBuy} onChange={(e) => setInitialBuy(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.0" />
            <span className="faint" style={{ fontSize: 12 }}>Your buy lands in the launch transaction, so no bot can buy before you. You never pay the sniper fee.</span>
          </div>
        </div>

        <aside className="stack" style={{ position: "sticky", top: 84 }}>
          <div className="panel" style={{ overflow: "hidden" }}>
            <div className="epi-top"><span className="label accent">Live preview</span><span className="faint mono" style={{ fontSize: 11 }}>how it shows on discover</span></div>
            <CoinArt
              coin={{ token: previewToken, symbol: symbol || "??", uri: "", progressBps: 0 }}
              imageSrc={preview || imageUrl || undefined}
              intensity={0.35}
              height={170}
            />
            <div style={{ padding: 16 }}>
              <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>${symbol || "TICKER"}</div>
              <div className="muted">{name || "Coin name"}</div>
              {description && <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>{description}</p>}
              <div className="steps">
                <div className="on"><b>01</b><span>Launch</span></div>
                <div><b>02</b><span>Pressure builds</span></div>
                <div><b>03</b><span>{brand.words.graduate[0].toUpperCase() + brand.words.graduate.slice(1)}</span></div>
              </div>
            </div>
          </div>
          <div className="panel panel-pad">
            <div className="label" style={{ marginBottom: 8 }}>Summary</div>
            <div className="kv"><span>Creation fee</span><span className="mono">{fmtNative(creationFee, 5)} {nativeSymbol}</span></div>
            <div className="kv"><span>Deposit (refundable)</span><span className="mono">{fmtNative(deposit, 5)} {nativeSymbol}</span></div>
            <div className="kv"><span>First buy</span><span className="mono">{fmtNative(buyWei, 5)} {nativeSymbol}</span></div>
            <div className="kv" style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 10 }}><span>Total to send</span><b className="mono">{fmtNative(total, 5)} {nativeSymbol}</b></div>
            <div className="kv"><span>Tokens you get</span><span className="mono">{fmtNum(Number(tokensOut) / 1e18, 4)}</span></div>
            <div className="kv"><span>% of supply</span><span className="mono">{(Number((tokensOut * 10_000n) / (10n ** 27n)) / 100).toFixed(2)}%</span></div>
            <div style={{ marginTop: 14 }}>
              {!isConnected ? (
                <ConnectButton block />
              ) : (
                <button className="btn btn-primary btn-lg btn-block" disabled={!valid || status.kind === "busy" || paused} onClick={submit}>
                  {status.kind === "busy" ? status.msg : `Launch $${symbol || "coin"}`}
                </button>
              )}
            </div>
            {status.kind === "err" && <div className="notice err" style={{ marginTop: 12 }}>{status.msg}</div>}
            {status.kind === "ok" && <div className="notice ok" style={{ marginTop: 12 }}>{status.msg}</div>}
            {address && <div className="faint mono" style={{ fontSize: 11, marginTop: 10 }}>Fees you earn are claimable on the Creator page.</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Center-crop and resize to 512x512 WebP in the browser. GIFs are kept as-is to preserve animation. */
async function resizeTo512(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 512, 512);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/webp", 0.9));
}
