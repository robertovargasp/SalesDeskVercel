
"use client"

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Package, AlertTriangle, CheckCircle2, ArrowUpCircle, ArrowDownCircle, X, Filter, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { MovementReason, InventoryAssignment } from '@/lib/types';

const REASON_LABELS: Record<MovementReason, string> = {
  load: 'Carga',
  sale: 'Venta',
  adjustment: 'Ajuste',
  return: 'Devolución',
  correction: 'Corrección',
};

export default function DeliveryInventoryPage() {
  const { currentUser, inventory, products, assignments, kardex, kardexHasMore, users, updateAssignmentStatus, loadMoreKardex } = useStore();

  const [filterFrom, setFilterFrom]       = useState('');
  const [filterTo, setFilterTo]           = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterReason, setFilterReason]   = useState('');

  const [cancelTarget, setCancelTarget] = useState<InventoryAssignment | null>(null);
  const [cancelNote, setCancelNote]     = useState('');

  const myInventory = inventory.filter(i => i.deliveryPersonId === currentUser?.id);
  const myPendingAssignments = assignments.filter(
    a => a.deliveryPersonId === currentUser?.id && a.status === 'pending'
  );
  const myKardex = kardex.filter(k => k.deliveryPersonId === currentUser?.id);

  const stockRows = useMemo(() => {
    return products
      .map(p => {
        const inv = myInventory.find(i => i.productId === p.id);
        return {
          product: p,
          quantity: inv?.quantity ?? 0,
          reservedQuantity: inv?.reservedQuantity ?? 0,
          available: (inv?.quantity ?? 0) - (inv?.reservedQuantity ?? 0),
        };
      })
      .filter(r => r.quantity > 0);
  }, [products, myInventory]);

  const totalProducts = stockRows.length;
  const totalUnits = stockRows.reduce((s, r) => s + r.quantity, 0);
  const totalAvailable = stockRows.reduce((s, r) => s + r.available, 0);

  // Productos que tienen al menos un movimiento kardex de este repartidor
  const kardexProducts = useMemo(() => {
    const ids = new Set(myKardex.map(k => k.productId));
    return products.filter(p => ids.has(p.id));
  }, [myKardex, products]);

  const filteredKardex = useMemo(() => {
    let result = myKardex;
    if (filterFrom) {
      const from = new Date(filterFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(k => new Date(k.createdAt) >= from);
    }
    if (filterTo) {
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(k => new Date(k.createdAt) <= to);
    }
    if (filterProduct) result = result.filter(k => k.productId === filterProduct);
    if (filterReason)  result = result.filter(k => k.reason === filterReason);
    return result;
  }, [myKardex, filterFrom, filterTo, filterProduct, filterReason]);

  const hasFilters = filterFrom || filterTo || filterProduct || filterReason;

  const clearFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setFilterProduct('');
    setFilterReason('');
  };

  const handleConfirm = (assignmentId: string) => {
    updateAssignmentStatus(assignmentId, 'confirmed');
    toast({ title: 'Recepción confirmada', description: 'El inventario ha sido actualizado.' });
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget || !cancelNote.trim()) return;
    updateAssignmentStatus(cancelTarget.id, 'cancelled', cancelNote.trim());
    toast({ title: 'Asignación cancelada', description: 'No se sumó nada a tu inventario.' });
    setCancelTarget(null);
    setCancelNote('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-headline">Mi Inventario</h1>
        <p className="text-muted-foreground text-sm">Stock asignado a tu cuenta</p>
      </div>

      {/* Header cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 [&_p.text-4xl]:text-2xl [&_p.text-4xl]:sm:text-4xl">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-primary">{totalUnits}</p>
            <p className="text-xs text-muted-foreground">unidades en stock</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-orange-500">Reservado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-orange-500">{totalUnits - totalAvailable}</p>
            <p className="text-xs text-muted-foreground">en pedidos activos</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-green-600">Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-green-600">{totalAvailable}</p>
            <p className="text-xs text-muted-foreground">para nuevas ventas</p>
          </CardContent>
        </Card>
      </div>

      {/* Pendientes de confirmar */}
      {myPendingAssignments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 border-l-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-base font-black text-orange-800">
                Mercancía Pendiente de Confirmar ({myPendingAssignments.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-orange-100">
              {myPendingAssignments.map(a => {
                const product = products.find(p => p.id === a.productId);
                return (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-black">{product?.name ?? a.productId}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.quantity} und · {format(new Date(a.createdAt), 'dd/MM/yy', { locale: es })}
                        {a.notes && ` · ${a.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none gap-1.5 h-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => { setCancelTarget(a); setCancelNote(''); }}
                      >
                        <XCircle className="w-4 h-4" /> Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none gap-1.5 bg-green-600 hover:bg-green-700 h-9"
                        onClick={() => handleConfirm(a.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirmar Recepción
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock actual */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" /> Mi Stock Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stockRows.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center gap-3">
              <div className="bg-muted/50 p-5 rounded-full">
                <Package className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground italic">Sin stock asignado actualmente.</p>
            </div>
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase pl-6">Producto</TableHead>
                  <TableHead className="text-[10px] uppercase">Precio</TableHead>
                  <TableHead className="text-[10px] uppercase text-center">Total</TableHead>
                  <TableHead className="text-[10px] uppercase text-center text-orange-500">Reservado</TableHead>
                  <TableHead className="text-[10px] uppercase text-right pr-6 text-green-600">Disponible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockRows.map(({ product, quantity, reservedQuantity, available }) => {
                  const minStock = product.minStock ?? 4;
                  const isLow = available < minStock;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{product.name}</span>
                          {isLow && (
                            <Badge className="text-[10px] bg-orange-100 text-orange-700 border-0 h-5">
                              STOCK BAJO
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        ${product.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-lg font-black text-foreground">{quantity}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-lg font-black text-orange-500">{reservedQuantity}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className={cn(
                          "text-2xl font-black",
                          available === 0 ? "text-muted-foreground/30" :
                          isLow ? "text-orange-500" : "text-green-600"
                        )}>
                          {available}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">uds</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            {/* Móvil: tarjetas */}
            <div className="md:hidden divide-y">
              {stockRows.map(({ product, quantity, reservedQuantity, available }) => {
                const minStock = product.minStock ?? 4;
                const isLow = available < minStock;
                return (
                  <div key={product.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold truncate">{product.name}</span>
                        {isLow && <Badge className="text-[10px] bg-orange-100 text-orange-700 border-0 h-5 shrink-0">STOCK BAJO</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">${product.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Total</p>
                        <p className="text-lg font-black text-foreground">{quantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase text-orange-500">Reservado</p>
                        <p className="text-lg font-black text-orange-500">{reservedQuantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase text-green-600">Disponible</p>
                        <p className={cn("text-lg font-black", available === 0 ? "text-muted-foreground/30" : isLow ? "text-orange-500" : "text-green-600")}>{available}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Historial Kardex */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Filter className="w-4 h-4" /> Historial
              <span className="text-foreground font-black">
                {hasFilters
                  ? `${filteredKardex.length} de ${myKardex.length} movimientos`
                  : `${myKardex.length} movimientos`}
              </span>
            </CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" /> Limpiar filtros
              </Button>
            )}
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Producto</Label>
              <select
                value={filterProduct}
                onChange={e => setFilterProduct(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todos</option>
                {kardexProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Tipo</Label>
              <select
                value={filterReason}
                onChange={e => setFilterReason(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todos</option>
                {(Object.entries(REASON_LABELS) as [MovementReason, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredKardex.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground italic">
              {hasFilters ? 'Sin movimientos con los filtros aplicados.' : 'Sin movimientos registrados.'}
            </p>
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase pl-6">Fecha</TableHead>
                  <TableHead className="text-[10px] uppercase">Producto</TableHead>
                  <TableHead className="text-[10px] uppercase">Tipo</TableHead>
                  <TableHead className="text-[10px] uppercase">Vendedor</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Cantidad</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Antes</TableHead>
                  <TableHead className="text-[10px] uppercase text-right pr-6">Después</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKardex.map(entry => {
                  const product = products.find(p => p.id === entry.productId);
                  const sellerName = entry.sellerId
                    ? (users.find(u => u.id === entry.sellerId)?.name ?? '—')
                    : '—';
                  const isAddition = entry.type === 'addition';
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{product?.name ?? entry.productId}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[10px] border-0",
                          isAddition ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        )}>
                          {REASON_LABELS[entry.reason]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{sellerName}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-xs font-black flex items-center justify-end gap-1", isAddition ? "text-green-600" : "text-red-600")}>
                          {isAddition ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                          {isAddition ? '+' : '-'}{entry.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{entry.balanceBefore}</TableCell>
                      <TableCell className="text-right text-xs font-bold pr-6">{entry.balanceAfter}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            {/* Móvil: tarjetas */}
            <div className="md:hidden divide-y">
              {filteredKardex.map(entry => {
                const product = products.find(p => p.id === entry.productId);
                const sellerName = entry.sellerId ? (users.find(u => u.id === entry.sellerId)?.name ?? '—') : '—';
                const isAddition = entry.type === 'addition';
                return (
                  <div key={entry.id} className="p-4 space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-bold">{product?.name ?? entry.productId}</p>
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
                      <span>{sellerName}</span>
                      <span>{format(new Date(entry.createdAt), 'dd/MM/yy HH:mm', { locale: es })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
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

      {/* Cancelar asignación pendiente */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelNote(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar asignación</DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  {products.find(p => p.id === cancelTarget.productId)?.name ?? cancelTarget.productId}
                  {' · '}{cancelTarget.quantity} und. No se sumará nada a tu inventario.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Motivo de la cancelación</Label>
            <Textarea
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder="Indica por qué cancelas esta asignación"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelNote(''); }}>
              Cerrar
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelNote.trim()}
              onClick={handleConfirmCancel}
            >
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
