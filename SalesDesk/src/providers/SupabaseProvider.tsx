'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface SupabaseContextType {
  supabase: SupabaseClient;
  user: User | null;
  isUserLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Singleton client — creado una sola vez fuera del componente
const supabase = createClient();

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsUserLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsUserLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase, user, isUserLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabase debe usarse dentro de SupabaseProvider');
  return ctx;
}

export function useUser() {
  const { user, isUserLoading } = useSupabase();
  return { user, isUserLoading, userError: null };
}
