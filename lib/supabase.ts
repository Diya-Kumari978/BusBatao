import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  publicClient ??= createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return publicClient;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export function hasDatabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSupabaseAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { status?: number; message?: string; code?: string };
  return value.status === 401 || /invalid api key|invalid jwt|jwt expired|unauthorized/i.test(value.message || "") || value.code === "PGRST301";
}
