import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const normalizeSupabaseUrl = (url: string) => url.replace(/\/rest\/v1\/?$/, "");

export const supabase = isSupabaseConfigured ? createClient(normalizeSupabaseUrl(supabaseUrl as string), supabaseAnonKey as string) : null;
