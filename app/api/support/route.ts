import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Contact form submission: stored as a SupportMessage for the admin inbox.
// No SMTP is configured for this site, so replies happen from the admin inbox
// via a mailto link (documented); nothing here pretends an email was sent.
const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Please fill in every field correctly." }, { status: 400 });
  if (!prisma) {
    // Honest fallback: without a DB there is nowhere to store the message.
    return Response.json({ error: "Support inbox is not configured yet. Please use the email link on the contact page." }, { status: 503 });
  }
  const row = await prisma.supportMessage.create({ data: parsed.data });
  return Response.json({ ok: true, id: row.id });
}
