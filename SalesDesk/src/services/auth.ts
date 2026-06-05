import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const authService = {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getSession() {
    return supabase.auth.getSession();
  },
};
