'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/SupabaseProvider';
import { toast } from '@/hooks/use-toast';
import {
  mapUser, mapProduct, mapInventoryItem, mapAssignment,
  mapSale, mapSettlement, mapKardex
} from '@/lib/supabase/mappers';
import type {
  UserProfile, NewUserPayload, Product, InventoryItem, Sale, SaleStatus,
  InventoryAssignment, WeeklySettlement, SaleDetail,
  MovementType, MovementReason, AssignmentStatus, KardexEntry
} from '@/lib/types';

const MIN_STOCK_DEFAULT = 4;

function newId(): string {
  // globalThis.crypto funciona en browser (Web Crypto API) y Node.js 19+
  // El fallback cubre SSR / Node antiguo / entornos sin Web Crypto
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useStore() {
  const { supabase, user, isUserLoading } = useSupabase();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [assignments, setAssignments] = useState<InventoryAssignment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settlements, setSettlements] = useState<WeeklySettlement[]>([]);
  const [kardex, setKardex] = useState<KardexEntry[]>([]);
  const [kardexPage, setKardexPage] = useState(0);
  const [kardexHasMore, setKardexHasMore] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState('');

  // ─── Cargar perfil cuando cambia la sesión ────────────────────────────────
  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      setCurrentUser(null);
      setIsProfileLoading(false);
      setUsers([]);
      setProducts([]);
      setInventory([]);
      setAssignments([]);
      setSales([]);
      setSettlements([]);
      setKardex([]);
      setPaymentInfo('');
      return;
    }

    setIsProfileLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setCurrentUser(data ? mapUser(data) : null);
        setIsProfileLoading(false);
      });
  }, [user?.id, isUserLoading]);

  // ─── Cargar datos + suscripciones realtime cuando el rol es conocido ───────
  useEffect(() => {
    if (!user || !currentUser) return;

    const uid = user.id;
    const role = currentUser.role;

    // ── Funciones de fetch ──────────────────────────────────────────────────

    const fetchProducts = () =>
      supabase.from('products').select('*').then(({ data }) =>
        setProducts(data?.map(mapProduct) ?? [])
      );

    const fetchUsers = () =>
      supabase.from('profiles').select('*').then(({ data }) =>
        setUsers(data?.map(mapUser) ?? [])
      );

    const fetchInventory = () => {
      const q = supabase.from('inventory_items').select('*');
      const filtered = role === 'seller' ? q.eq('seller_id', uid) : q;
      return filtered.then(({ data }) =>
        setInventory(data?.map(mapInventoryItem) ?? [])
      );
    };

    const fetchAssignments = () => {
      const q = supabase.from('inventory_assignments').select('*').order('created_at', { ascending: false });
      const filtered = role === 'seller' ? q.eq('seller_id', uid) : q;
      return filtered.then(({ data }) =>
        setAssignments(data?.map(mapAssignment) ?? [])
      );
    };

    const fetchSales = () => {
      const q = supabase.from('orders').select(`
        *,
        order_items(*),
        order_events(*)
      `).order('created_at', { ascending: false });
      const filtered =
        role === 'delivery' ? q.eq('delivery_person_id', uid) :
        role === 'seller'   ? q.eq('seller_id', uid) :
        q;
      return filtered.then(({ data }) =>
        setSales(data?.map(mapSale) ?? [])
      );
    };

    const fetchSettlements = async () => {
      if (role === 'delivery') {
        const { data: linked } = await supabase
          .from('orders')
          .select('settlement_id')
          .eq('delivery_person_id', uid)
          .not('settlement_id', 'is', null);

        const ids = [...new Set((linked ?? []).map(r => r.settlement_id as string))];

        if (ids.length === 0) { setSettlements([]); return; }

        const { data } = await supabase
          .from('settlements')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: false });

        setSettlements(data?.map(mapSettlement) ?? []);
        return;
      }

      const q = supabase.from('settlements').select('*').order('created_at', { ascending: false });
      const filtered = role === 'seller' ? q.eq('seller_id', uid) : q;
      const { data } = await filtered;
      setSettlements(data?.map(mapSettlement) ?? []);
    };

    const fetchKardex = () => {
      if (role === 'delivery') return;
      const q = supabase.from('kardex_entries').select('*').order('created_at', { ascending: false });
      const filtered = role === 'seller' ? q.eq('seller_id', uid).range(0, 99) : q.range(0, 99);
      return filtered.then(({ data }) => {
        setKardex(data?.map(mapKardex) ?? []);
        setKardexPage(0);
        setKardexHasMore((data?.length ?? 0) === 100);
      });
    };

    const fetchConfig = () =>
      supabase.from('app_config').select('*').eq('key', 'payment_info').single().then(({ data }) => {
        if (data?.value) setPaymentInfo(data.value);
      });

    // ── Carga inicial ───────────────────────────────────────────────────────
    fetchProducts();
    fetchUsers();
    fetchInventory();
    fetchAssignments();
    fetchSales();
    fetchSettlements();
    fetchKardex();
    fetchConfig();

    // ── Suscripciones Realtime ──────────────────────────────────────────────
    // Nombre único por montaje — evita que React Strict Mode (doble mount/unmount)
    // reutilice un canal ya subscrito y lance "cannot add callbacks after subscribe()"
    const channelName = `store-${uid}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },             () => { try { fetchProducts();    } catch(e) { console.error('[realtime] products:', e);    } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },             () => { try { fetchUsers();       } catch(e) { console.error('[realtime] profiles:', e);    } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' },      () => { try { fetchInventory();   } catch(e) { console.error('[realtime] inventory:', e);   } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_assignments' },() => { try { fetchAssignments(); } catch(e) { console.error('[realtime] assignments:', e); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },               () => { try { fetchSales();       } catch(e) { console.error('[realtime] orders:', e);      } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' },          () => { try { fetchSales();       } catch(e) { console.error('[realtime] order_items:', e); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_events' },         () => { try { fetchSales();       } catch(e) { console.error('[realtime] order_events:', e);} })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' },          () => { try { fetchSettlements(); } catch(e) { console.error('[realtime] settlements:', e); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kardex_entries' },       () => { try { fetchKardex();      } catch(e) { console.error('[realtime] kardex:', e);      } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' },           () => { try { fetchConfig();      } catch(e) { console.error('[realtime] app_config:', e);  } })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentUser?.role]);

  // ─── Autenticación ────────────────────────────────────────────────────────

  const login = async (username: string, pass: string) => {
    const email =
      username === 'admin' ? 'admin@salesdesk.com' :
      username.includes('@') ? username :
      `${username}@salesdesk.com`;

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Compatibilidad con API pública anterior — en Supabase el admin se crea vía SQL o dashboard
  const seedInitialAdmin = async () => false;

  // ─── Helper kardex ────────────────────────────────────────────────────────

  const logKardex = (
    productId: string,
    sellerId: string,
    type: MovementType,
    reason: MovementReason,
    qty: number,
    note?: string,
    orderId?: string
  ) => {
    const invItem = inventory.find(i => i.productId === productId && i.sellerId === sellerId);
    const before = invItem?.quantity ?? 0;
    const after = type === 'addition' ? before + qty : Math.max(0, before - qty);

    const entry: Record<string, unknown> = {
      id: newId(),
      product_id: productId,
      seller_id: sellerId,
      type,
      reason,
      quantity: qty,
      balance_before: before,
      balance_after: after,
      user_id: user?.id ?? null,
      user_name: currentUser?.name ?? 'Sistema',
      created_at: new Date().toISOString(),
    };
    if (orderId) entry.order_id = orderId;
    if (note) entry.notes = note;

    // Fire-and-forget con log de error — kardex es auditoría, no bloquea el flujo
    supabase.from('kardex_entries').insert(entry).then(({ error }) => {
      if (error) console.error('[logKardex] ERROR:', error.message, '| entry:', entry);
    });
  };

  // ─── Ventas ───────────────────────────────────────────────────────────────

  const registerMultiSale = async (
    sellerId: string,
    city: string,
    items: Omit<SaleDetail, 'id' | 'saleId'>[],
    customerName?: string,
    customerPhone?: string,
    customerAddress?: string,
    notes?: string,
    manualTotalVenta?: number,
    manualTotalComision?: number,
    googleMapsLink?: string,
    photoUrl?: string
  ) => {
    if (sellerId !== user?.id) {
      toast({ variant: 'destructive', title: 'No autorizado', description: 'No puedes registrar ventas para otro usuario.' });
      return;
    }
    // Validación bloqueante: recolectar todos los errores de stock antes de insertar
    const stockErrors: string[] = [];
    for (const item of items) {
      const invItem = inventory.find(i => i.productId === item.productId && i.sellerId === sellerId);
      const available = invItem?.quantity ?? 0;
      if (available < item.quantity) {
        const prod = products.find(p => p.id === item.productId);
        stockErrors.push(`${prod?.name || 'Producto'}: disponible ${available}, solicitado ${item.quantity}`);
      }
    }
    if (stockErrors.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Stock insuficiente',
        description: stockErrors.join(' · '),
      });
      return;
    }

    const saleId = newId();
    const calcVenta    = items.reduce((acc, i) => acc + i.subtotal, 0);
    const calcComision = items.reduce((acc, i) => acc + (i.commissionAtSale * i.quantity), 0);

    const rawVenta    = manualTotalVenta && manualTotalVenta !== 0 ? manualTotalVenta : calcVenta;
    const rawComision = manualTotalComision !== undefined && manualTotalComision !== null ? manualTotalComision : calcComision;
    const totalVenta    = isNaN(rawVenta)    ? calcVenta    : rawVenta;
    const totalComision = isNaN(rawComision) ? calcComision : rawComision;
    const totalDeposito = totalVenta - totalComision;

    // 1. INSERT orden
    const { error: orderErr } = await supabase.from('orders').insert({
      id: saleId,
      seller_id: sellerId,
      city,
      status: 'assigned',
      total_venta:     totalVenta,
      total_comision:  totalComision,
      total_deposito:  totalDeposito,
      customer_name:    customerName    ?? null,
      customer_phone:   customerPhone   ?? null,
      customer_address: customerAddress ?? null,
      google_maps_link: googleMapsLink  ?? null,
      notes:     notes     ?? null,
      photo_url: photoUrl  ?? null,
      created_at: new Date().toISOString(),
    });

    if (orderErr) {
      console.error('[registerMultiSale] INSERT orders:', orderErr.message);
      toast({ variant: 'destructive', title: 'Error al crear venta', description: orderErr.message });
      return;
    }

    // 2. INSERT order_items (líneas de la venta — son las que muestra "Productos a Entregar")
    const { error: itemsErr } = await supabase.from('order_items').insert(
      items.map(item => ({
        order_id:           saleId,
        product_id:         item.productId,
        quantity:           item.quantity,
        price_at_sale:      item.priceAtSale,
        commission_at_sale: item.commissionAtSale,
        subtotal:           item.subtotal,
      }))
    );
    if (itemsErr) {
      console.error('[registerMultiSale] INSERT order_items:', itemsErr.message);
      await supabase.from('orders').delete().eq('id', saleId);
      toast({ variant: 'destructive', title: 'Error al crear venta', description: itemsErr.message });
      return;
    }

    // 3. INSERT evento inicial
    supabase.from('order_events').insert({
      order_id:  saleId,
      type:      'creation',
      user_id:   user?.id ?? null,
      user_name: currentUser?.name ?? 'Sistema',
      note:      'Venta registrada',
    });

    // 4. Descontar stock en inventory_items + kardex
    for (const item of items) {
      const invItem = inventory.find(i => i.productId === item.productId && i.sellerId === sellerId);
      if (invItem) {
        const newQty = invItem.quantity - item.quantity;
        const { error: invErr } = await supabase
          .from('inventory_items')
          .update({ quantity: newQty })
          .eq('id', invItem.id);

        if (!invErr) {
          logKardex(item.productId, sellerId, 'subtraction', 'sale', item.quantity, `Venta #${saleId.slice(0,8)}`, saleId);
        }

        const prod = products.find(p => p.id === item.productId);
        const minStock = prod?.minStock ?? MIN_STOCK_DEFAULT;
        if (newQty <= minStock) {
          toast({ title: '⚠️ Stock bajo', description: `${prod?.name}: quedan ${newQty} unidades` });
        }
      }
    }

    toast({ title: 'Venta registrada', description: 'La venta fue enviada al vendedor.' });
    await refetchSales();
    await refetchInventory();
  };

  // ─── Refetch de ventas (reutilizable desde mutations) ──────────────────────
  const refetchSales = async () => {
    if (!user || !currentUser) return;
    const uid = user.id;
    const role = currentUser.role;
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
    if (data) setSales(data.map(mapSale));
  };

  const VALID_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
    assigned:           ['accepted', 'cancelled'],
    accepted:           ['contacting', 'cancelled'],
    contacting:         ['scheduled', 'cancelled'],
    scheduled:          ['in_transit', 'cancelled'],
    in_transit:         ['delivered', 'delivery_failed', 'pending_return'],
    delivered:          ['delivery_confirmed', 'paid'],
    delivery_confirmed: ['paid'],
    pending_return:     ['cancelled'],
    delivery_failed:    ['pending_return', 'cancelled'],
    paid:               [],
    cancelled:          [],
  };

  const updateSaleStatus = async (saleId: string, status: SaleStatus, data?: { note?: string, deliveryDate?: string, deliveryTime?: string }) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    if (!VALID_TRANSITIONS[sale.status]?.includes(status)) {
      toast({ variant: 'destructive', title: 'Transición de estado inválida', description: `No se puede pasar de '${sale.status}' a '${status}'.` });
      return;
    }

    const eventTypeMap: Record<SaleStatus, string> = {
      assigned: 'assignment', accepted: 'acceptance', contacting: 'assignment',
      scheduled: 'schedule', in_transit: 'dispatch', delivered: 'delivery',
      delivery_confirmed: 'delivery',
      cancelled: 'cancel', paid: 'payment', delivery_failed: 'failure',
      pending_return: 'failure',
    };

    const updateData: Record<string, unknown> = { status };
    if (data?.deliveryDate) updateData.delivery_date = data.deliveryDate;
    if (data?.deliveryTime) updateData.delivery_time = data.deliveryTime;
    if (data?.note) updateData.notes = data.note;
    // Al pasar a pending_return, registrar el momento exacto para calcular las 48h
    if (status === 'pending_return') {
      updateData.failed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('orders').update(updateData).eq('id', saleId);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }

    supabase.from('order_events').insert({
      order_id: saleId,
      type: eventTypeMap[status],
      user_id: user?.id ?? null,
      user_name: currentUser?.name ?? 'Usuario',
      note: data?.note ?? `Estado actualizado a: ${status}`,
    });

    // Stock se devuelve SOLO al cancelar directamente — no al marcar como fallido
    // pending_return espera la decisión explícita del admin/vendedor
    if (status === 'cancelled') {
      if (sale.status === 'cancelled') return;
      for (const item of sale.items) {
        const invItem = inventory.find(i => i.productId === item.productId && i.sellerId === sale.sellerId);
        if (invItem) {
          await supabase.from('inventory_items').update({ quantity: invItem.quantity + item.quantity }).eq('id', invItem.id);
          logKardex(item.productId, sale.sellerId, 'addition', 'return', item.quantity, `Cancelación directa #${saleId.slice(0,8)}`, saleId);
        }
      }
    }

    await refetchSales();
  };

  const confirmDelivery = async (saleId: string, note?: string) => {
    const updateData: Record<string, unknown> = { status: 'delivered' };
    if (note?.trim()) updateData.notes = note.trim();

    const { error } = await supabase.from('orders').update(updateData).eq('id', saleId);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }

    supabase.from('order_events').insert({
      order_id: saleId, type: 'delivery',
      user_id: user?.id ?? null, user_name: currentUser?.name ?? 'Sistema',
      note: note?.trim() ? `Entrega confirmada — ${note.trim()}` : 'Entrega confirmada',
    });

    await refetchSales();
  };

  const assignDeliveryPerson = async (saleId: string, deliveryPersonId: string) => {
    const deliveryPerson = users.find(u => u.id === deliveryPersonId);
    const { error } = await supabase.from('orders').update({ delivery_person_id: deliveryPersonId }).eq('id', saleId);
    if (error) { toast({ variant: 'destructive', title: 'Error al asignar repartidor', description: error.message }); return; }

    supabase.from('order_events').insert({
      order_id: saleId,
      type: 'assignment',
      user_id: user?.id ?? null,
      user_name: currentUser?.name ?? 'Sistema',
      note: `Asignado a repartidor: ${deliveryPerson?.name || 'Repartidor'}`,
    });

    toast({ title: 'Repartidor asignado', description: `Pedido asignado a ${deliveryPerson?.name}` });
    await refetchSales();
  };

  const reportDeliveryFailure = async (saleId: string, reason: string, step?: number) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    // El stock NO se devuelve aquí — el pedido queda en pending_return
    // para que admin/vendedor decidan cancelar o reintentar en las próximas 48h
    const { error } = await supabase.from('orders').update({
      status: 'pending_return',
      failure_reason: reason,
      failure_step: step ?? null,
      failed_at: new Date().toISOString(),
    }).eq('id', saleId);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }

    supabase.from('order_events').insert({
      order_id: saleId,
      type: 'failure',
      user_id: user?.id ?? null,
      user_name: currentUser?.name ?? 'Repartidor',
      note: `Fallo en entrega: ${reason} — pendiente de resolución (48h)`,
    });

    toast({
      variant: 'destructive',
      title: 'Fallo registrado',
      description: 'El pedido queda en espera. Admin/vendedor deben cancelar o reintentar en 48h.'
    });
    await refetchSales();
  };

  // ─── Cancelar pedido fallido — devuelve stock + cierra el pedido ─────────
  const cancelFailedOrder = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    if (sale.status === 'cancelled') return;

    // Devolver cada producto al inventario del vendedor
    for (const item of sale.items) {
      const invItem = inventory.find(i => i.productId === item.productId && i.sellerId === sale.sellerId);
      if (invItem) {
        await supabase.from('inventory_items').update({ quantity: invItem.quantity + item.quantity }).eq('id', invItem.id);
      } else {
        // Si por algún motivo no existe el registro, crearlo con la cantidad devuelta
        await supabase.from('inventory_items').insert({
          id: newId(), product_id: item.productId, seller_id: sale.sellerId, quantity: item.quantity
        });
      }
      logKardex(
        item.productId, sale.sellerId, 'addition', 'return', item.quantity,
        `Cancelación pedido fallido #${saleId.slice(0,8)}`, saleId
      );
    }

    const { error } = await supabase.from('orders').update({
      status: 'cancelled', failed_at: null
    }).eq('id', saleId);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }

    supabase.from('order_events').insert({
      order_id: saleId, type: 'cancel',
      user_id: user?.id ?? null, user_name: currentUser?.name ?? 'Sistema',
      note: 'Pedido cancelado tras fallo — stock devuelto al inventario',
    });

    toast({ title: 'Pedido cancelado', description: 'El stock fue devuelto al inventario del vendedor.' });
    await refetchSales();
    await refetchInventory();
  };

  // ─── Reintentar entrega — reactiva el pedido sin tocar el stock ──────────
  const retryDelivery = async (saleId: string) => {
    const { error } = await supabase.from('orders').update({
      status: 'in_transit',
      failure_reason: null,
      failure_step: null,
      failed_at: null,
    }).eq('id', saleId);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }

    supabase.from('order_events').insert({
      order_id: saleId, type: 'dispatch',
      user_id: user?.id ?? null, user_name: currentUser?.name ?? 'Sistema',
      note: 'Reintento de entrega — pedido reactivado en ruta',
    });

    toast({ title: 'Reintento registrado', description: 'El pedido volvió a estar en ruta.' });
    await refetchSales();
  };

  const deleteSale = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    if (sale.settlementId) {
      toast({ variant: 'destructive', title: 'No se puede eliminar', description: 'No se puede eliminar un pedido que ya fue liquidado.' });
      return;
    }

    // Devolver stock ANTES del DELETE para no perder los datos si algo falla.
    // 'cancelled' ya devolvió stock en updateSaleStatus/cancelFailedOrder — no volver a sumar.
    const RETURN_STOCK_STATUSES = ['assigned', 'accepted', 'contacting', 'scheduled', 'in_transit', 'delivery_failed', 'pending_return'];
    let stockReturned = false;
    if (RETURN_STOCK_STATUSES.includes(sale.status)) {
      for (const item of sale.items) {
        const invItem = inventory.find(i => i.productId === item.productId && i.sellerId === sale.sellerId);
        if (invItem) {
          await supabase.from('inventory_items').update({ quantity: invItem.quantity + item.quantity }).eq('id', invItem.id);
        } else {
          await supabase.from('inventory_items').insert({
            id: newId(), product_id: item.productId, seller_id: sale.sellerId, quantity: item.quantity,
          });
        }
        logKardex(item.productId, sale.sellerId, 'addition', 'return', item.quantity, `Eliminación pedido #${saleId.slice(0, 8)}`, saleId);
      }
      stockReturned = true;
    }

    const { error, count } = await supabase.from('orders').delete({ count: 'exact' }).eq('id', saleId);
    if (error || count === 0) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: error?.message ?? 'Sin permiso para eliminar esta venta.' });
      return;
    }

    toast({
      title: 'Venta eliminada',
      description: stockReturned ? 'El stock ha sido devuelto al vendedor.' : undefined,
    });
    await refetchSales();
    await refetchInventory();
  };

  // ─── Liquidaciones ────────────────────────────────────────────────────────

  const reportSettlement = async (
    sellerId: string, weekRange: string,
    totalVenta: number, totalComision: number, totalDeposito: number,
    reference: string, proofUrl?: string, saleIds: string[] = []
  ) => {
    const id = newId();
    const { error } = await supabase.from('settlements').insert({
      id, seller_id: sellerId, week_range: weekRange,
      total_venta: totalVenta, total_comision: totalComision, total_deposito: totalDeposito,
      status: 'reported', reference, proof_url: proofUrl ?? null,
      reported_at: new Date().toISOString(), created_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[reportSettlement] INSERT error:', error.message, error);
      toast({ variant: 'destructive', title: 'Error al enviar reporte', description: error.message });
      return;
    }
    if (saleIds.length > 0) {
      const { error: linkErr } = await supabase
        .from('orders')
        .update({ settlement_id: id })
        .in('id', saleIds);
      if (linkErr) console.error('[reportSettlement] link orders error:', linkErr.message);
    }
    toast({ title: 'Depósito reportado', description: 'Enviado para validación.' });
    await refetchSales();
  };

  const confirmSettlement = async (settlementId: string) => {
    if (currentUser?.role !== 'admin') { toast({ variant: 'destructive', title: 'No autorizado' }); return; }
    const { error } = await supabase
      .from('settlements')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', settlementId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error al confirmar', description: error.message });
      return;
    }
    // Marcar todas las órdenes vinculadas como pagadas
    const { error: ordersErr } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('settlement_id', settlementId)
      .neq('status', 'paid');

    if (ordersErr) {
      await supabase.from('settlements')
        .update({ status: 'reported', confirmed_at: null })
        .eq('id', settlementId);
      toast({ variant: 'destructive', title: 'Error al confirmar', description: 'No se pudieron actualizar las órdenes. Intenta de nuevo.' });
      await refetchSettlements();
      return;
    }
    toast({ title: 'Liquidación confirmada', description: 'Las ventas quedaron marcadas como pagadas.' });
    await refetchSales();
    await refetchSettlements();
  };

  const rejectSettlement = async (settlementId: string, reason: string) => {
    if (currentUser?.role !== 'admin') { toast({ variant: 'destructive', title: 'No autorizado' }); return; }
    const { error } = await supabase
      .from('settlements')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', settlementId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error al rechazar', description: error.message });
      return;
    }
    await supabase
      .from('orders')
      .update({ settlement_id: null })
      .eq('settlement_id', settlementId)
      .neq('status', 'paid');
    toast({ title: 'Liquidación rechazada', description: 'Los pedidos vuelven a estar disponibles.' });
    await refetchSales();
    await refetchSettlements();
  };

  const refetchSettlements = async () => {
    if (!user || !currentUser) return;
    const uid = user.id;
    const role = currentUser.role;
    const q = supabase.from('settlements').select('*').order('created_at', { ascending: false });
    const filtered = role === 'seller' || role === 'delivery' ? q.eq('seller_id', uid) : q;
    const { data } = await filtered;
    if (data) setSettlements(data.map(mapSettlement));
  };

  // ─── Refetch de inventario (reutilizable desde mutations) ──────────────────
  const refetchInventory = async () => {
    if (!user || !currentUser) return;
    const q = supabase.from('inventory_items').select('*');
    const filtered = currentUser.role === 'seller' ? q.eq('seller_id', user.id) : q;
    const { data, error } = await filtered;
    if (data) setInventory(data.map(mapInventoryItem));
  };

  const refetchAssignments = async () => {
    if (!user || !currentUser) return;
    const q = supabase.from('inventory_assignments').select('*').order('created_at', { ascending: false });
    const filtered = currentUser.role === 'seller' ? q.eq('seller_id', user.id) : q;
    const { data, error } = await filtered;
    if (data) setAssignments(data.map(mapAssignment));
  };

  // ─── Inventario ───────────────────────────────────────────────────────────

  const assignInventory = async (productId: string, sellerId: string, quantity: number) => {
    if (currentUser?.role !== 'admin') { toast({ variant: 'destructive', title: 'No autorizado' }); return; }
    const id = newId();
    const payload = {
      id, product_id: productId, seller_id: sellerId, quantity,
      type: 'addition', reason: 'load', status: 'pending',
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('inventory_assignments').insert(payload);

    if (error) {
      toast({ variant: 'destructive', title: 'Error al asignar inventario', description: error.message });
      return;
    }

    logKardex(productId, sellerId, 'addition', 'load', quantity, 'Envío de mercancía pendiente de confirmación');
    await refetchAssignments();
  };

  const updateAssignmentStatus = async (id: string, status: AssignmentStatus, notes?: string, quantityOverride?: number) => {
    const assignment = assignments.find(a => a.id === id);
    if (!assignment) return;
    const finalQty = quantityOverride !== undefined ? quantityOverride : assignment.quantity;

    const updateData: Record<string, unknown> = { status, quantity: finalQty };
    if (notes && notes.trim()) updateData.notes = notes;

    const { error: aErr } = await supabase.from('inventory_assignments').update(updateData).eq('id', id);
    if (aErr) { toast({ variant: 'destructive', title: 'Error', description: aErr.message }); return; }

    if (status === 'confirmed') {
      const invItem = inventory.find(i => i.productId === assignment.productId && i.sellerId === assignment.sellerId);

      if (invItem) {
        const { error } = await supabase.from('inventory_items')
          .update({ quantity: invItem.quantity + finalQty }).eq('id', invItem.id);
        if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
      } else {
        const newInvId = newId();
        const { error } = await supabase.from('inventory_items').insert({
          id: newInvId,
          product_id: assignment.productId,
          seller_id: assignment.sellerId,
          quantity: finalQty,
        });
        if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
      }

      toast({ title: 'Stock actualizado', description: 'La mercancía se sumó al inventario.' });
      await refetchInventory();
    }

    await refetchAssignments();
  };

  const adjustInventory = async (
    productId: string, sellerId: string, quantity: number,
    type: MovementType, reason: MovementReason, notes?: string
  ) => {
    const id = newId();
    const { error: aErr } = await supabase.from('inventory_assignments').insert({
      id, product_id: productId, seller_id: sellerId,
      quantity, type, reason, status: 'confirmed',
      created_at: new Date().toISOString(), notes: notes ?? '',
    });
    if (aErr) { toast({ variant: 'destructive', title: 'Error', description: aErr.message }); return; }

    const invItem = inventory.find(i => i.productId === productId && i.sellerId === sellerId);
    if (invItem) {
      const newQty = type === 'addition' ? invItem.quantity + quantity : Math.max(0, invItem.quantity - quantity);
      await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', invItem.id);
    } else if (type === 'addition') {
      await supabase.from('inventory_items').insert({
        id: newId(), product_id: productId, seller_id: sellerId, quantity
      });
    }

    logKardex(productId, sellerId, type, reason, quantity, notes);
    await refetchInventory();
    await refetchAssignments();
  };

  // ─── Refetch de productos (reutilizable desde mutations + realtime) ─────────
  const refetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (data) setProducts(data.map(mapProduct));
  };

  // ─── Productos ────────────────────────────────────────────────────────────

  const addProduct = async (p: Omit<Product, 'id'>) => {
    const id = newId();
    const payload = {
      id, name: p.name, price: p.price,
      default_commission: p.defaultCommission,
      min_stock: p.minStock ?? MIN_STOCK_DEFAULT,
      description: p.description ?? null,
    };
    const { error } = await supabase.from('products').insert(payload);

    if (error) {
      toast({ variant: 'destructive', title: 'Error al crear producto', description: error.message });
      return;
    }

    toast({ title: 'Producto creado' });
    // Refetch inmediato — no depende solo de Realtime
    await refetchProducts();
  };

  const updateProduct = async (p: Product) => {
    const { error } = await supabase.from('products').update({
      name: p.name, price: p.price,
      default_commission: p.defaultCommission,
      min_stock: p.minStock ?? MIN_STOCK_DEFAULT,
      description: p.description ?? null,
    }).eq('id', p.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar producto', description: error.message });
      return;
    }
    await refetchProducts();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error al eliminar producto', description: error.message });
      return;
    }
    await refetchProducts();
  };

  // ─── Usuarios ─────────────────────────────────────────────────────────────

  const addUser = async (u: NewUserPayload) => {
    const { password, ...userData } = u;
    const email = userData.username.includes('@') ? userData.username : `${userData.username}@salesdesk.com`;

    try {
      // Crear usuario en Supabase Auth via API route (usa service_role server-side)
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const uid = json.id;
      await supabase.from('profiles').insert({
        id: uid,
        name: userData.name,
        username: userData.username,
        email,
        phone: userData.phone ?? null,
        whatsapp: userData.whatsapp ?? null,
        city: userData.city ?? '',
        role: userData.role ?? 'seller',
        is_active: true,
        settlement_frequency: userData.settlementFrequency ?? 'weekly',
        settlement_start_day: userData.settlementStartDay ?? 1,
      });

      toast({ title: `${userData.role === 'delivery' ? 'Repartidor' : 'Vendedor'} creado` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const updateUser = async (u: UserProfile) => {
    if (currentUser?.role !== 'admin' && u.id !== currentUser?.id) {
      toast({ variant: 'destructive', title: 'No autorizado' }); return;
    }
    try {
      const { error } = await supabase.from('profiles').update({
        name: u.name, username: u.username, email: u.email ?? null,
        phone: u.phone ?? null, whatsapp: u.whatsapp ?? null, city: u.city,
        role: u.role, is_active: u.isActive,
        settlement_frequency: u.settlementFrequency,
        settlement_start_day: u.settlementStartDay,
      }).eq('id', u.id);
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al actualizar usuario', description: error.message });
    }
  };

  const deleteUser = async (id: string) => {
    if (currentUser?.role !== 'admin') { toast({ variant: 'destructive', title: 'No autorizado' }); return; }
    if (id === currentUser?.id) { toast({ variant: 'destructive', title: 'No puedes eliminar tu propia cuenta' }); return; }
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar usuario', description: error.message });
    }
  };

  // ─── Configuración ────────────────────────────────────────────────────────

  const loadMoreKardex = async () => {
    if (!user || !currentUser || currentUser.role === 'delivery') return;
    const nextPage = kardexPage + 1;
    const start = nextPage * 100;
    const q = supabase.from('kardex_entries').select('*').order('created_at', { ascending: false });
    const filtered = currentUser.role === 'seller'
      ? q.eq('seller_id', user.id).range(start, start + 99)
      : q.range(start, start + 99);
    const { data } = await filtered;
    setKardex(prev => [...prev, ...(data?.map(mapKardex) ?? [])]);
    setKardexPage(nextPage);
    setKardexHasMore((data?.length ?? 0) === 100);
  };

  const updatePaymentInfo = async (info: string) => {
    try {
      const { error } = await supabase
        .from('app_config').upsert({ key: 'payment_info', value: info }, { onConflict: 'key' });
      if (error) throw error;
      setPaymentInfo(info);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al guardar información de pago', description: error.message });
    }
  };

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    users, products, inventory, assignments, sales, settlements, kardex, kardexHasMore,
    paymentInfo, currentUser, user, isProfileLoading,
    login, logout, seedInitialAdmin,
    addProduct, updateProduct, deleteProduct,
    addUser, updateUser, deleteUser,
    assignInventory, updateAssignmentStatus, adjustInventory,
    registerMultiSale, updateSaleStatus, confirmDelivery, deleteSale,
    assignDeliveryPerson, reportDeliveryFailure, cancelFailedOrder, retryDelivery,
    reportSettlement, confirmSettlement, rejectSettlement,
    updatePaymentInfo, loadMoreKardex,
  };
}
