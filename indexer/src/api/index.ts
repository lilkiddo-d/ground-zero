import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { asc, desc, eq, graphql } from "ponder";

// REST endpoints the web app reads when NEXT_PUBLIC_INDEXER_URL is set. GraphQL is at /graphql.
const app = new Hono();
app.use("*", cors());

const json = (v: unknown) => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));

app.get("/trades", async (c) => {
  const token = c.req.query("token") as `0x${string}` | undefined;
  const rows = await db
    .select()
    .from(schema.trade)
    .where(token ? eq(schema.trade.token, token.toLowerCase() as `0x${string}`) : undefined)
    .orderBy(asc(schema.trade.block), asc(schema.trade.id))
    .limit(token ? 20_000 : 50_000);
  return c.json(json(rows));
});

app.get("/coins", async (c) => {
  const rows = await db.select().from(schema.coin).orderBy(desc(schema.coin.launchedAt)).limit(1000);
  return c.json(json(rows));
});

app.use("/graphql", graphql({ db, schema }));

export default app;
