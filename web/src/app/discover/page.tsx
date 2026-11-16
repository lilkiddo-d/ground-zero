import { redirect } from "next/navigation";
import { isPrelaunch } from "@/lib/chain";
import { Discover } from "@/components/Discover";

export const metadata = { title: "Discover" };

export default function Page() {
  if (isPrelaunch) redirect("/");
  return <Discover />;
}
