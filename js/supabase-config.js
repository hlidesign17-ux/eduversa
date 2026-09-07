import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Ganti dengan URL dan ANON KEY dari Dashboard Supabase kamu
const SUPABASE_URL = "https://rdkypbvugohxnhvnznlq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xilybvsXaGfFM3lYhGKhGA_GZ8JWjTT";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
