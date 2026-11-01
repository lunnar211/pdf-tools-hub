// Supabase browser client (public anon key only — safe to ship to browsers).
// Returns null when the env vars are unset so every caller can show the
// honest "not configured" state instead of crashing.
"use client";
import { createBrowserClient } from "@supabase/ssr";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

// Full sign-out: clears the browser Supabase session AND, via the server
// route, the server cookies and the admin TOTP cookie. Callers then
// navigate (e.g. window.location.href = "/") so no stale state renders.
export async function signOutBrowser(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    await supabase.auth.signOut().catch(() => null);
  }
  await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
}
