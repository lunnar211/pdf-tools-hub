import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CookieBanner } from "@/components/cookie-banner";
import { AnalyticsGate } from "@/components/analytics-gate";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SITE_URL } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PDF Tools Hub — Free PDF Tools Online",
  description: "Free PDF tools: convert PDF to Word, Word to PDF, images to PDF, merge, split and compress PDFs. No account needed for the free tier.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PDF Tools Hub — Free PDF Tools Online",
    description: "Free PDF tools: convert PDF to Word, Word to PDF, images to PDF, merge, split and compress PDFs.",
    type: "website",
    url: "/",
    images: [{ url: "/og/default.jpg", width: 1200, height: 630, alt: "PDF Tools Hub — free PDF tools online" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Tools Hub — Free PDF Tools Online",
    description: "Free PDF tools: convert PDF to Word, Word to PDF, images to PDF, merge, split and compress PDFs.",
    images: ["/og/default.jpg"],
  },
};

const websiteJson = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PDF Tools Hub",
  url: SITE_URL,
  description: "Free PDF tools: convert, merge, split and compress PDFs in your browser. No account needed for the free tier.",
};

export default function RootLayout({ children }: { children: import("react").ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJson) }} />
        <ThemeProvider>
          <AnnouncementBanner />
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
          <CookieBanner />
        </ThemeProvider>
        <AnalyticsGate />
      </body>
    </html>
  );
}
