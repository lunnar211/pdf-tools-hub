import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
export const metadata: Metadata = { title: "DMCA | PDF Tools Hub", description: "DMCA notice procedure for PDF Tools Hub." };
export default function Page() {
  return (
    <LegalPage title="DMCA — Copyright Notices">
      <P>PDF Tools Hub does not host a public library of files: conversions are processed for the uploader and not stored or published. If you believe material processed through this service infringes your copyright, you can still send a notice and we will act on valid ones.</P>
      <H>What a valid notice needs</H>
      <P>Your notice should include: (1) identification of the copyrighted work claimed to be infringed; (2) identification of the material claimed to be infringing, with enough detail for us to locate it (for this service, that means the tool, the time, and any identifiers you have — note that files themselves are not stored, so we may only be able to act on account-level information); (3) your contact information; (4) a statement that you have a good-faith belief the use is not authorized by the owner, its agent, or the law; (5) a statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act for the owner; and (6) your physical or electronic signature.</P>
      <H>Where to send it</H>
      <P>Send notices through the <a href="/contact" className="underline">contact page</a>, with &quot;DMCA notice&quot; in the subject. Counter-notices from a user who believes material was wrongly restricted should include the same identification details plus a statement of good-faith belief and consent to jurisdiction, and we will forward valid counter-notices as the law requires.</P>
      <H>Repeat infringers</H>
      <P>Accounts found to repeatedly process infringing material may be suspended or terminated.</P>
    </LegalPage>
  );
}
