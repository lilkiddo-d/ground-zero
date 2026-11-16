import { brand } from "@/config/brand";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of use" };

export default function Page() {
  return (
    <LegalPage title="Terms of use">
      <h2>1. What {brand.name} is</h2>
      <p>{brand.name} is a website that lets anyone create and trade coins through public smart contracts on the Zero network. The website is an interface to those contracts. We do not hold your funds, cannot reverse transactions and cannot recover lost wallets.</p>
      <h2>2. Your responsibilities</h2>
      <p>You are responsible for your wallet, your keys and every transaction you sign. You confirm that you are of legal age, that using this service is lawful where you live, and that you are not on any sanctions list.</p>
      <h2>3. Coins created by users</h2>
      <p>Coins are created by users, not by {brand.name}. We do not review, endorse or guarantee any coin, its creator or its description. You must not create coins that impersonate others, infringe rights, or are used for fraud or illegal content. We may hide such coins from this website, but we cannot change or remove them from the blockchain.</p>
      <h2>4. Fees</h2>
      <p>Trades and launches pay the fees shown on the site and in the docs. Fees are enforced by the smart contracts and may change for new launches.</p>
      <h2>5. No warranty</h2>
      <p>The service is provided “as is”, without warranties of any kind. Smart contracts can contain bugs. To the maximum extent allowed by law, {brand.name} is not liable for any loss arising from your use of the service.</p>
      <h2>6. Changes</h2>
      <p>We may update these terms. Continuing to use the site after an update means you accept the new terms.</p>
    </LegalPage>
  );
}
