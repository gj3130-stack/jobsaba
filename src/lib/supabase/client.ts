"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

export function createBrowserSupabase() {
  const { url, anonKey, configured } = supabaseEnv();
  if (!configured) return null;
  return createBrowserClient(url, anonKey);
}
