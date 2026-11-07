import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
export const metadata: Metadata = { title: "Terms of Use | PDF Tools Hub", description: "Terms of Use for PDF Tools Hub." };
export default function Page() {
  return (
    <LegalPage title="Terms of Use">
      <P>By using PDF Tools Hub you agree to these terms. If you do not agree, do not use the site.</P>
      <H>The service</H>
      <P>PDF Tools Hub provides browser-based PDF tools: PDF to Word, Word to PDF, image to PDF, merge, split, and compress. The free tier works without an account (around 20 conversions a day per guest as a fair-use guideline by default). Signed-in free accounts get a higher, tracked daily limit; Premium raises it further and removes ads. Limits, tool availability, and maintenance windows can change; a tool switched off or in maintenance answers with a plain message, not a silent failure.</P>
      <H>Accounts and age</H>
      <P>Sign-in is Google-only. You must complete onboarding (date of birth + confirmation + Terms acceptance) before signed-in features activate. Under 13: the account is deleted and no data is kept (COPPA and the GDPR-K lower bound). Ages 13–15: the account cannot be activated. Ages 16–17: free account only, paid checkout blocked (16 is the GDPR default digital-consent age and the conservative alignment, since Nepal&apos;s Privacy Act 2018 sets no fixed digital-consent age). Age 18 or over: paid plans allowed (contractual capacity). You are responsible for keeping your Google account secure; we cannot recover it for you.</P>
      <H>Premium and payments</H>
      <P>Premium is billed by Paddle Billing as merchant of record, through Paddle&apos;s hosted checkout. Prices and billing periods are shown at checkout and in Paddle&apos;s receipts. This site never collects card details. Refunds follow the <a href="/refund-policy" className="underline">Refund Policy</a>. Cancelling stops future billing; access normally continues until the end of the paid period.</P>
      <H>Your files and your responsibility</H>
      <P>You must have the right to convert the files you upload. Do not upload files that are illegal, that contain malware, or that you do not have the right to process. Files are processed only to produce your conversion and are not stored. We are not responsible for the content of your files or for any loss caused by converting a file you did not have the right to use. See the <a href="/acceptable-use" className="underline">Acceptable Use</a> page.</P>
      <H>Fair use and abuse</H>
      <P>Daily limits exist so the free tier stays available for everyone. Attempts to bypass limits, overload the service, probe other users&apos; data, or use the service for spam or wrongdoing may lead to rate limiting, IP blocking, or account suspension without notice.</P>
      <H>Availability and liability</H>
      <P>The service is provided &quot;as is&quot;, without warranties of any kind. We aim for reliable conversions but do not guarantee uninterrupted availability or that any particular conversion will be perfect for your purpose — always check important output files before relying on them. To the fullest extent allowed by law, our liability is limited to the amount you paid us in the 12 months before the claim (or nothing, if you used only the free tier).</P>
      <H>Changes and contact</H>
      <P>These terms may change; the current version on this page applies. Questions go through the <a href="/contact" className="underline">contact page</a>.</P>
    </LegalPage>
  );
}
