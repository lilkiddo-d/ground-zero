import { ponder } from "ponder:registry";
import { coin, pool, trade } from "ponder:schema";

const ratio = (a: bigint, b: bigint) => (b === 0n ? 0 : Number((a * 10n ** 18n) / b) / 1e18);
const ZERO = "0x0000000000000000000000000000000000000000";

ponder.on("Launchpad:CoinLaunched", async ({ event, context }) => {
  const a = event.args;
  await context.db.insert(coin).values({
    token: a.token,
    creator: a.creator,
    name: a.name,
    symbol: a.symbol,
    uri: a.uri,
    originalOf: a.originalOf === ZERO ? null : a.originalOf,
    launchedAt: Number(event.block.timestamp),
    lastPrice: ratio(a.virtualNative, a.virtualToken),
    volume: 0n,
    trades: 0,
  });
});

ponder.on("Launchpad:Trade", async ({ event, context }) => {
  const a = event.args;
  const price = ratio(a.virtualNative, a.virtualToken);
  await context.db.insert(trade).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    token: a.token,
    trader: a.trader,
    isBuy: a.isBuy,
    native: a.nativeAmount,
    tokens: a.tokenAmount,
    fee: a.fee,
    price,
    block: event.block.number,
    time: Number(event.block.timestamp),
    tx: event.transaction.hash,
    venue: "curve",
  });
  await context.db.update(coin, { token: a.token }).set((c) => ({ lastPrice: price, volume: c.volume + a.nativeAmount, trades: c.trades + 1 }));
});

ponder.on("Launchpad:Graduated", async ({ event, context }) => {
  const { token, pool: poolAddr } = event.args;
  await context.db.insert(pool).values({ address: poolAddr, token });
  await context.db.update(coin, { token }).set({ pool: poolAddr, graduatedAt: Number(event.block.timestamp) });
});

ponder.on("Pool:Swap", async ({ event, context }) => {
  const p = await context.db.find(pool, { address: event.log.address });
  if (!p) return;
  const a = event.args;
  const price = ratio(a.reserveNative, a.reserveToken);
  await context.db.insert(trade).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    token: p.token,
    trader: a.trader,
    isBuy: a.isBuy,
    native: a.nativeAmount,
    tokens: a.tokenAmount,
    fee: a.fee,
    price,
    block: event.block.number,
    time: Number(event.block.timestamp),
    tx: event.transaction.hash,
    venue: "pool",
  });
  await context.db.update(coin, { token: p.token }).set((c) => ({ lastPrice: price, volume: c.volume + a.nativeAmount, trades: c.trades + 1 }));
});
