import { redirect } from "next/navigation";
import { isPrelaunch } from "@/lib/chain";
import { PointsPage } from "@/components/PointsPage";

export const metadata = { title: "Points" };

export default function Page() {
  if (isPrelaunch) redirect("/");
  return <PointsPage />;
}
