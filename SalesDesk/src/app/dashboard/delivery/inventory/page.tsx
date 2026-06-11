
"use client"

import { useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, AlertTriangle, CheckCircle2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { MovementReason } from '@/lib/types';

const REASON_LABELS: Record<MovementReason, string> = {
  load: 'Carga',
  sale: 'Venta',
  adjustment: 'Ajuste',
  return: 'Devolución',
  correction: 'Corrección',
};

export default function DeliveryInventoryPage() {
  const { currentUser, inventory, products, assignments, kardex, kardexHasMore, updateAssignmentStatus, loadMoreKardex } = useStore();

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

  const handleConfirm = (assignmentId: string) => {
    updateAssignmentStatus(assignmentId, 'confirmed');
    toast({ title: 'Recepción confirmada', description: 'El inventario ha sido actualizado.' });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-headline">Mi Inventario</h1>
        <p className="text-muted-foreground text-sm">Stock asignado a tu cuenta</p>
      </div>

      {/* Header cards */}
      <div className="grid grid-cols-3 gap-4">
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
                  <div key={a.id} className="flex items-center justify-between px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-black">{product?.name ?? a.productId}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.quantity} und · {format(new Date(a.createdAt), 'dd/MM/yy', { locale: es })}
                        {a.notes && ` · ${a.notes}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700 h-9"
                      onClick={() => handleConfirm(a.id)}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirmar Recepción
                    </Button>
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
          )}
        </CardContent>
      </Card>

      {/* Historial Kardex */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase text-muted-foreground">
            Historial ({myKardex.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {myKardex.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground italic">Sin movimientos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase pl-6">Fecha</TableHead>
                  <TableHead className="text-[10px] uppercase">Producto</TableHead>
                  <TableHead className="text-[10px] uppercase">Tipo</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Cantidad</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Antes</TableHead>
                  <TableHead className="text-[10px] uppercase text-right pr-6">Después</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myKardex.map(entry => {
                  const product = products.find(p => p.id === entry.productId);
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
    </div>
  );
}
