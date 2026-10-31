import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
export const metadata: Metadata = { title: "Refund Policy | PDF Tools Hub", description: "Refund Policy for PDF Tools Hub." };
export default function Page() {
  return (
    <LegalPage title="Refund Policy">
      <P>Premium is billed by Paddle Billing, our merchant of record. Paddle processes the payment and issues the receipt; this site never holds your card details.</P>
      <H>How to ask for a refund</H>
      <P>Write to us through the <a href="/contact" className="underline">contact page</a> with the email address used at checkout and the transaction or invoice id from your Paddle receipt. Each request is reviewed on its own facts — for example, a charge made in error, a duplicate payment, or a Premium feature that verifiably did not work.</P>
      <H>What a refund covers</H>
      <P>If a refund is granted, it returns the product price you paid. Paddle does NOT refund its own fee on refunds, so that fee is not part of any refund — this is Paddle&apos;s rule, not a choice of this site. Refunds, when granted, go back to the original payment method through Paddle.</P>
      <H>Cancelling instead</H>
      <P>You can cancel Premium at any time; cancelling stops future billing and your Premium access normally continues until the end of the period already paid for. Cancelling is not the same as a refund for the current period.</P>
      <H>Free tier</H>
      <P>The free tier costs nothing, so there is nothing to refund for it.</P>
    </LegalPage>
  );
}
