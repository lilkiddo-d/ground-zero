# Zero Launchpad Research & Blueprint

Researched 2026-11-14. All five sites are building a token launchpad for **Zero**, the L1 chain from LayerZero.
Only **Tzero** has a working product (on testnet). The other four are pre-launch landing pages.

> Zero chain details (chain ID, RPC, explorer) are not yet public in any source I could find. nilly says mainnet is
> **Nov 30, 2026**, and that gas and prices are in **$ZRO**. Tzero says "Q4 2026". Until Zero opens a testnet, build
> and test on **Base Sepolia**, as Tzero does, and keep the chain config swappable.

---

## 1. Site by site

### Tzero — testnet.tzer0.fun (live product, the main reference)
**Concept:** rocket / mission control. A token is a "mission", the bonding curve is "fuel", graduation is "liftoff", and the starting price is "T-0".

**Pages:** Missions (home), Launch, $T0 (staking), Creator, Docs, Points, plus a page for each token.

**Home layout:** hero with 2 CTAs → 6 stat tiles (launched, liftoffs, live, 24h volume, paid to creators, paid to stakers) → "Closest to liftoff" ranked by fuel → "King of the pad" → "Top by market cap" → token table with tabs (Trending / New / Ignition / Liftoff), List/Grid toggle, and sortable columns (Mcap, 24h, Fuel, Vol, Price).

**Launch form:** Name (32 bytes), Ticker (10 bytes), Image (upload, resized to 512px, or a URL), Description (280 chars), Website/X/Telegram, optional initial buy in the same transaction. A live preview card and a Summary box (fee, total to send, tokens received, % of supply) sit beside it.

**Theme:** warm near-black (`#0d0c0b`), cream ink (`#efe9dc`), orange "exhaust" accent (`#ff6a2b`), red LED number readouts (`#ff3b1f` in VT323), up/down `#5fcf8a` / `#ff5a3f`. Fonts: Space Grotesk, IBM Plex Mono, VT323. Blueprint-style line drawings of rockets. 12px radius.

**Stack:** Next.js (App Router, Turbopack), wagmi + viem, IPFS metadata (`/api/metadata-upload`), RPC proxied through `/api/rpc`, and an indexer that polls new blocks every few seconds ("Indexing your mission…").

**Contracts (Solidity 0.8.28, verified on Base Sepolia, chain 84532):**
| Contract | Address |
|---|---|
| Launchpad | `0xbce48917C41BB45Ad15f859E4Bf0e4EEa74bAd5c` |
| TzeroSwap factory | `0xf9CE1F9D20d5d42515b27fE2A5380B89A0Be927E` |
| TzeroSwap router | `0x21BbD201c69d0091707d0367D3AD6875cEc150e1` |
| Fee splitter | `0x1C69a90c69fdb2F2E459fCA23cA6B22ACD707B3b` |
| $T0 staking | `0x221De22612E65093Fc43164dae84fa6Bd79E6239` |
| $T0 token | `0x15522727F10Ea666Ebb4fD4c23B394580F10FED4` |

Because these are verified, you can read the source on Basescan as a reference implementation.

**Mechanics:**
- Plain ERC-20 with a fixed supply of 1B. No owner, mint, pause, blacklist or tax.
- Constant-product curve on virtual reserves (the pump.fun model). 793.1M tokens (79.31%) are sold on the curve and 206.9M are reserved for liquidity. Testnet virtual native reserve is 0.1 ETH, and a token graduates after about 0.28 ETH of net buys.
- 1% fee on every buy and sell. Default slippage 1% (adjustable 0.1–50%).
- Liftoff happens inside the buy that fills the curve. Any overpayment is refunded, a 3% graduation fee is taken, and a pool is seeded at the exact final curve price, so the price doesn't jump. Unused reserve tokens are burned and the LP tokens go to `0x…dEaD`.
- Its own DEX is a Uniswap V2 fork. Only the launchpad can create pools, which blocks pre-made pools at fake prices. The 1% swap fee goes to the fee split; LPs earn nothing.
- **Fee split:** trades are 50% creator / 30% team / 20% stakers. Creation and liftoff fees are 70% team / 30% stakers. If a team payment fails, it is set aside so it can never block a trade.
- Staking rewards are credited from the next block, which stops flash-stake fee sniping.
- **Points (Season 0, all on-chain):** 1,000 points per 1 ETH bought. Tokens must be held 60 minutes. Max 1 ETH counts per day. Buys on your own token earn nothing. Bonuses for backing a token that lifts off, for creators who graduate with at least 5 backers, and for staking. There is an X post task with a wallet signature. 11% of supply goes to the program, capped at 0.1% per wallet, with a sybil review before the snapshot.
- Traction on testnet: 13.8k tokens, 8k liftoffs.

### nilly — nilly.fun (pre-launch, the best mechanic ideas)
**Concept:** "Something from nothing." Pixel art; you can draw on the page. Countdown to Nov 30.
**Theme:** pure black with a dot grid, pixel display font **Silkscreen**, body font **Instrument Sans**, light/dark toggle. Very minimal.

