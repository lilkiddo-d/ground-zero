import { redirect } from "next/navigation";
import { isPrelaunch } from "@/lib/chain";
import { LaunchForm } from "@/components/LaunchForm";

export const metadata = { title: "Launch" };

export default function Page() {
  if (isPrelaunch) redirect("/");
  return <LaunchForm />;
}
