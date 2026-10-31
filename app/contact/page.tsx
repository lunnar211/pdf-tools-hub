import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { CONTACT_EMAIL } from "@/lib/site";
export const metadata: Metadata = { title: "Contact | PDF Tools Hub", description: "Contact PDF Tools Hub." };
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Contact</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Tell us about a problem with a conversion, a tool you would like added, or a mistake on a page.</p>
      <div className="mt-6"><ContactForm email={CONTACT_EMAIL} /></div>
    </main>
  );
}
