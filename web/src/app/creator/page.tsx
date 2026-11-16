import { redirect } from "next/navigation";

// Old URL: the creator page is now part of /wallet. Keeps ?address= links working.
export default async function Page({ searchParams }: { searchParams: Promise<{ address?: string }> }) {
  const { address } = await searchParams;
  redirect(address ? `/wallet?address=${encodeURIComponent(address)}` : "/wallet");
}
