import { redirect } from "next/navigation";
import { isAddress } from "viem";
import { isPrelaunch } from "@/lib/chain";
import { CoinPage } from "@/components/coin/CoinPage";

export default async function Page({ params }: { params: Promise<{ address: string }> }) {
  if (isPrelaunch) redirect("/");
  const { address } = await params;
  if (!isAddress(address)) redirect("/");
  return <CoinPage token={address} />;
}
