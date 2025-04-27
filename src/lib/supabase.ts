
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add logging to help diagnose the issue
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey);

// Add error checking
if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is not defined');
  throw new Error('Supabase URL is required. Please set VITE_SUPABASE_URL in your environment variables.');
}

if (!supabaseAnonKey) {
  console.error('VITE_SUPABASE_ANON_KEY is not defined');
  throw new Error('Supabase Anon Key is required. Please set VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
