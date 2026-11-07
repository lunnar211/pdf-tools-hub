import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
export const metadata: Metadata = { title: "Privacy Policy | PDF Tools Hub", description: "Privacy Policy for PDF Tools Hub." };
export default function Page() {
  return (
    <LegalPage title="Privacy Policy">
      <P>PDF Tools Hub is a set of free PDF tools (convert, merge, split, compress). You can use every tool without an account. This policy explains what we collect, why, and what you can do about it.</P>
      <H>What we collect</H>
      <P><strong>Files you convert.</strong> Browser tools convert your file on your own device — it is never uploaded. Server tools send your file to our server, convert it, and return it to you. File contents are never stored, never listed, and never shared. Processing copies are deleted immediately after conversion.</P>
      <P><strong>Account data (only if you sign in).</strong> Sign-in is Google-only, with minimal scopes (openid, email, profile). Google gives us your name, email address, and profile photo — we never see your Google password. If you complete onboarding we also store your date of birth (self-declared; no ID document is ever asked for) and the timestamps of your age confirmation and Terms acceptance.</P>
      <P><strong>Job metadata (only if you sign in).</strong> For signed-in conversions we record the tool used, success or failure, and a short input summary such as a filename — never file contents. Job rows are deleted after 90 days.</P>
      <P><strong>Payments.</strong> Payments are handled by Paddle Billing, our merchant of record. Paddle collects payment details on its own checkout pages. This site never sees, stores, or processes card numbers; we store only Paddle customer, subscription, transaction, and invoice identifiers, plus amount, currency, and status.</P>
      <P><strong>Support messages.</strong> Messages sent through the contact form are stored so the support inbox can answer them.</P>
      <P><strong>Technical data.</strong> We store only hashed IP addresses (SHA-256 with a server-side salt), never raw IPs, for rate limiting and abuse blocking. Server error logs record the failing page and a short message, not your files.</P>
      <H>Third parties that actually process data here</H>
      <P>Google (sign-in only), Paddle (payments only), Vercel (hosting), and optionally Upstash (rate limiting, when configured). Vercel Analytics loads only after you accept cookies. Google AdSense loads only after cookie consent, only if it is approved and enabled — and never on sign-in, admin, account, or empty pages. There are no AI providers on this site: no file or prompt is sent to any AI service.</P>
      <H>Cookies</H>
      <P>Essential cookies keep sign-in working. Analytics and advertising cookies load only after you accept them in the cookie banner; declining changes nothing about the tools. See the <a href="/cookies" className="underline">Cookie Policy</a>.</P>
      <H>Your rights</H>
      <P>On the <a href="/account" className="underline">account page</a> you can export your data as JSON (profile, jobs, subscriptions, payments) and delete your account and data permanently. Deletion removes your profile, jobs, subscriptions, payments, internal notes, and audit rows about you. These controls are designed to align with GDPR/CCPA-style data rights and with Nepal&apos;s Privacy Act 2018 and Electronic Transactions Act 2000. If you cannot sign in, contact us through the <a href="/contact" className="underline">contact page</a> and we will help.</P>
      <H>Children and age</H>
      <P>Accounts under 13 are deleted, not kept. Accounts aged 13–15 cannot be activated. Ages 16–17 get a free account only; paid plans need age 18 or over. See the <a href="/terms" className="underline">Terms</a> for why these thresholds exist.</P>
      <H>Changes</H>
      <P>If this policy changes materially, the updated version will be posted here with a new effective note. Continued use after a change means you accept the new version.</P>
    </LegalPage>
  );
}
