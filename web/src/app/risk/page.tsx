import { brand } from "@/config/brand";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Risk disclosure" };

export default function Page() {
  return (
    <LegalPage title="Risk disclosure">
      <p>Read this before you trade. Coins on {brand.name} are experimental and extremely risky.</p>
      <ul>
        <li><b>You can lose everything.</b> Most coins go to zero. Prices can move 90% or more in minutes.</li>
        <li><b>Anyone can launch.</b> Creators may be anonymous, may sell their coins, or may abandon the project.</li>
        <li><b>Copies and impersonation.</b> A coin with a familiar name or ticker is not necessarily the original.</li>
        <li><b>Smart contract risk.</b> The contracts may contain bugs. Until audited, treat them as unaudited software.</li>
        <li><b>Transactions are final.</b> Sending to a wrong address or signing a bad transaction cannot be undone.</li>
        <li><b>Network risk.</b> Zero is a new network. Outages, congestion or changes can affect trading.</li>
        <li><b>Legal and tax.</b> Rules differ by country. You are responsible for following them and for any taxes.</li>
      </ul>
      <p>Nothing on {brand.name} is financial, investment or legal advice. Only use money you can afford to lose.</p>
    </LegalPage>
  );
}
