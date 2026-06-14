
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, AlertTriangle, Package, Filter, PlusCircle, Search, ArrowUpCircle, ArrowDownCircle, MapPin, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { MovementType, MovementReason } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const REASON_LABELS: Record<MovementReason, string> = {
  load: 'Carga',
  sale: 'Venta',
  adjustment: 'Ajuste',
  return: 'Devolución',
  correction: 'Corrección',
};

export default function InventoryPage() {
  const { products, users, inventory, assignments, kardex, kardexHasMore, assignInventory, adjustInventory, loadMoreKardex } = useStore();
  const deliveryPersons = users.filter(u => u.role === 'delivery');

  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [filterDeliveryId, setFilterDeliveryId] = useState('all');
  const [openStock, setOpenStock] = useState<Set<string>>(new Set());

  const toggleStock = (id: string) => {
    setOpenStock(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [batchQuantities, setBatchQuantities] = useState<Record<string, string>>({});

  // Adjustment State
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjData, setAdjData] = useState({
    deliveryPersonId: '',
    productId: '',
    quantity: '',
    type: 'addition' as MovementType,
    reason: 'adjustment' as MovementReason,
    notes: ''
  });

  const handleBatchAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliveryId) {
      toast({ variant: "destructive", title: "Falta Repartidor", description: "Selecciona un repartidor para realizar la carga." });
      return;
    }

    const hasNegative = Object.values(batchQuantities).some(qty => parseInt(qty) < 0);
    if (hasNegative) {
      toast({ variant: 'destructive', title: 'Cantidad inválida', description: 'Las cantidades no pueden ser negativas.' });
      return;
    }

    const updates = Object.entries(batchQuantities)
      .filter(([_, qty]) => parseInt(qty) > 0)
      .map(([productId, qty]) => ({ productId, quantity: parseInt(qty) }));

    if (updates.length === 0) {
      toast({ variant: "destructive", title: "Carga Vacía", description: "Ingresa al menos una cantidad para un producto." });
      return;
    }

    updates.forEach(update => {
      assignInventory(update.productId, selectedDeliveryId, update.quantity);
    });

    setBatchQuantities({});
    setSelectedDeliveryId('');
    toast({ title: "Movimiento Registrado", description: `Se han enviado productos. Esperando confirmación del repartidor.` });
  };

  const handleAdjustInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjData.deliveryPersonId) {
      toast({ variant: 'destructive', title: 'Repartidor requerido', description: 'Selecciona un repartidor para el ajuste.' });
      return;
    }
    if (!adjData.productId) {
      toast({ variant: 'destructive', title: 'Producto requerido', description: 'Selecciona el producto a ajustar.' });
      return;
    }
    if (!adjData.quantity || parseInt(adjData.quantity) <= 0) {
      toast({ variant: 'destructive', title: 'Cantidad inválida', description: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    adjustInventory(
      adjData.productId,
      adjData.deliveryPersonId,
      parseInt(adjData.quantity),
      adjData.type,
      adjData.reason,
      adjData.notes
    );

    setIsAdjusting(false);
    setAdjData({ deliveryPersonId: '', productId: '', quantity: '', type: 'addition', reason: 'adjustment', notes: '' });
  };

  const handleQtyChange = (productId: string, value: string) => {
    setBatchQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const disputedAssignments = assignments.filter(a => a.status === 'disputed');

  const pendingByDelivery = useMemo(() => {
    const pending = assignments.filter(a => a.status === 'pending');
    const dpIds = Array.from(new Set(pending.map(a => a.deliveryPersonId)));
    return dpIds.map(dpid => ({
      deliveryPerson: users.find(u => u.id === dpid),
      id: dpid,
      items: pending
        .filter(a => a.deliveryPersonId === dpid)
        .map(a => ({
          id: a.id,
          name: products.find(p => p.id === a.productId)?.name || a.productId,
          quantity: a.quantity,
          createdAt: a.createdAt,
        })),
    }));
  }, [assignments, users, products]);

  const lowStockItems = useMemo(() => {
    return products.flatMap(p => {
      const minStock = p.minStock ?? 4;
      return inventory
        .filter(i => i.productId === p.id && (i.quantity - i.reservedQuantity) <= minStock && i.quantity > 0)
        .map(i => ({
          product: p,
          deliveryPerson: users.find(u => u.id === i.deliveryPersonId),
          quantity: i.quantity - i.reservedQuantity,
          minStock
        }));
    });
  }, [products, inventory, users]);

  const deliveryInventoryMap = useMemo(() => {
    const dpIds = Array.from(new Set(inventory.map(i => i.deliveryPersonId)));

    return dpIds.map(dpid => {
      const deliveryPerson = users.find(u => u.id === dpid);
      const items = inventory.filter(i => i.deliveryPersonId === dpid);

      const dpProducts = products
        .map(p => {
          const invItem = items.find(i => i.productId === p.id);
          const qty = invItem?.quantity || 0;
          const reserved = invItem?.reservedQuantity ?? 0;
          const hasPendingAssignment = assignments.some(
            a => a.deliveryPersonId === dpid && a.productId === p.id &&
              (a.status === 'pending' || a.status === 'disputed')
          );
          return { product: p, quantity: qty, reservedQuantity: reserved, value: qty * p.price, hasPendingAssignment };
        })
        .filter(item => item.quantity > 0 || item.hasPendingAssignment);

      const pendingAssignments = assignments
        .filter(a => a.deliveryPersonId === dpid && a.status === 'pending')
        .map(a => ({
          id: a.id,
          name: products.find(p => p.id === a.productId)?.name || a.productId,
          quantity: a.quantity,
          createdAt: a.createdAt,
        }));

      return {
        deliveryPerson: deliveryPerson || { name: `Repartidor Eliminado`, city: 'N/A', id: dpid },
        items: dpProducts.filter(() => filterDeliveryId === 'all' || dpid === filterDeliveryId),
        totalValue: dpProducts.reduce((acc, curr) => acc + curr.value, 0),
        pendingAssignments
      };
    }).filter(group => group.items.length > 0 && (filterDeliveryId === 'all' || group.deliveryPerson.id === filterDeliveryId));
  }, [inventory, users, products, assignments, filterDeliveryId]);

  const [kardexDelivery, setKardexDelivery] = useState('all');
  const [kardexProduct, setKardexProduct] = useState('all');

  // ── Por Ciudad ──────────────────────────────────────────────────────────────
  const [selectedCity, setSelectedCity] = useState('all');

  const inventoryCities = useMemo(() => {
    const cities = new Set<string>();
    inventory.forEach(item => {
      const deliveryPerson = users.find(u => u.id === item.deliveryPersonId);
      if (deliveryPerson?.city?.trim()) cities.add(deliveryPerson.city.trim());
    });
    return Array.from(cities).sort();
  }, [inventory, users]);

  const cityInventoryMap = useMemo(() => {
    return inventoryCities
      .filter(city => selectedCity === 'all' || city === selectedCity)
      .map(city => {
        const deliveryPersonsInCity = users.filter(u => u.city?.trim() === city && u.role === 'delivery');
        const dpIds = new Set(deliveryPersonsInCity.map(d => d.id));
        const cityItems = inventory.filter(i => dpIds.has(i.deliveryPersonId));

        const productTotals = products
          .map(p => ({
            product: p,
            total: cityItems
              .filter(i => i.productId === p.id)
              .reduce((sum, i) => sum + i.quantity, 0),
          }))
          .filter(pt => pt.total > 0);

        return {
          city,
          productTotals,
          deliveryCount: deliveryPersonsInCity.length,
          totalUnits: productTotals.reduce((sum, pt) => sum + pt.total, 0),
        };
      })
      .filter(c => c.productTotals.length > 0);
  }, [inventoryCities, inventory, users, products, selectedCity]);

  const filteredKardex = useMemo(() => {
    return kardex.filter(k => {
      const matchDelivery = kardexDelivery === 'all' || k.deliveryPersonId === kardexDelivery;
      const matchProduct = kardexProduct === 'all' || k.productId === kardexProduct;
      return matchDelivery && matchProduct;
    });
  }, [kardex, kardexDelivery, kardexProduct]);

  const cancelledAssignments = useMemo(() => {
    return assignments.filter(a => {
      const matchDelivery = kardexDelivery === 'all' || a.deliveryPersonId === kardexDelivery;
      const matchProduct = kardexProduct === 'all' || a.productId === kardexProduct;
      return a.status === 'cancelled' && matchDelivery && matchProduct;
    });
  }, [assignments, kardexDelivery, kardexProduct]);

  const historyRows = useMemo(() => {
    const rows = [
      ...filteredKardex.map(entry => ({ kind: 'kardex' as const, date: entry.createdAt, entry })),
      ...cancelledAssignments.map(a => ({ kind: 'cancel' as const, date: a.updatedAt ?? a.createdAt, assignment: a })),
    ];
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredKardex, cancelledAssignments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Control de Mercancía</h1>
          <p className="text-muted-foreground text-sm">Estado actual de stock por repartidor</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <Select value={filterDeliveryId} onValueChange={setFilterDeliveryId}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white border-none shadow-sm rounded-xl h-11">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <SelectValue placeholder="Filtrar Repartidor" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Repartidores</SelectItem>
              {deliveryPersons.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5 rounded-xl h-11">
                <PlusCircle className="w-4 h-4" /> Ajuste Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Corregir Inventario</DialogTitle>
                <CardDescription>Usa esto solo para errores manuales o devoluciones.</CardDescription>
              </DialogHeader>
              <form onSubmit={handleAdjustInventory} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Repartidor</Label>
                    <Select value={adjData.deliveryPersonId} onValueChange={(val) => setAdjData({...adjData, deliveryPersonId: val})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {deliveryPersons.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Producto</Label>
                    <Select value={adjData.productId} onValueChange={(val) => setAdjData({...adjData, productId: val})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <RadioGroup value={adjData.type} onValueChange={(val: MovementType) => setAdjData({...adjData, type: val})} className="grid grid-cols-2 gap-3">
                  <div className={cn("flex items-center space-x-2 border rounded-lg p-3", adjData.type === 'addition' ? "bg-green-50 border-green-200" : "")}>
                    <RadioGroupItem value="addition" id="adj-add" />
                    <Label htmlFor="adj-add" className="text-xs font-bold text-green-700">Sumar Stock</Label>
                  </div>
                  <div className={cn("flex items-center space-x-2 border rounded-lg p-3", adjData.type === 'subtraction' ? "bg-red-50 border-red-200" : "")}>
                    <RadioGroupItem value="subtraction" id="adj-sub" />
                    <Label htmlFor="adj-sub" className="text-xs font-bold text-red-700">Restar Stock</Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Cantidad</Label>
                  <Input type="number" value={adjData.quantity} onChange={e => setAdjData({...adjData, quantity: e.target.value})} placeholder="0" />
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full h-12">Aplicar Cambio</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {disputedAssignments.length > 0 && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 border-l-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">Hay Disputas Pendientes</AlertTitle>
          <AlertDescription>Un repartidor reportó una discrepancia en su última carga.</AlertDescription>
        </Alert>
      )}

      {lowStockItems.length > 0 && (
        <Alert className="bg-orange-50 border-orange-300 border-l-4">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="font-bold text-orange-700">Stock Bajo — {lowStockItems.length} alerta{lowStockItems.length > 1 ? 's' : ''}</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStockItems.map((item, idx) => (
                <span key={idx} className="text-[11px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
                  {item.product.name} — {item.deliveryPerson?.name || 'Repartidor'}: {item.quantity} uds (mín. {item.minStock})
                </span>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="stock">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto max-w-full">
          <TabsTrigger value="stock" className="whitespace-nowrap">Stock Actual</TabsTrigger>
          <TabsTrigger value="pendientes" className="whitespace-nowrap">Pendiente a Confirmar</TabsTrigger>
          <TabsTrigger value="ciudad" className="whitespace-nowrap">Por Ciudad</TabsTrigger>
          <TabsTrigger value="kardex" className="whitespace-nowrap">Kardex / Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {deliveryInventoryMap.map((group) => (
            <Card key={group.deliveryPerson.id} className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
              <CardHeader
                className="bg-muted/30 pb-6 pt-6 md:pt-8 px-5 md:px-8 flex flex-row items-center justify-between cursor-pointer select-none gap-3"
                onClick={() => toggleStock(group.deliveryPerson.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground text-xl font-black">
                    {group.deliveryPerson.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black">{group.deliveryPerson.name}</CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.deliveryPerson.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Unidades</p>
                    <p className="text-2xl font-black tracking-tighter text-primary">
                      {group.items.reduce((acc, curr) => acc + curr.quantity, 0)} <span className="text-xs opacity-50">uds</span>
                    </p>
                  </div>
                  <ChevronDown className={cn(
                    "w-6 h-6 text-muted-foreground transition-transform shrink-0",
                    openStock.has(group.deliveryPerson.id) && "rotate-180"
                  )} />
                </div>
              </CardHeader>
              {openStock.has(group.deliveryPerson.id) && (
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 md:p-6 hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          item.quantity > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/30"
                        )}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground">{item.product.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">${item.product.price.toLocaleString()} c/u</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 w-full sm:w-auto">
                        <div className="text-center min-w-[60px]">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total</p>
                          <p className="text-2xl font-black tracking-tighter text-foreground">{item.quantity}</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Reservado</p>
                          <p className="text-2xl font-black tracking-tighter text-orange-500">{item.reservedQuantity}</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Disponible</p>
                          <p className={cn(
                            "text-2xl font-black tracking-tighter",
                            (item.quantity - item.reservedQuantity) === 0 ? "text-muted-foreground/30" :
                            (item.quantity - item.reservedQuantity) < 5 ? "text-orange-500" : "text-green-600"
                          )}>
                            {item.quantity - item.reservedQuantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-primary/90 text-primary-foreground p-6 flex items-center justify-between">
                  <div className="flex gap-8">
                     <div className="space-y-0.5">
                       <p className="text-[9px] font-bold uppercase opacity-70">VALOR TOTAL EN STOCK</p>
                       <p className="text-2xl font-black tracking-tighter">${group.totalValue.toLocaleString()}</p>
                     </div>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>
          ))}

          {deliveryInventoryMap.length === 0 && (
            <div className="py-32 text-center bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
               <div className="bg-muted/50 p-6 rounded-full"><Search className="w-12 h-12 text-muted-foreground/30" /></div>
               <div>
                  <h3 className="text-lg font-bold">Sin resultados</h3>
                  <p className="text-sm text-muted-foreground italic">No hay inventario asignado actualmente.</p>
               </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-2xl bg-white lg:sticky lg:top-6 rounded-3xl overflow-hidden border-t-8 border-t-primary">
            <CardHeader className="p-5 md:p-8">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Enviar Mercancía</CardTitle>
                  <p className="text-muted-foreground text-xs font-medium">Asigna stock a tus repartidores</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 md:px-8 md:pb-8">
              <form onSubmit={handleBatchAssign} className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Responsable de Recepción</Label>
                  <Select value={selectedDeliveryId} onValueChange={setSelectedDeliveryId}>
                    <SelectTrigger className="h-14 bg-muted/20 border-none shadow-inner rounded-2xl px-6 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Seleccionar repartidor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryPersons.map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.city})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cantidades por Producto</Label>
                  <div className="space-y-3">
                    {products.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-dashed border-muted-foreground/10 group hover:border-primary/30 transition-colors">
                        <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-10 w-20 text-center font-black text-sm bg-white border-none shadow-sm rounded-xl focus:ring-2 focus:ring-primary/30"
                            value={batchQuantities[p.id] || ''}
                            onChange={(e) => handleQtyChange(p.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full gap-3 h-16 text-lg font-black shadow-xl shadow-primary/20 rounded-2xl transition-all hover:scale-[1.02]" disabled={!selectedDeliveryId}>
                  <Send className="w-5 h-5" /> Confirmar Envío
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="pendientes">
          {pendingByDelivery.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
              <div className="bg-muted/50 p-6 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground italic text-sm">No hay envíos pendientes de confirmar.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 border-l-4 border-l-orange-400 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h2 className="text-base font-black text-orange-800">
                  Envíos pendientes de confirmar ({pendingByDelivery.length} repartidor{pendingByDelivery.length > 1 ? 'es' : ''})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingByDelivery.map(group => (
                  <div key={group.id} className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-orange-100/50 border-b border-orange-100">
                      <p className="text-sm font-black text-orange-900">{group.deliveryPerson?.name || 'Repartidor'}</p>
                      {group.deliveryPerson?.city && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700/70">{group.deliveryPerson.city}</p>
                      )}
                    </div>
                    <div className="divide-y divide-orange-50">
                      {group.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Package className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">{format(new Date(item.createdAt), 'dd/MM/yy', { locale: es })}</p>
                            </div>
                          </div>
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-xs font-black shrink-0">
                            +{item.quantity} uds
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ciudad">
          <div className="space-y-6">
            {/* Selector de ciudad */}
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-primary" />
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-56 bg-white border-none shadow-sm rounded-xl h-10">
                  <SelectValue placeholder="Seleccionar ciudad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ciudades</SelectItem>
                  {inventoryCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {cityInventoryMap.length} ciudad{cityInventoryMap.length !== 1 ? 'es' : ''} con stock
              </span>
            </div>

            {cityInventoryMap.length === 0 ? (
              <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
                <div className="bg-muted/50 p-6 rounded-full">
                  <MapPin className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground italic text-sm">Sin inventario para la ciudad seleccionada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {cityInventoryMap.map(({ city, productTotals, deliveryCount, totalUnits }) => (
                  <Card key={city} className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 p-2 rounded-xl">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-black">{city}</CardTitle>
                            <p className="text-[10px] text-muted-foreground">
                              {deliveryCount} repartidor{deliveryCount !== 1 ? 'es' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-muted-foreground uppercase">Total</p>
                          <p className="text-2xl font-black text-primary">{totalUnits}</p>
                          <p className="text-[9px] text-muted-foreground">uds</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {productTotals.map(({ product, total }) => (
                          <div key={product.id} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{product.name}</span>
                            </div>
                            <span className={cn(
                              "text-sm font-black px-3 py-0.5 rounded-full",
                              total < (product.minStock ?? 4)
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            )}>
                              {total} uds
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="kardex">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex-1">
                  Historial de Movimientos ({historyRows.length})
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select value={kardexDelivery} onValueChange={setKardexDelivery}>
                    <SelectTrigger className="w-44 h-9 text-xs">
                      <SelectValue placeholder="Repartidor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los repartidores</SelectItem>
                      {deliveryPersons.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={kardexProduct} onValueChange={setKardexProduct}>
                    <SelectTrigger className="w-44 h-9 text-xs">
                      <SelectValue placeholder="Producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los productos</SelectItem>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] uppercase">Producto</TableHead>
                    <TableHead className="text-[10px] uppercase">Repartidor</TableHead>
                    <TableHead className="text-[10px] uppercase">Motivo</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Cantidad</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Antes</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Después</TableHead>
                    <TableHead className="text-[10px] uppercase">Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic text-sm">
                        Sin movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyRows.map(row => {
                      if (row.kind === 'cancel') {
                        const a = row.assignment;
                        const product = products.find(p => p.id === a.productId);
                        const deliveryPerson = users.find(u => u.id === a.deliveryPersonId);
                        return (
                          <TableRow key={`cancel-${a.id}`}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(a.updatedAt ?? a.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                            </TableCell>
                            <TableCell className="text-xs font-medium">{product?.name || a.productId}</TableCell>
                            <TableCell className="text-xs">{deliveryPerson?.name || '—'}</TableCell>
                            <TableCell>
                              <Badge className="text-[10px] border-0 bg-red-100 text-red-800">Cancelación</Badge>
                              {a.notes && (
                                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">{a.notes}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs font-black flex items-center justify-end gap-1 text-red-600">
                                <ArrowDownCircle className="w-3 h-3" />
                                -{a.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                            <TableCell className="text-right text-xs font-bold">—</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{deliveryPerson?.name || '—'}</TableCell>
                          </TableRow>
                        );
                      }
                      const entry = row.entry;
                      const product = products.find(p => p.id === entry.productId);
                      const deliveryPerson = users.find(u => u.id === entry.deliveryPersonId);
                      const isAddition = entry.type === 'addition';
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{product?.name || entry.productId}</TableCell>
                          <TableCell className="text-xs">{deliveryPerson?.name || '—'}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[10px] border-0",
                              isAddition ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            )}>
                              {REASON_LABELS[entry.reason]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn("text-xs font-black flex items-center justify-end gap-1", isAddition ? "text-green-600" : "text-red-600")}>
                              {isAddition ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                              {isAddition ? '+' : '-'}{entry.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{entry.balanceBefore}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{entry.balanceAfter}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{entry.userName}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>

              {/* Móvil: tarjetas */}
              <div className="md:hidden divide-y">
                {historyRows.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground italic text-sm">Sin movimientos registrados</p>
                ) : (
                  historyRows.map(row => {
                    if (row.kind === 'cancel') {
                      const a = row.assignment;
                      const product = products.find(p => p.id === a.productId);
                      const deliveryPerson = users.find(u => u.id === a.deliveryPersonId);
                      return (
                        <div key={`m-cancel-${a.id}`} className="p-4 space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-bold">{product?.name || a.productId}</p>
                            <span className="text-sm font-black flex items-center gap-1 shrink-0 text-red-600">
                              <ArrowDownCircle className="w-3.5 h-3.5" /> -{a.quantity}
                            </span>
                          </div>
                          <Badge className="text-[10px] border-0 bg-red-100 text-red-800">Cancelación</Badge>
                          {a.notes && <p className="text-[10px] text-muted-foreground">{a.notes}</p>}
                          <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                            <span>{deliveryPerson?.name || '—'}</span>
                            <span>{format(new Date(a.updatedAt ?? a.createdAt), 'dd/MM/yy HH:mm', { locale: es })}</span>
                          </div>
                        </div>
                      );
                    }
                    const entry = row.entry;
                    const product = products.find(p => p.id === entry.productId);
                    const deliveryPerson = users.find(u => u.id === entry.deliveryPersonId);
                    const isAddition = entry.type === 'addition';
                    return (
                      <div key={`m-${entry.id}`} className="p-4 space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-bold">{product?.name || entry.productId}</p>
                          <span className={cn("text-sm font-black flex items-center gap-1 shrink-0", isAddition ? "text-green-600" : "text-red-600")}>
                            {isAddition ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                            {isAddition ? '+' : '-'}{entry.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("text-[10px] border-0", isAddition ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                            {REASON_LABELS[entry.reason]}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Antes {entry.balanceBefore} → Después {entry.balanceAfter}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                          <span>{deliveryPerson?.name || '—'} · {entry.userName}</span>
                          <span>{format(new Date(entry.createdAt), 'dd/MM/yy HH:mm', { locale: es })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
            {kardexHasMore && (
              <div className="flex justify-center p-4 border-t">
                <button
                  onClick={loadMoreKardex}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Cargar más registros
                </button>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
