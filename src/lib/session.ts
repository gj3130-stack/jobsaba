import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/models";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function getSession() {
  const supabase = await createServerSupabase();
  if (!supabase) return { supabase: null, user: null, profile: null as Profile | null };
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: row } = await supabase
    .from("profiles")
    .select("id,email,name,phone,role,status,marketing_agreed")
    .eq("id", user.id)
    .maybeSingle();
  const record = asRecord(row);
  const profile: Profile | null = record
    ? {
        id: String(record.id),
        email: typeof record.email === "string" ? record.email : user.email ?? null,
        name: typeof record.name === "string" ? record.name : "",
        phone: typeof record.phone === "string" ? record.phone : null,
        role: typeof record.role === "string" ? record.role : "customer",
        status: typeof record.status === "string" ? record.status : "active",
        marketingAgreed: record.marketing_agreed === true,
      }
    : null;
  return { supabase, user, profile };
}

export async function requireAdmin() {
  const session = await getSession();
  const allowed = session.profile?.role === "admin" && session.profile.status === "active";
  return { ...session, allowed };
}
