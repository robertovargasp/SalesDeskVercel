
"use client"

import { useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, MapPin, Users } from 'lucide-react';

export default function SellerInventoryPage() {
  const { inventory, products, users, sales, currentUser } = useStore();

  const mySales = sales.filter(s => s.sellerId === currentUser?.id);
  const linkedDeliveryIds = Array.from(new Set(
    mySales.map(s => s.deliveryPersonId).filter(Boolean) as string[]
  ));

  const deliveryInventoryGroups = useMemo(() => {
    return linkedDeliveryIds.map(dpId => {
      const person = users.find(u => u.id === dpId);
      const items = inventory.filter(i => i.deliveryPersonId === dpId);
      const rows = products
        .map(p => {
          const inv = items.find(i => i.productId === p.id);
          return {
            product: p,
            total: inv?.quantity ?? 0,
            reserved: inv?.reservedQuantity ?? 0,
            available: (inv?.quantity ?? 0) - (inv?.reservedQuantity ?? 0),
          };
        })
        .filter(r => r.total > 0);
      return {
        person: person || { id: dpId, name: 'Repartidor', city: '—' },
        rows,
        totalUnits: rows.reduce((s, r) => s + r.total, 0),
        totalReserved: rows.reduce((s, r) => s + r.reserved, 0),
        totalAvailable: rows.reduce((s, r) => s + r.available, 0),
      };
    }).filter(g => g.rows.length > 0);
  }, [linkedDeliveryIds, inventory, products, users]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-headline">Inventario de Repartidores</h1>
        <p className="text-muted-foreground text-sm">Stock de los repartidores asignados a tus pedidos</p>
      </div>

      {linkedDeliveryIds.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center flex flex-col items-center gap-3">
            <div className="bg-muted/50 p-5 rounded-full">
              <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-bold text-sm">Sin repartidores asignados</p>
              <p className="text-xs text-muted-foreground italic">
                Aún no tienes pedidos con repartidor asignado.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : deliveryInventoryGroups.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center flex flex-col items-center gap-3">
            <div className="bg-muted/50 p-5 rounded-full">
              <Package className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-bold text-sm">Sin stock registrado</p>
              <p className="text-xs text-muted-foreground italic">
                Los repartidores asignados no tienen inventario confirmado actualmente.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {deliveryInventoryGroups.map(({ person, rows, totalUnits, totalReserved, totalAvailable }) => (
            <Card key={person.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-xl">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black">{person.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{person.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
                      <p className="text-xl font-black text-foreground">{totalUnits}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Reservado</p>
                      <p className="text-xl font-black text-orange-500">{totalReserved}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Disponible</p>
                      <p className="text-xl font-black text-green-600">{totalAvailable}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[10px] font-black uppercase pl-6">Producto</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center text-muted-foreground">Total</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center text-orange-500">Reservado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right pr-6 text-green-600">Disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ product, total, reserved, available }) => (
                      <TableRow key={product.id} className="hover:bg-muted/10">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-bold">{product.name}</p>
                              <p className="text-[10px] text-muted-foreground">${product.price.toLocaleString()} c/u</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-black text-muted-foreground">{total}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-black text-orange-500">{reserved}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span className={
                            available === 0
                              ? "text-2xl font-black text-muted-foreground/30"
                              : available < (product.minStock ?? 4)
                              ? "text-2xl font-black text-orange-500"
                              : "text-2xl font-black text-green-600"
                          }>
                            {available}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">uds</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
