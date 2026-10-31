import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
export const metadata: Metadata = { title: "Cookie Policy | PDF Tools Hub", description: "Cookie Policy for PDF Tools Hub." };
export default function Page() {
  return (
    <LegalPage title="Cookie Policy">
      <P>We use as few cookies as possible. Nothing here tracks you across other websites.</P>
      <H>Essential cookies (always on)</H>
      <P>Sign-in session cookies from Auth.js keep you signed in and carry your plan and admin/TOTP state inside an encrypted token. The theme preference (light/dark) is stored locally in your browser. Without these, sign-in and theme choice cannot work.</P>
      <H>Analytics (only after you accept)</H>
      <P>Vercel Analytics loads only after you press Accept in the cookie banner. It counts page views in aggregate; it does not follow you to other sites. Declining means it never loads.</P>
      <H>Advertising (only after you accept, and only if approved)</H>
      <P>Google AdSense loads only after cookie consent, only if an AdSense publisher id is set after approval, and only on public pages. Ads never appear on sign-in, admin, account, or empty pages, and ad slots can be switched off by an admin at any time.</P>
      <H>Your choice</H>
      <P>The banner stores your choice in your browser (accepted or declined). Clearing your browser storage brings the banner back. The tools work identically whether you accept or decline.</P>
    </LegalPage>
  );
}
