"use client";

import { useEffect, useRef, useState } from "react";
import { brand } from "@/config/brand";

/** Make a shareable "first edition" card for a coin idea. Not a token: just an image to post. */
export function MemeStudio() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("Zero Cat");
  const [ticker, setTicker] = useState("ZCAT");
  const [pitch, setPitch] = useState("The first cat to land at ground zero.");
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const W = 1200, H = 630;
    c.width = W; c.height = H;
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#ffffff";
    const display = css.getPropertyValue("--font-unbounded").trim() || "sans-serif";
    const mono = css.getPropertyValue("--font-jetbrains").trim() || "monospace";

    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H);
    // rings from the image center
    const cx = 900, cy = 315;
    for (let r = 40; r < 900; r += 46) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = accent; ctx.globalAlpha = Math.max(0.03, 0.3 - r / 2600); ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // image
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 170, 0, Math.PI * 2); ctx.clip();
    if (img) {
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - 170, cy - 170, 340, 340);
    } else {
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 170);
      g.addColorStop(0, accent); g.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = g; ctx.fillRect(cx - 170, cy - 170, 340, 340);
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, 172, 0, Math.PI * 2); ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.stroke();

    // text
    ctx.fillStyle = "#6b6b6b"; ctx.font = `500 22px ${mono}`;
    ctx.fillText("FIRST EDITION · MADE FOR ZERO", 70, 92);
    ctx.fillStyle = accent; ctx.font = `800 96px ${display}`;
    ctx.fillText(`$${ticker || "TICKER"}`.slice(0, 11), 70, 240);
    ctx.fillStyle = "#f5f5f5"; ctx.font = `600 40px ${display}`;
    ctx.fillText((name || "Coin name").slice(0, 26), 70, 305);
    ctx.fillStyle = "#a3a3a3"; ctx.font = `400 28px ${mono}`;
    wrap(ctx, pitch || "", 70, 370, 600, 38, 4);
    ctx.fillStyle = "#f5f5f5"; ctx.font = `700 26px ${display}`;
    ctx.fillText(brand.name, 70, 570);
    ctx.fillStyle = "#6b6b6b"; ctx.font = `400 22px ${mono}`;
    ctx.fillText(`${brand.domain} · concept card, not a token`, 70, 600);
  }, [name, ticker, pitch, img]);

  function onFile(f?: File) {
    if (!f) return;
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = URL.createObjectURL(f);
  }

  function download() {
    const a = document.createElement("a");
    a.download = `${ticker || "coin"}-first-edition.png`;
    a.href = canvas.current!.toDataURL("image/png");
    a.click();
  }

  const post = `My first coin for Zero: $${ticker} (${name}). ${pitch}\n\nMade at ${brand.domain} @${brand.x}`;

  return (
    <div>
      <div className="label">The studio</div>
      <h2 className="display" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, margin: "10px 0 8px" }}>Make your first edition.</h2>
      <p className="muted" style={{ marginBottom: 22 }}>Give your idea a face before launch day. Download the card and post it. No wallet, no payment.</p>
      <div className="coin-layout studio-layout">
        <div className="panel" style={{ overflow: "hidden" }}>
          <canvas ref={canvas} style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
        <div className="panel panel-pad stack">
          <div className="field"><span className="label">Name</span><input className="input" maxLength={26} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><span className="label">Ticker</span><input className="input mono" maxLength={10} value={ticker} onChange={(e) => setTicker(e.target.value.replace(/\s/g, "").toUpperCase())} /></div>
          <div className="field"><span className="label">What makes it different? <span className="faint">{pitch.length}/100</span></span><textarea className="textarea" maxLength={100} value={pitch} onChange={(e) => setPitch(e.target.value)} /></div>
          <div className="field"><span className="label">Image (optional)</span><input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} /></div>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={download}>Download card</button>
            <a className="btn" href={`https://x.com/intent/post?text=${encodeURIComponent(post)}`} target="_blank" rel="noreferrer">Post on X</a>
          </div>
          <div className="faint" style={{ fontSize: 12 }}>Attach the downloaded card to your post. Your image never leaves your browser.</div>
        </div>
      </div>
    </div>
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, lines: number) {
  const words = text.split(" ");
  let line = "", n = 0;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y + n * lh);
      line = w;
      if (++n >= lines) return;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y + n * lh);
}
