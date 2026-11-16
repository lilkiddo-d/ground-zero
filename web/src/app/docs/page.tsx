import { brand } from "@/config/brand";
import { faq, feeTable } from "@/config/fees";
import { activeChain, explorer, launchpadAddress } from "@/lib/chain";

export const metadata = { title: "Docs" };

const sections = [
  {
    h: "1 · Launch",
    p: [
      "Pick a name (1–32 bytes), a ticker (1–10 bytes) and an image. Optionally add a description, links, up to 5 team wallets and a first buy.",
      "You pay the creation fee and a refundable deposit, plus your first buy. The launch and your first buy happen in one transaction, so no one can buy before you.",
    ],
  },
  {
    h: `2 · The ${brand.words.curve} curve`,
    p: [
      "Every coin has 1,000,000,000 tokens. 793,100,000 (79.31%) are sold on a bonding curve. 206,900,000 are reserved for the pool.",
      "The curve is constant product on virtual reserves, the same model pump.fun uses: price rises with every buy and falls with every sell. Rounding always favours the curve, so it can never pay out more than it holds.",
      `${brand.words.curve[0].toUpperCase() + brand.words.curve.slice(1)} = tokens sold ÷ 793,100,000. Every coin page shows exactly how much more fills it.`,
    ],
  },
  {
    h: "3 · Sniper fee",
    p: [
      "Buys in the first seconds after launch pay a fee that starts at 99% and falls in a straight line to the normal 1%. A bot racing the first block hands nearly all of it over, half to the creator. By the time a person clicks, it's gone.",
    ],
  },
  {
    h: `4 · ${brand.words.graduate[0].toUpperCase() + brand.words.graduate.slice(1)}`,
    p: [
      "The buy that fills the curve triggers the breakout in the same transaction. If you sent more than was needed, the extra is refunded.",
      "3% of the raise is taken. The rest, with the matching amount of reserved tokens, seeds a pool at exactly the curve's final price. Unused reserved tokens are burned.",
      "The pool has no LP tokens and no withdraw function. The liquidity is locked forever. The creator's deposit is returned.",
    ],
  },
  {
    h: "5 · Copies and the original",
    p: [
      "The first coin with a ticker is the original. A later coin with the same ticker is marked as a copy and, while the original is still trading (a trade in the last 7 days), pays half its creator fee to the original's creator.",
    ],
  },
];

export default function Docs() {
  return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 900 }}>
      <div className="label">Documentation</div>
      <h1 className="display" style={{ fontSize: 40, margin: "6px 0 10px", fontWeight: 800 }}>How {brand.name} works</h1>
      <p className="muted">From launch to breakout, straight from the contract.</p>

      {sections.map((s) => (
        <section key={s.h} style={{ marginTop: 34 }}>
          <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>{s.h}</h2>
          {s.p.map((p, i) => <p key={i} className="muted">{p}</p>)}
        </section>
      ))}

      <section id="fees" style={{ marginTop: 34, scrollMarginTop: 80 }}>
        <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>Fees</h2>
        <p className="muted">Every number is a constant in the contract. None can be changed for any coin.</p>
        <div className="panel">
          <table className="tbl">
            <tbody>
              {feeTable.map((f) => (
                <tr key={f.k}><td style={{ width: 170 }}><b>{f.k}</b></td><td className="mono accent" style={{ width: 130 }}>{f.v}</td><td className="muted">{f.d}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>Contracts</h2>
        <div className="panel panel-pad mono" style={{ fontSize: 13 }}>
          <div className="kv"><span>Network</span><span>{activeChain.name} ({activeChain.id})</span></div>
          <div className="kv"><span>Launchpad</span>{explorer ? <a href={`${explorer}/address/${launchpadAddress}`} target="_blank" rel="noreferrer">{launchpadAddress} ↗</a> : <span>{launchpadAddress}</span>}</div>
        </div>
      </section>

      <section id="faq" style={{ marginTop: 34, scrollMarginTop: 80 }}>
        <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>FAQ</h2>
        {faq.map((f) => (
          <details key={f.q} className="panel" style={{ padding: "14px 18px", marginBottom: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>{f.q}</summary>
            <p className="muted" style={{ marginBottom: 0 }}>{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
