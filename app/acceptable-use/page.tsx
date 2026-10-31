import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
export const metadata: Metadata = { title: "Acceptable Use | PDF Tools Hub", description: "Acceptable Use for PDF Tools Hub." };
export default function Page() {
  return (
    <LegalPage title="Acceptable Use">
      <P>PDF Tools Hub processes files, not prompts. That shapes what moderation means here — honestly stated, not overstated.</P>
      <H>What moderation actually is on this site</H>
      <P>Every upload is checked by file type (MIME) and by magic bytes (the file&apos;s real first bytes, not its extension), plus a size limit per tool. Files that fail those checks are rejected with a plain message. Signed-in conversions record metadata only (tool, success/failure, short input summary) so abuse patterns can be reviewed; file contents are never stored and never appear in any admin view. Admins can block an abusive IP address or suspend an account, and rate limits apply to everyone.</P>
      <H>What we do not claim</H>
      <P>This site has no prompt moderation, because there are no prompts: nobody types instructions that an AI follows here. Any page or claim suggesting otherwise would be wrong.</P>
      <H>Rules for using the tools</H>
      <P>Do not upload files you do not have the right to process; files containing malware or illegal material; files meant to overload, probe, or break the service; or content that infringes someone else&apos;s rights. Do not try to bypass daily limits, access other users&apos; accounts or data, or use the service to send spam or to mislead others. Breaking these rules can lead to blocking or suspension, and illegal material may be reported where the law requires it.</P>
    </LegalPage>
  );
}
