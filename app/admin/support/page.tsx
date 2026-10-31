import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh } from "@/lib/admin";
import { replySupport, closeSupport } from "../actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  const canReply = admin.adminRole === "SUPER" || admin.adminRole === "SUPPORT";
  if (!prisma) {
    return <main><h1 className="text-3xl font-extrabold">Support inbox</h1><p role="status" className="mt-4">Database not configured yet.</p></main>;
  }
  const messages = await prisma.supportMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []);
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Support inbox</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        No SMTP is configured for this site, so replies are recorded here and sent via your own email app using the
        mailto link. Automated sending needs a future SMTP/Brevo setup — it is not claimed here.
      </p>
      {messages.length === 0 ? (
        <p role="status" className="mt-4 text-slate-600 dark:text-slate-300">No messages yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {messages.map((m) => (
            <li key={m.id} className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
              <p className="font-bold">{m.subject} <span className="font-normal text-slate-500">— {m.name} ({m.email}) — {m.status}</span></p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{m.createdAt.toISOString().slice(0, 16)}</p>
              <p className="mt-2 whitespace-pre-wrap">{m.message}</p>
              {m.reply && <p className="mt-3 rounded-lg bg-teal-50 p-3 text-sm dark:bg-teal-950">Reply on file: {m.reply}</p>}
              <p className="mt-3 text-sm">
                <a className="underline" href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}&body=${encodeURIComponent(m.reply ?? "")}`}>
                  Open mailto reply
                </a>
              </p>
              {canReply && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <form action={replySupport.bind(null, m.id)} className="flex flex-1 flex-wrap gap-2">
                    <label htmlFor={`reply-${m.id}`} className="sr-only">Reply</label>
                    <input id={`reply-${m.id}`} name="reply" required placeholder="Write the reply to record" className="min-h-[44px] flex-1 rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" />
                    <Button type="submit">Record reply</Button>
                  </form>
                  <form action={closeSupport.bind(null, m.id)}><Button variant="outline" type="submit">Close</Button></form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
