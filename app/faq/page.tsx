import type { Metadata } from "next";
import { LegalPage, H, P } from "@/components/legal-page";
import { SITE_URL } from "@/lib/site";

// The /faq page: the same five questions already published on the homepage
// ("Questions people ask"), in one linkable place with FAQ schema.
export const metadata: Metadata = {
  title: "FAQ | PDF Tools Hub",
  description:
    "Frequently asked questions about PDF Tools Hub: is it free, are my files kept, what file sizes work, and why there is no password protection.",
  alternates: { canonical: `${SITE_URL}/faq` },
};

const faqs: { q: string; a: string }[] = [
  {
    q: "Is PDF Tools Hub really free?",
    a: "Yes, for everyday use: around 20 conversions a day for guests as a fair-use guideline, no account needed. Signing in (free) gives a tracked 100 a day. Premium raises the limit to 1,000 a day and removes ads — see Pricing. Payments go through Paddle's secure checkout; nothing on this site collects payment details.",
  },
  {
    q: "Do you keep my files?",
    a: "No. Browser tools never upload your files at all. Server tools process them in memory only — nothing is written to disk — and they are gone when the response ends. They are never listed publicly or shared.",
  },
  {
    q: "What size files can I convert?",
    a: "PDFs up to 25 MB, and images up to 10 MB each (max 20 per request).",
  },
  {
    q: "Will a PDF to Word conversion look identical?",
    a: "No — text is preserved and larger text becomes headings, but layout, images and tables are approximated. Each tool page states its fidelity limit plainly.",
  },
  {
    q: "Can I password-protect or unlock a PDF here?",
    a: "No, and that is deliberate. Real PDF encryption is not supported by the libraries this site uses (pdf-lib cannot encrypt or open encrypted PDFs), so a password field here would be fake security. No fake lock is offered.",
  },
];

export default function Page() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <LegalPage title="Frequently asked questions">
        <P>
          The answers below are the same ones shown on the homepage. Still stuck?{" "}
          <a href="/contact" className="underline">Contact us</a>.
        </P>
        {faqs.map((f) => (
          <div key={f.q}>
            <H>{f.q}</H>
            <P>{f.a}</P>
          </div>
        ))}
      </LegalPage>
    </>
  );
}
