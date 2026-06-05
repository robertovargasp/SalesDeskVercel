import { createClient } from '@/lib/supabase/client';
import { mapSale } from '@/lib/supabase/mappers';
import type { Sale, SaleStatus } from '@/lib/types';

const supabase = createClient();

export const ordersService = {
  async getAll(role: string, uid: string): Promise<Sale[]> {
    const q = supabase.from('orders').select(`
      *,
      order_items(*),
      order_events(*)
    `).order('created_at', { ascending: false });

    const filtered =
      role === 'delivery' ? q.eq('delivery_person_id', uid) :
      role === 'seller'   ? q.eq('seller_id', uid) :
      q;

    const { data, error } = await filtered;
    if (error) throw error;
    return data?.map(mapSale) ?? [];
  },

  async updateStatus(orderId: string, status: SaleStatus, fields?: Record<string, unknown>) {
    return supabase.from('orders').update({ status, ...fields }).eq('id', orderId);
  },

  async addEvent(orderId: string, type: string, userId: string | null, userName: string, note: string) {
    return supabase.from('order_events').insert({
      order_id: orderId, type, user_id: userId, user_name: userName, note,
    });
  },

  async delete(orderId: string) {
    return supabase.from('orders').delete().eq('id', orderId);
  },
};
