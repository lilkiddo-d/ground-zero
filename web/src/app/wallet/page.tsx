import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isPrelaunch } from "@/lib/chain";
import { WalletPage } from "@/components/WalletPage";

export const metadata = { title: "Wallet" };

export default function Page() {
  if (isPrelaunch) redirect("/");
  return <Suspense><WalletPage /></Suspense>;
}