**Mechanic ideas worth borrowing:**
- **Sniper fee:** 99% on the first buys, falling to 1% within 5 seconds, on buys only. Half goes to the creator. The creator and team wallets named at launch are exempt.
- **Original mark:** the first coin with a ticker gets an "original" badge. Copies of a live coin pay 50% of their creator fee to the original's creator.
- **Dev record:** every coin shows its creator's launches, graduations and sells.
- **Takeover:** if a creator stops claiming fees for 14 days after graduation, or sells more than 90% of their buy, holders can vote in a new fee wallet. The vote runs 72 hours, then a 48-hour delay before it takes effect.
- **Creator fee that grows:** 0.50% on the curve, 0.60% after graduation, 0.75% if the coin is still trading 7 days later.
- **Optional creator tax** of 0–5%, set at launch and never raisable.
- **Launch deposit:** about $5 in ZRO, refunded when the coin graduates. Spam costs money; real coins launch free.
- **Apps, bots and referrals** earn 0.10% of the trades they bring.
- Prices in $ZRO. "Buy from any chain" is listed as coming soon, which is where LayerZero messaging fits.
- A clear FAQ: no token yet, warnings about scammers, not affiliated with LayerZero.

### 000.fun (pre-launch hype page)
**Theme:** black-and-white, chunky rounded **Fredoka** display font, Geist and Geist Mono, warp-tunnel background. Stat counters at 0 ("Everything starts at zero"), three "sealed files" teasers, an X intent button ("Post 'I'm early'"), and an easter egg (press 0).
**Stack:** static HTML/CSS/JS with a very strict CSP, no backend.
**Takeaway:** turning stats at zero into a joke is a nice pre-launch hook.

### 010101.fun (pre-launch brand page)
**Theme:** editorial and light. Paper `#f2f1eb`, ink `#20231f`, electric blue `#2049ed`. Fonts: Manrope and IBM Plex. A 3D "01" brand film, plus an interactive binary toy (flip bits, type words to see them in binary).
**Stack:** static, no backend. Offers downloadable avatar and X banner brand assets.
**Takeaway:** a premium brand feel and community assets, but no product details.

### zro.fun (pre-launch, best growth engine)
**Concept:** "Memes. Meet $ZRO." Every token pairs with ZRO.
**Theme:** warm off-white, **Instrument Serif** italic headline with Hanken Grotesk / DM Sans, and a 3D chrome "Z" with a hooded mascot.
**Growth system:**
- **Meme Studio:** make a simulated coin card (image, name, ticker, pitch), get a shareable link (`/api/cards`) and a one-click X post.
- **Pre-testnet points:** log in with X and add a reward wallet with no signature needed. One X account per wallet. Points for following, original posts, comments and retweets. Every 200 views earns 1 point, up to 20 per post. Daily caps reset at UTC midnight.
- **Leaderboard and early list:** the top 100 get permanent benefits.

---

## 2. What to take from each

| Area | Best reference | Why |
|---|---|---|
| Core contracts | Tzero | Proven pump.fun-style curve, graduation in one transaction, locked LP, fee splitter, tested |
| Fairness and anti-rug | nilly | Sniper fee, original mark, dev record, takeover |
| Creator money | nilly + Tzero | Fee share that grows over time, claim page |
| App UX | Tzero | Discovery sections, launch form with live preview, transaction summary |
| Pre-launch growth | zro.fun + Tzero points | X-based points before launch, on-chain points after |
| Brand polish | 010101 / 000 | Strong single concept, easter eggs, downloadable assets |
| **Open gap** | nobody has shipped it | **Buy from any chain** with LayerZero messaging. This is what makes a LayerZero-native launchpad different. |

---

## 3. Recommended architecture for your launchpad

**Contracts (Foundry, Solidity 0.8.28):**
1. `Token`: fixed-supply ERC-20 (1B), no owner.
2. `Launchpad`: creates tokens, runs a virtual-reserve curve for each token, applies a decaying sniper fee, allows an initial buy in the launch transaction, and graduates in the same transaction.
3. `Factory`, `Pair` and `Router` for the DEX: a Uniswap V2 fork where only the launchpad can create pools and LP tokens are burned.
4. `FeeSplitter`: creator, protocol and (optional) stakers, with pull-based claims.
5. Later: `Takeover` governance, `Referral`, and a LayerZero OApp for cross-chain buys.
- Pair against **native ZRO** on Zero (ETH on Base Sepolia for testing).
- Test with fuzz and invariant tests: the curve never pays out more than it holds, and fees are conserved.

**Indexer:** Ponder (TypeScript, reads contract events) writing to Postgres. It computes candles, holders, volume, "closest to graduation", dev records and points.

**Frontend:** Next.js + wagmi/viem + RainbowKit. TradingView lightweight-charts for price charts. Image upload to IPFS through Pinata, resized to 512px. An RPC proxy route. Live trades over WebSocket or polling.

**Pages:** Home/discover · Launch · Token page (chart, trade panel, holders, trades, dev record) · Profile/Creator (claim fees) · Points · Docs.

**Pre-launch:** landing page with a countdown, a meme-card studio with shareable OG images, X-login points and a leaderboard.

**Theme:** all five already use a strong concept (rocket, pixels, warp, binary, chrome Z). Pick one concept that is clearly yours and build the whole vocabulary around it, the way Tzero renames everything.
