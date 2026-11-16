import { isPrelaunch } from "@/lib/chain";
import { LaunchForm } from "@/components/LaunchForm";
import { Landing } from "@/components/landing/Landing";

// The site opens straight on the launch form. Browsing coins lives at /discover.
export default function Page() {
  return isPrelaunch ? <Landing /> : <LaunchForm />;
}
