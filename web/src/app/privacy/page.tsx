import { brand } from "@/config/brand";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <LegalPage title="Privacy policy">
      <h2>What we collect</h2>
      <p>{brand.name} does not ask for your name or email. When you connect a wallet, your public wallet address is visible to the site, as it is to everyone on the blockchain. If you join the early list, we store the wallet address and the optional X handle you enter.</p>
      <h2>Images and coin details</h2>
      <p>Images and descriptions you upload when launching a coin are published publicly (for example on IPFS) and cannot be deleted from there.</p>
      <h2>Stored in your browser</h2>
      <p>We store small settings in your browser, such as whether you accepted the welcome notice and your referral code. We do not use advertising trackers.</p>
      <h2>Blockchain data</h2>
      <p>Transactions on Zero are public and permanent. We cannot hide or delete them.</p>
      <h2>Contact</h2>
      <p>Questions about privacy: reach us on X at @{brand.x}.</p>
    </LegalPage>
  );
}
