/** Ground Zero mark: a target with a bold zero at the point of impact. Swap this SVG to rebrand. */
export function Mark({ size = 28, color = "var(--accent)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      {/* outer ring, broken at the four crosshair points */}
      <circle cx="16" cy="16" r="13" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="15.42 5" strokeDashoffset="-2.5" />
      {/* crosshair ticks */}
      <path d="M16 1v6M16 25v6M1 16h6M25 16h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* the zero */}
      <ellipse cx="16" cy="16" rx="4.2" ry="5.4" fill="none" stroke={color} strokeWidth="2.6" />
    </svg>
  );
}

/** Full wordmark: mark + GROUND ZERO with the 0 set apart. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size * 0.72 }}>
      <Mark size={size} />
      <span>GROUND<b>ZERO</b></span>
    </span>
  );
}

/** Shockwave trace (seismograph line). `amp` 0..1 controls how violent the line is. */
export function Seismo({ width = 600, height = 60, amp = 0.6, seed = 1, className }: {
  width?: number; height?: number; amp?: number; seed?: number; className?: string;
}) {
  const pts: string[] = [];
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const mid = height / 2;
  for (let x = 0; x <= width; x += 4) {
    const d = Math.abs(x - width * 0.55) / (width * 0.5); // burst near the centre
    const env = Math.max(0.04, Math.exp(-d * d * 6)) * amp;
    pts.push(`${x},${(mid + (rnd() - 0.5) * height * env).toFixed(1)}`);
  }
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
