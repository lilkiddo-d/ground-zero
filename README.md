# GROUND ZERO: a launchpad for Zero

> Brand: **GROUND ZERO** (ground0.fun, @ground0fun). To change it, edit `web/src/config/brand.ts` (name, X handle, vocabulary),
> the colour tokens at the top of `web/src/app/globals.css`, and the mark in `web/src/components/Logo.tsx`.

A pump.fun-style launchpad for LayerZero's Zero chain. It takes the best parts of the competitors (see [RESEARCH.md](RESEARCH.md)):
Tzero's curve and graduation design, nilly's anti-sniper and anti-copycat rules, and zro.fun's pre-launch growth tools.

```
contracts/   Foundry: LaunchToken, Launchpad (curve + fees + graduation), Pool (locked AMM)
web/         Next.js app: discover, launch, coin page, creator, points, docs, pre-launch landing
indexer/     Ponder indexer (optional): trades and coins in Postgres, plus a REST/GraphQL API
```

## How it works (contract summary)

| | |
|---|---|
| Supply | 1,000,000,000 per coin, minted once. No owner, mint, pause, blacklist or tax. |
| Curve | Constant product on virtual reserves. 793.1M tokens sold on the curve, 206.9M reserved for the pool. |
| Trade fee | 1%. The creator gets 50% of it on the curve, 60% after breakout, and 75% once the coin is still trading 7 days later. |
| Sniper fee | Buys in the first `sniperWindow` seconds pay a fee that falls from 99% to 1%. Half goes to the creator. The creator and up to 5 team wallets are exempt. |
| Copies | A coin that reuses a live coin's ticker sends half its creator share to the original's creator. |
| Referrals | `?ref=0x…` links earn 10% of the protocol share. |
| Breakout | The buy that fills the curve also deploys the coin's Pool in the same transaction, refunds any overpayment and takes 3%. The pool opens at the final curve price, and unused reserve tokens are burned. |
| Liquidity | The Pool has no LP tokens and no withdraw function, so the liquidity is locked forever. |
| Deposit | Returned to the creator at breakout. Forfeited after 30 days without breakout. |
| Admin | The owner can change only the fee, deposit and starting reserve for **new** coins, plus the treasury, and can pause new launches. Trading can never be paused. |

Sells need no approval: the token lets the Launchpad and its own Pool pull tokens, but only from the wallet that called them.

## Run it locally

You need Node 20+ and [Foundry](https://getfoundry.sh).

```bash
anvil
```

```bash
cd contracts && SNIPER_WINDOW=0 forge script script/Deploy.s.sol --rpc-url local --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

```bash
cd contracts && LAUNCHPAD=0x5FbDB2315678afecb367f032d93F642f64180aa3 forge script script/Seed.s.sol --rpc-url local --broadcast
```

```bash
cd web && npm install && npm run dev
```

Open http://localhost:3100. To trade, add the Anvil network (chain 31337, RPC `http://127.0.0.1:8545`) to MetaMask or Rabby and import one of Anvil's test keys.

- `/` opens straight on the launch form (first visit shows an "Agree and continue" popup; edit it in `web/src/components/AgreeGate.tsx`) · `/discover` · `/coin/0x…` · `/creator` · `/points` · `/docs`
- `/welcome` always shows the pre-launch landing. Set `NEXT_PUBLIC_PRELAUNCH=true` to make it the homepage and hide the app.

## Tests

```bash
cd contracts && forge test
```

There are 23 tests: unit tests for launch, the sniper fee, copies, referrals, graduation, the pool, claims, deposit forfeit and pausing, plus fuzz tests that check the contract stays solvent and that a buy-then-sell round trip can never make a profit.

## Deploy to testnet (Base Sepolia, until Zero has a testnet)

A dry run (simulated, nothing sent) succeeds against Base Sepolia; the deploy costs about 0.00005 ETH in gas.

1. Get Base Sepolia ETH from a faucet into a fresh wallet you only use for testing.
2. Store its key in Foundry's encrypted keystore (you type the key and a password in your own terminal; it never sits in a file or shell history):
   ```bash
   cast wallet import deployer --interactive
   ```
3. Deploy. `VIRTUAL_NATIVE=0.01` makes a coin break out after ~0.03 ETH of buys, so testing doesn't need many faucet runs (the default 0.1 needs ~0.28 ETH):
   ```bash
   cd contracts && VIRTUAL_NATIVE=10000000000000000 forge script script/Deploy.s.sol --rpc-url base_sepolia --account deployer --broadcast
   ```
   Add `--verify --etherscan-api-key <key>` to verify the source on Basescan. The deployer wallet becomes the owner and the fee treasury unless you set `TREASURY=0x...`.
4. Point the app and indexer at it, then restart `npm run dev`:
   ```bash
   cd web && npm run use-deployment 84532
   ```
   This writes the chain, address, start block and `NEXT_PUBLIC_LOG_CHUNK=200` into `web/.env.local` and `indexer/.env.local`. Switch back to local with `npm run use-deployment 31337`.

The public RPC (`sepolia.base.org`) only allows `eth_getLogs` over 200 blocks per call, and Base makes a block every 2 seconds. The app copes by reading in chunks and caching, so each refresh only fetches new blocks, but the first page load gets slower the longer ago you deployed. For anything beyond a quick test, run the indexer (below) or set `RPC_URL` to a provider such as Alchemy and raise `NEXT_PUBLIC_LOG_CHUNK`. Set `PINATA_JWT` too, so coin images go to IPFS instead of your local disk.

**Zero mainnet:** fill in the `NEXT_PUBLIC_ZERO_*` variables and `ZERO_RPC_URL` once LayerZero publishes the chain details, and set `NEXT_PUBLIC_CHAIN=zero`. Recalibrate `VIRTUAL_NATIVE` to the ZRO price. Breakout happens after about 2.83 × `VIRTUAL_NATIVE` of net buys (0.1 → about 0.28).

## Indexer (for production)

Without the indexer, the web app reads raw logs over RPC. That works locally and on a quiet testnet, but public RPCs cap `eth_getLogs` ranges. For real traffic:

```bash
cd indexer && npm install && npm run dev
```

Then set `NEXT_PUBLIC_INDEXER_URL=http://localhost:42069` in `web/.env.local`.

## Not built yet (next steps)

- **Buy from any chain** through a LayerZero OApp. This is the main gap no competitor has shipped.
- Holder takeover of abandoned coins (nilly-style vote), and an optional creator tax.
- X login and post-based pre-launch points (zro.fun-style). The early list currently saves to a JSON file; move it to a database.
- A professional audit before mainnet. The tests are not a substitute.
