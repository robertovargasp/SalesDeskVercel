import { createClient } from '@/lib/supabase/client';
import { mapUser } from '@/lib/supabase/mappers';
import type { UserProfile } from '@/lib/types';

const supabase = createClient();

export const usersService = {
  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data?.map(mapUser) ?? [];
  },

  async getById(id: string): Promise<UserProfile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return data ? mapUser(data) : null;
  },

  async create(user: UserProfile) {
    return supabase.from('profiles').insert({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email ?? null,
      phone: user.phone ?? null,
      whatsapp: user.whatsapp ?? null,
      city: user.city,
      role: user.role,
      is_active: user.isActive,
      settlement_frequency: user.settlementFrequency,
      settlement_start_day: user.settlementStartDay,
    });
  },

  async update(user: UserProfile) {
    return supabase.from('profiles').update({
      name: user.name,
      username: user.username,
      email: user.email ?? null,
      phone: user.phone ?? null,
      whatsapp: user.whatsapp ?? null,
      city: user.city,
      role: user.role,
      is_active: user.isActive,
      settlement_frequency: user.settlementFrequency,
      settlement_start_day: user.settlementStartDay,
    }).eq('id', user.id);
  },

  async delete(id: string) {
    return supabase.from('profiles').delete().eq('id', id);
  },
};
