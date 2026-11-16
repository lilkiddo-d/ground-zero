import { Landing } from "@/components/landing/Landing";

// Always shows the pre-launch landing (at / it only shows when NEXT_PUBLIC_PRELAUNCH=true).
export const metadata = { title: "Welcome" };
export default function Page() {
  return <Landing />;
}
