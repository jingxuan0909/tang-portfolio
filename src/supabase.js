import { createClient } from "@supabase/supabase-js";

// Vite reads these public Supabase connection values from the environment file.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// This flag lets the interface show a useful message when setup is incomplete.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
// One shared client handles database, authentication, and Storage requests.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
