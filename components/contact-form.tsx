"use client";
import { useState } from "react";
import { Button } from "./ui/button";
export function ContactForm({ email }: { email: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  if (!email) {
    return (
      <div role="status" className="rounded-xl border-2 border-[#ea580c] bg-orange-50 p-5 dark:bg-orange-950">
        <p className="font-bold">Contact email not configured yet</p>
        <p className="mt-1 text-slate-700 dark:text-slate-200">The contact address for this site has not been set up yet, so this form is disabled. Please check back soon.</p>
      </div>
    );
  }
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
      <div>
        <label htmlFor="subject" className="block font-bold">Subject</label>
        <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required
          className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" />
      </div>
      <div>
        <label htmlFor="message" className="block font-bold">Message</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={6}
          className="mt-1 w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">This opens your own email app addressed to {email}. Nothing is sent from this website directly, and no message is stored here.</p>
      <a href={href} className="inline-flex min-h-[44px] items-center rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]">Open email to send</a>
    </form>
  );
}
