// Job recording + daily quota counting. Best-effort: a DB failure must
// never break a conversion. Job rows older than 90 days are deleted by the
// cleanup route (documented retention policy); file contents are NEVER stored,
// only tool + status + a short input summary (filename, never content).
import { prisma } from "./prisma";

export async function recordJob(opts: {
  userId?: string | null;
  tool: string;
  status: "SUCCESS" | "FAILED";
  inputSummary?: string;
  errorCode?: string;
}): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.job.create({
      data: {
        userId: opts.userId ?? null,
        tool: opts.tool,
        status: opts.status,
        inputSummary: opts.inputSummary?.slice(0, 200) ?? null,
        errorCode: opts.errorCode ?? null,
      },
    });
  } catch {
    // Never break the tool for a logging failure.
  }
}

export async function countJobsToday(userId: string): Promise<number> {
  if (!prisma) return 0;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  try {
    return await prisma.job.count({ where: { userId, createdAt: { gte: start } } });
  } catch {
    return 0;
  }
}

// Record a job for the currently signed-in user (resolved by session email).
// Guests produce no row (userId stays null via recordJob callers); this helper
// simply no-ops for guests or when the DB is unset.
export async function recordCurrentUserJob(tool: string, status: "SUCCESS" | "FAILED", inputSummary?: string): Promise<void> {
  if (!prisma || !process.env.AUTH_SECRET) return;
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    await recordJob({ userId: user.id, tool, status, inputSummary });
  } catch {
    // never break the tool
  }
}

// Retention: delete Job rows older than 90 days. Returns rows deleted (0 when DB unset).
export async function cleanupOldJobs(): Promise<number> {
  if (!prisma) return 0;
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const res = await prisma.job.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return res.count;
}
