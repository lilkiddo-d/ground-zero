"use client";

import { useEffect, useRef } from "react";

/** Full-bleed canvas: shockwave rings pulse from the center, and from wherever you tap. */
export function Shockwaves() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    type Ring = { x: number; y: number; r: number; v: number; life: number };
    let rings: Ring[] = [];
    let raf = 0;
    let last = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (x: number, y: number, v = 2.2) => rings.push({ x, y, r: 2, v, life: 1 });
    const center = () => spawn(canvas.width / 2, canvas.height * 0.48, 1.6);
    center();

    const onDown = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      const x = (e.clientX - b.left) * dpr, y = (e.clientY - b.top) * dpr;
      spawn(x, y, 3);
      setTimeout(() => spawn(x, y, 2.4), 120);
    };
    canvas.addEventListener("pointerdown", onDown);

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ffffff";
    const tick = (t: number) => {
      if (t - last > 2200) { center(); last = t; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // faint dot grid
      ctx.fillStyle = "#ffffff0a";
      const step = 28 * dpr;
      for (let x = step / 2; x < canvas.width; x += step) for (let y = step / 2; y < canvas.height; y += step) ctx.fillRect(x, y, dpr, dpr);
      for (const g of rings) {
        g.r += g.v * dpr;
        g.life = Math.max(0, 1 - g.r / (Math.max(canvas.width, canvas.height) * 0.7));
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = g.life * 0.55;
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      rings = rings.filter((g) => g.life > 0.01);
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }} aria-hidden />;
}
