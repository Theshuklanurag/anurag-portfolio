// ─────────────────────────────────────────────
//  STEP 1 — Paste your Supabase project details
//  Go to: https://supabase.com/dashboard
//  → Your Project → Settings → API
// ─────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dkhbslhfkbobgvkkemlv.supabase.co";
const SUPABASE_KEY = "sb_publishable__ZmH3eQZqTudYgOtOQQ_cw_hYcvMDUx";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);