// Everything brand-specific lives here. Rename the project by editing this file and globals.css (:root tokens).
//
// GROUND ZERO: the point of impact. Every coin starts there, at zero, on Zero.
// Visual language: a target marker, shockwave rings radiating out, black and white.
export const brand = {
  name: "GROUND ZERO",
  short: "G0",
  domain: "ground0.fun",
  tagline: "Every coin starts at ground zero.",
  description:
    "The fair launchpad on Zero. Launch a coin in one transaction, bots pay to snipe, creators earn on every trade, and liquidity locks forever.",
  x: "ground0_fun", // X handle without @ -> https://x.com/ground0_fun
  // Product vocabulary, so the theme can be swapped without touching components
  words: {
    coin: "coin",
    curve: "pressure", // bonding-curve progress
    graduate: "breakout", // curve filled -> pool
    graduated: "broke out",
    launch: "Launch",
    hottest: "At ground zero", // the most active coin right now
    feed: "Impact log", // live event feed
    biggest: "Biggest blasts", // top by market cap
  },
} as const;
