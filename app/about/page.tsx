import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
export const metadata: Metadata = { title: "About PDF Tools Hub | PDF Tools Hub", description: "About PDF Tools Hub." };
export default function Page() {
  return (
    <LegalPage title="About PDF Tools Hub">
      <P>PDF Tools Hub is a small set of free, everyday PDF tools: convert PDF to Word, Word to PDF, images to PDF, merge PDFs, split PDFs, and compress PDFs. No account is needed for the free tier.</P>
      <H>How it works</H>
      <P>You upload a file, the server converts it, and you download the result. Files are not stored and are never listed or shared. Uploads are checked by file type and by their real first bytes, with a size limit per tool.</P>
      <H>Accounts and Premium</H>
      <P>Signing in with Google (optional) raises your daily limit, keeps a job history, and gives you an account page where you can export or delete your data. Premium, billed by Paddle, raises limits further and removes ads. This site never sees your card details.</P>
      <H>Sister projects</H>
      <P>PDF Tools Hub is built alongside AI Studio (AI tools) and LeadsForceGen (lead generation). Each site has its own sign-in, but they share one user database — see the <a href="/privacy" className="underline">Privacy Policy</a> for what that means.</P>
    </LegalPage>
  );
}
