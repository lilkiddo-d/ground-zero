// Point the web app (and indexer) at a deployment written by contracts/script/Deploy.s.sol.
//   node scripts/use-deployment.mjs 84532      -> Base Sepolia
//   node scripts/use-deployment.mjs 31337      -> local anvil
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const chainId = Number(process.argv[2] ?? 84532);
const depFile = path.join(root, "contracts", "deployments", `${chainId}.json`);
if (!existsSync(depFile)) {
  console.error(`No deployment at ${depFile}. Run the forge deploy first.`);
  process.exit(1);
}
const dep = JSON.parse(readFileSync(depFile, "utf8"));

const presets = {
  31337: { chain: "local", rpc: "http://127.0.0.1:8545", chunk: "0" },
  84532: { chain: "base-sepolia", rpc: "https://sepolia.base.org", chunk: "200" },
};
const p = presets[chainId] ?? { chain: "zero", rpc: process.env.ZERO_RPC_URL ?? "", chunk: "2000" };

function upsert(file, example, values) {
  if (!existsSync(file)) copyFileSync(example, file);
  let s = readFileSync(file, "utf8");
  for (const [k, v] of Object.entries(values)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    s = re.test(s) ? s.replace(re, `${k}=${v}`) : s.trimEnd() + `\n${k}=${v}\n`;
  }
  writeFileSync(file, s);
  console.log(`updated ${path.relative(root, file)}`);
}

upsert(path.join(root, "web", ".env.local"), path.join(root, "web", ".env.example"), {
  NEXT_PUBLIC_CHAIN: p.chain,
  NEXT_PUBLIC_LAUNCHPAD_ADDRESS: dep.launchpad,
  NEXT_PUBLIC_START_BLOCK: dep.startBlock,
  NEXT_PUBLIC_LOG_CHUNK: p.chunk,
});
upsert(path.join(root, "indexer", ".env.local"), path.join(root, "indexer", ".env.example"), {
  PONDER_RPC_URL: p.rpc,
  CHAIN_ID: chainId,
  LAUNCHPAD_ADDRESS: dep.launchpad,
  START_BLOCK: dep.startBlock,
});
console.log(`\nNow on ${p.chain}: launchpad ${dep.launchpad} from block ${dep.startBlock}. Restart the dev server.`);
