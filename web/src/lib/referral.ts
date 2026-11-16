"use client";

import { isAddress, type Address } from "viem";
import { ZERO_ADDR } from "./data";

const KEY = "ref";

/** Call once on page load: stores ?ref=0x... so referrers earn 10% of the protocol share. */
export function captureReferral() {
  try {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r && isAddress(r)) localStorage.setItem(KEY, r);
  } catch {}
}

export function getReferral(): Address {
  try {
    const r = localStorage.getItem(KEY);
    if (r && isAddress(r)) return r as Address;
  } catch {}
  return ZERO_ADDR as Address;
}
