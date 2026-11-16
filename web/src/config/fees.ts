// Human-readable copy of the numbers fixed in Launchpad.sol. Keep in sync with the contract constants.
export const feeTable = [
  { k: "Trade fee", v: "1%", d: "On every buy and sell, on the curve and after breakout." },
  { k: "Creator earns", v: "50% → 75%", d: "Of every trade fee: 50% on the curve, 60% after breakout, 75% once the coin is still trading 7 days later. Claim anytime." },
  { k: "Sniper fee", v: "99% → 1%", d: "On buys in the first seconds after launch, falling every second. Half goes to the creator. The creator and their named team wallets don't pay it." },
  { k: "Copies pay", v: "50%", d: "Reuse the ticker of a coin that's still trading and half your creator fee goes to the original's creator." },
  { k: "Referrers", v: "10%", d: "Apps, bots and referral links earn 10% of the protocol's share of the trades they bring." },
  { k: "Launch deposit", v: "refunded", d: "A small deposit to launch, returned the moment your coin breaks out. Forfeited after 30 days without breakout. Spam pays, real coins launch free." },
  { k: "Breakout fee", v: "3%", d: "Of the raise, once. The rest becomes pool liquidity at exactly the last curve price: no dip." },
  { k: "Liquidity", v: "locked forever", d: "The pool has no LP tokens and no withdraw function. Nobody can pull it, including us." },
];

export const faq = [
  { q: "What is this?", a: "A launchpad for new coins on Zero, LayerZero's chain. Anyone can launch in one transaction. Every coin uses the same standard contract, opens with a sniper fee, and pays its creator on every trade." },
  { q: "Can a coin rug?", a: "Not through the contract. Every coin is the same fixed-supply token: no owner, no mint, no blacklist, no tax. Before breakout the liquidity is the curve itself, held by the launchpad. After breakout it sits in a pool with no withdraw function." },
  { q: "Can creators buy their own coin?", a: "Yes, in the launch transaction itself, before anyone else, and without the sniper fee. So can the team wallets they name. Every coin page shows what the dev holds and has sold." },
  { q: "Why did my transaction fail?", a: "Usually slippage: the price moved more than your tolerance before your transaction landed. Nothing is traded when a transaction reverts." },
  { q: "Is there a token?", a: "Not yet. There is no presale. Anyone offering one today is a scammer. Official news only comes from our X account." },
  { q: "Are you part of LayerZero?", a: "No. This is an independent project built on Zero, not affiliated with LayerZero Labs." },
];
