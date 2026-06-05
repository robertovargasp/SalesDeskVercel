
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
import { Send, AlertTriangle, Package, Filter, PlusCircle, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
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
  const { products, users, inventory, assignments, kardex, assignInventory, adjustInventory } = useStore();
  const sellers = users.filter(u => u.role === 'seller');

  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [filterSellerId, setFilterSellerId] = useState('all');
  const [batchQuantities, setBatchQuantities] = useState<Record<string, string>>({});

  // Adjustment State
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjData, setAdjData] = useState({
    sellerId: '',
    productId: '',
    quantity: '',
    type: 'addition' as MovementType,
    reason: 'adjustment' as MovementReason,
    notes: ''
  });

  const handleBatchAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerId) {
      toast({ variant: "destructive", title: "Falta Vendedor", description: "Selecciona un vendedor para realizar la carga." });
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
      assignInventory(update.productId, selectedSellerId, update.quantity);
    });

    setBatchQuantities({});
    setSelectedSellerId('');
    toast({ title: "Movimiento Registrado", description: `Se han enviado productos. Esperando confirmación.` });
  };

  const handleAdjustInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjData.sellerId || !adjData.productId || !adjData.quantity) return;

    adjustInventory(
      adjData.productId,
      adjData.sellerId,
      parseInt(adjData.quantity),
      adjData.type,
      adjData.reason,
      adjData.notes
    );

    setIsAdjusting(false);
    setAdjData({ sellerId: '', productId: '', quantity: '', type: 'addition', reason: 'adjustment', notes: '' });
  };

  const handleQtyChange = (productId: string, value: string) => {
    setBatchQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const disputedAssignments = assignments.filter(a => a.status === 'disputed');

  const lowStockItems = useMemo(() => {
    return products.flatMap(p => {
      const minStock = p.minStock ?? 4;
      return inventory
        .filter(i => i.productId === p.id && i.quantity <= minStock && i.quantity > 0)
        .map(i => ({
          product: p,
          seller: users.find(u => u.id === i.sellerId),
          quantity: i.quantity,
          minStock
        }));
    });
  }, [products, inventory, users]);

  // Group inventory by all unique seller IDs present in inventory, not just active users.
  // A product appears only if the seller has stock > 0 OR an active assignment (pending/disputed).
  const sellerInventoryMap = useMemo(() => {
    const sellerIds = Array.from(new Set(inventory.map(i => i.sellerId)));

    return sellerIds.map(sid => {
      const seller = users.find(u => u.id === sid);
      const items = inventory.filter(i => i.sellerId === sid);

      const sellerProducts = products
        .map(p => {
          const qty = items.find(i => i.productId === p.id)?.quantity || 0;
          const hasPendingAssignment = assignments.some(
            a => a.sellerId === sid && a.productId === p.id &&
              (a.status === 'pending' || a.status === 'disputed')
          );
          return { product: p, quantity: qty, value: qty * p.price, hasPendingAssignment };
        })
        .filter(item => item.quantity > 0 || item.hasPendingAssignment);

      return {
        seller: seller || { name: `Vendedor Eliminado`, city: 'N/A', id: sid },
        items: sellerProducts.filter(() => filterSellerId === 'all' || sid === filterSellerId),
        totalValue: sellerProducts.reduce((acc, curr) => acc + curr.value, 0)
      };
    }).filter(group => group.items.length > 0 && (filterSellerId === 'all' || group.seller.id === filterSellerId));
  }, [inventory, users, products, assignments, filterSellerId]);

  const [kardexSeller, setKardexSeller] = useState('all');
  const [kardexProduct, setKardexProduct] = useState('all');

  const filteredKardex = useMemo(() => {
    return kardex.filter(k => {
      const matchSeller = kardexSeller === 'all' || k.sellerId === kardexSeller;
      const matchProduct = kardexProduct === 'all' || k.productId === kardexProduct;
      return matchSeller && matchProduct;
    });
  }, [kardex, kardexSeller, kardexProduct]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Control de Mercancía</h1>
          <p className="text-muted-foreground text-sm">Estado actual de stock por vendedor</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterSellerId} onValueChange={setFilterSellerId}>
            <SelectTrigger className="w-[220px] bg-white border-none shadow-sm rounded-xl h-11">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <SelectValue placeholder="Filtrar Vendedor" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Vendedores</SelectItem>
              {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
                    <Label className="text-[10px] font-bold uppercase">Vendedor</Label>
                    <Select value={adjData.sellerId} onValueChange={(val) => setAdjData({...adjData, sellerId: val})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
          <AlertDescription>Un vendedor reportó una discrepancia en su última carga.</AlertDescription>
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
                  {item.product.name} — {item.seller?.name || 'Vendedor'}: {item.quantity} uds (mín. {item.minStock})
                </span>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="stock">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="kardex">Kardex / Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {sellerInventoryMap.map((group) => (
            <Card key={group.seller.id} className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
              <CardHeader className="bg-muted/30 pb-6 pt-8 px-8 flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground text-xl font-black">
                    {group.seller.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black">{group.seller.name}</CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.seller.city}</p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Unidades</p>
                  <p className="text-2xl font-black tracking-tighter text-primary">
                    {group.items.reduce((acc, curr) => acc + curr.quantity, 0)} <span className="text-xs opacity-50">uds</span>
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 hover:bg-muted/5 transition-colors">
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
                      <div className="flex items-center gap-12">
                         <div className="text-center min-w-[80px]">
                           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Stock</p>
                           <p className={cn(
                             "text-3xl font-black tracking-tighter",
                             item.quantity === 0 ? "text-muted-foreground/20" : 
                             item.quantity < 5 ? "text-orange-500" : "text-foreground"
                           )}>
                             {item.quantity}
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
            </Card>
          ))}
          
          {sellerInventoryMap.length === 0 && (
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
          <Card className="border-none shadow-2xl bg-white sticky top-6 rounded-3xl overflow-hidden border-t-8 border-t-primary">
            <CardHeader className="p-8">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Enviar Mercancía</CardTitle>
                  <p className="text-muted-foreground text-xs font-medium">Asigna stock a tus vendedores</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleBatchAssign} className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Responsable de Recepción</Label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                    <SelectTrigger className="h-14 bg-muted/20 border-none shadow-inner rounded-2xl px-6 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Seleccionar vendedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.city})</SelectItem>)}
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

                <Button type="submit" className="w-full gap-3 h-16 text-lg font-black shadow-xl shadow-primary/20 rounded-2xl transition-all hover:scale-[1.02]" disabled={!selectedSellerId}>
                  <Send className="w-5 h-5" /> Confirmar Envío
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="kardex">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex-1">
                  Historial de Movimientos ({filteredKardex.length})
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select value={kardexSeller} onValueChange={setKardexSeller}>
                    <SelectTrigger className="w-44 h-9 text-xs">
                      <SelectValue placeholder="Vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los vendedores</SelectItem>
                      {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] uppercase">Producto</TableHead>
                    <TableHead className="text-[10px] uppercase">Vendedor</TableHead>
                    <TableHead className="text-[10px] uppercase">Motivo</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Cantidad</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Antes</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Después</TableHead>
                    <TableHead className="text-[10px] uppercase">Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKardex.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic text-sm">
                        Sin movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredKardex.map(entry => {
                      const product = products.find(p => p.id === entry.productId);
                      const seller = users.find(u => u.id === entry.sellerId);
                      const isAddition = entry.type === 'addition';
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{product?.name || entry.productId}</TableCell>
                          <TableCell className="text-xs">{seller?.name || '—'}</TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
