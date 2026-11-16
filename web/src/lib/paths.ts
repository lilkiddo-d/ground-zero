import { existsSync } from "node:fs";
import path from "node:path";

/** The web app's folder, whether Next was started from web/ or from the repo root (`next dev web`). */
export const webRoot = existsSync(path.join(process.cwd(), "next.config.mjs")) ? process.cwd() : path.join(process.cwd(), "web");
