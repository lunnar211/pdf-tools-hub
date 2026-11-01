// Supabase server helpers: session reading + Prisma User mapping.
// Identity lives in Supabase Auth (existing "LeadForge" project, Google
// provider already configured there); the Prisma User row is the site's own
// profile (role, plan, status, age gate, TOTP) and is keyed to the Auth user
// by the additive `supabaseId` column, falling back to email for rows that
// predate the Supabase switch. First-login upsert happens in
// /auth/callback; getCurrentUser() also lazily upserts so a callback that
// ran while the DB was down self-heals on the next request instead of
// stranding a signed-in user with no profile row.
// Never imports anything client-only; safe in server components, route
// handlers, and server actions. Returns nulls (never throws) when Supabase
// or the DB is unconfigured, preserving guest mode.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { adminEmails } from "@/lib/security";

export function supabaseServerConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // setAll from a server component is a no-op by Next.js design;
          // the proxy refreshes cookies on the response instead.
        }
      },
    },
  });
}

export async function getSupabaseUser(): Promise<SupabaseUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export type DbUser = NonNullable<Awaited<ReturnType<typeof ensureDbUser>>>;

export async function ensureDbUser(supabaseUser: SupabaseUser) {
  if (!prisma) return null;
  const email = (supabaseUser.email ?? "").toLowerCase();
  if (!email) return null;
  const name = (supabaseUser.user_metadata?.full_name as string | undefined)
    ?? (supabaseUser.user_metadata?.name as string | undefined)
    ?? null;
  const image = (supabaseUser.user_metadata?.avatar_url as string | undefined)
    ?? (supabaseUser.user_metadata?.picture as string | undefined)
    ?? null;
  try {
    let dbUser = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } });
    if (!dbUser) {
      dbUser = await prisma.user.findUnique({ where: { email } });
    }
    const allowlisted = adminEmails().includes(email);
    if (dbUser) {
      const needsLink = dbUser.supabaseId !== supabaseUser.id;
      const needsAdmin = allowlisted && !dbUser.adminRole;
      // No lastLoginAt write here: this runs on every authenticated request
      // and must stay a cheap read-or-link, not a write per page view.
      // /auth/callback stamps lastLoginAt once per actual sign-in.
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          ...(needsLink ? { supabaseId: supabaseUser.id } : {}),
          ...(needsAdmin ? { role: "ADMIN", adminRole: "SUPER" } : {}),
          ...(name && !dbUser.name ? { name } : {}),
          ...(image && !dbUser.image ? { image } : {}),
        },
      });
      return dbUser;
    }
    return await prisma.user.create({
      data: {
        supabaseId: supabaseUser.id,
        email,
        name,
        image,
        role: allowlisted ? "ADMIN" : "USER",
        adminRole: allowlisted ? "SUPER" : null,
        lastLoginAt: new Date(),
      },
    });
  } catch {
    return null;
  }
}

// The single current-user resolver for server code: Supabase identity +
// Prisma profile. `dbUser` is null when the DB is unset or unreachable;
// callers must handle that (guest / not-configured states), not crash.
export async function getCurrentUser(): Promise<{
  supabaseUser: SupabaseUser | null;
  dbUser: Awaited<ReturnType<typeof ensureDbUser>>;
}> {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return { supabaseUser: null, dbUser: null };
  const dbUser = await ensureDbUser(supabaseUser);
  return { supabaseUser, dbUser };
}
