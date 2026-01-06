import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Example auth functions
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Example data function
export const fetchData = async (table: string) => {
  const { data, error } = await supabase.from(table).select('*');
  return { data, error };
};

// Subscribe to real-time changes
export const subscribeToRealtime = (table: string, callback: (payload: any) => void) => {
  return supabase
    .channel('realtime changes')
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
};
