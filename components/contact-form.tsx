"use client";
import { useState } from "react";
import { Button } from "./ui/button";

// Submits to /api/support (stored in the admin support inbox). If the inbox
// is not configured, the form falls back to a mailto link — it never claims
// a message was sent when it was not. No SMTP is configured for this site.
export function ContactForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${message}\n\n— ${name} (${from})`)}`
    : "";
  const inputCls = "mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800";
  return (
    <form
      className="space-y-4 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setStatus("");
        const res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email: from, subject, message }),
        });
        setBusy(false);
        if (res.ok) {
          setStatus("Message received. It is now in the support inbox and will be answered from there.");
          setName("");
          setFrom("");
          setSubject("");
          setMessage("");
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus(
            (data.error as string | undefined) ??
              "Could not store the message. Please use the email link below instead.",
          );
        }
      }}
    >
      <div>
        <label htmlFor="name" className="block font-bold">Your name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label htmlFor="email" className="block font-bold">Your email</label>
        <input id="email" type="email" value={from} onChange={(e) => setFrom(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label htmlFor="subject" className="block font-bold">Subject</label>
        <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label htmlFor="message" className="block font-bold">Message</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={6} className={inputCls} />
      </div>
      {status && <p role="status" className="text-slate-700 dark:text-slate-200">{status}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send message"}</Button>
      {mailto && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Prefer email? <a href={mailto} className="underline">Open your email app addressed to {email}</a>. No
          message is sent automatically from this website.
        </p>
      )}
    </form>
  );
}
