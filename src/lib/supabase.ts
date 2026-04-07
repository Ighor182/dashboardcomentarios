import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('URL ou Chave do Supabase não configuradas no .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
