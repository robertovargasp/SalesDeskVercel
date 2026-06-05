import { createClient } from '@/lib/supabase/client';
import { mapInventoryItem, mapAssignment } from '@/lib/supabase/mappers';
import type { InventoryItem, InventoryAssignment, AssignmentStatus } from '@/lib/types';

const supabase = createClient();

export const inventoryService = {
  async getItems(role: string, uid: string): Promise<InventoryItem[]> {
    const q = supabase.from('inventory_items').select('*');
    const filtered = role === 'seller' ? q.eq('seller_id', uid) : q;
    const { data, error } = await filtered;
    if (error) throw error;
    return data?.map(mapInventoryItem) ?? [];
  },

  async getAssignments(role: string, uid: string): Promise<InventoryAssignment[]> {
    const q = supabase.from('inventory_assignments').select('*').order('created_at', { ascending: false });
    const filtered = role === 'seller' ? q.eq('seller_id', uid) : q;
    const { data, error } = await filtered;
    if (error) throw error;
    return data?.map(mapAssignment) ?? [];
  },

  async upsertItem(id: string, productId: string, sellerId: string, quantity: number) {
    return supabase.from('inventory_items').upsert({
      id, product_id: productId, seller_id: sellerId, quantity,
    }, { onConflict: 'product_id,seller_id' });
  },

  async updateItemQuantity(itemId: string, quantity: number) {
    return supabase.from('inventory_items').update({ quantity }).eq('id', itemId);
  },

  async createAssignment(id: string, productId: string, sellerId: string, quantity: number, type: string, reason: string, status: AssignmentStatus) {
    return supabase.from('inventory_assignments').insert({
      id, product_id: productId, seller_id: sellerId,
      quantity, type, reason, status,
      created_at: new Date().toISOString(),
    });
  },
};
