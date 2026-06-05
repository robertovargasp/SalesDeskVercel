import { createClient } from '@/lib/supabase/client';
import { mapProduct } from '@/lib/supabase/mappers';
import type { Product } from '@/lib/types';

const supabase = createClient();

export const productsService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data?.map(mapProduct) ?? [];
  },

  async create(p: Omit<Product, 'id'>, id: string) {
    return supabase.from('products').insert({
      id,
      name: p.name,
      price: p.price,
      default_commission: p.defaultCommission,
      min_stock: p.minStock ?? 4,
      description: p.description ?? null,
    });
  },

  async update(p: Product) {
    return supabase.from('products').update({
      name: p.name,
      price: p.price,
      default_commission: p.defaultCommission,
      min_stock: p.minStock ?? 4,
      description: p.description ?? null,
    }).eq('id', p.id);
  },

  async delete(id: string) {
    return supabase.from('products').delete().eq('id', id);
  },
};
