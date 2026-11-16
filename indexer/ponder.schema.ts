import { index, onchainTable } from "ponder";

export const coin = onchainTable("coin", (t) => ({
  token: t.hex().primaryKey(),
  creator: t.hex().notNull(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  uri: t.text().notNull(),
  originalOf: t.hex(),
  pool: t.hex(),
  launchedAt: t.integer().notNull(),
  graduatedAt: t.integer(),
  lastPrice: t.real().notNull(),
  volume: t.bigint().notNull(),
  trades: t.integer().notNull(),
}), (t) => ({ creatorIdx: index().on(t.creator) }));

export const pool = onchainTable("pool", (t) => ({
  address: t.hex().primaryKey(),
  token: t.hex().notNull(),
}));

export const trade = onchainTable("trade", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  token: t.hex().notNull(),
  trader: t.hex().notNull(),
  isBuy: t.boolean().notNull(),
  native: t.bigint().notNull(),
  tokens: t.bigint().notNull(),
  fee: t.bigint().notNull(),
  price: t.real().notNull(),
  block: t.bigint().notNull(),
  time: t.integer().notNull(),
  tx: t.hex().notNull(),
  venue: t.text().notNull(), // curve | pool
}), (t) => ({ tokenIdx: index().on(t.token), traderIdx: index().on(t.trader) }));
