import { createClient } from '@/lib/supabase/client';
import { mapSettlement } from '@/lib/supabase/mappers';
import type { WeeklySettlement } from '@/lib/types';

const supabase = createClient();

export const settlementsService = {
  async getAll(role: string, uid: string): Promise<WeeklySettlement[]> {
    const q = supabase.from('settlements').select('*').order('created_at', { ascending: false });
    const filtered = role === 'seller' ? q.eq('seller_id', uid) : q;
    const { data, error } = await filtered;
    if (error) throw error;
    return data?.map(mapSettlement) ?? [];
  },

  async create(id: string, settlement: {
    sellerId: string; weekRange: string; totalVenta: number;
    totalComision: number; totalDeposito: number; reference: string; proofUrl?: string;
  }) {
    return supabase.from('settlements').insert({
      id,
      seller_id: settlement.sellerId,
      week_range: settlement.weekRange,
      total_venta: settlement.totalVenta,
      total_comision: settlement.totalComision,
      total_deposito: settlement.totalDeposito,
      status: 'reported',
      reference: settlement.reference,
      proof_url: settlement.proofUrl ?? null,
      reported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  },

  async confirm(id: string) {
    return supabase.from('settlements').update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    }).eq('id', id);
  },
};
