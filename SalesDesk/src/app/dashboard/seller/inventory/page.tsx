
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, CheckCircle2, AlertTriangle, MessageSquare, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SellerInventoryPage() {
  const { currentUser, inventory, products, assignments, updateAssignmentStatus } = useStore();
  const [disputeNotes, setDisputeNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const myInventory = inventory.filter(i => i.sellerId === currentUser?.id);
  const myPendingAssignments = assignments.filter(a => a.sellerId === currentUser?.id && a.status === 'pending');

  const sellerCity = currentUser?.city?.trim() || 'Sin ciudad';

  const cityStats = useMemo(() => {
    const rows = products
      .map(p => {
        const qty = myInventory.find(i => i.productId === p.id)?.quantity ?? 0;
        return { product: p, quantity: qty };
      })
      .filter(row => row.quantity > 0);
    const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);
    return { city: sellerCity, rows, totalUnits };
  }, [myInventory, products, sellerCity]);

  const handleDispute = () => {
    if (selectedId) {
      updateAssignmentStatus(selectedId, 'disputed', disputeNotes);
      setDisputeNotes('');
      setSelectedId(null);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-headline">Control de Inventario</h1>
        <p className="text-muted-foreground text-sm">Confirma las nuevas cargas y revisa tu stock actual</p>
      </div>

      {myPendingAssignments.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-orange-500 w-5 h-5" />
              <CardTitle className="text-lg">Cargas Pendientes de Confirmación</CardTitle>
            </div>
            <CardDescription>Por favor, verifica que las unidades recibidas coincidan con el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs">Cantidad</TableHead>
                  <TableHead className="text-right text-xs">Acción como Evidencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPendingAssignments.map((a) => {
                  const p = products.find(prod => prod.id === a.productId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium">{p?.name}</TableCell>
                      <TableCell className="text-sm font-bold">{a.quantity} und.</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => updateAssignmentStatus(a.id, 'confirmed')}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Confirmar
                          </Button>
                          <Dialog open={isDialogOpen && selectedId === a.id} onOpenChange={(val) => {
                            setIsDialogOpen(val);
                            if (val) setSelectedId(a.id);
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 gap-1 border-destructive text-destructive hover:bg-destructive/10">
                                <AlertTriangle className="w-3 h-3" /> Discrepancia
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reportar Diferencia de Inventario</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                  Describe qué es lo que no coincide. El administrador recibirá una alerta para coordinar por llamada.
                                </p>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold uppercase">Notas / Observaciones</label>
                                  <Input
                                    placeholder="Ej: Solo llegaron 8 sillas en lugar de 10..."
                                    value={disputeNotes}
                                    onChange={(e) => setDisputeNotes(e.target.value)}
                                  />
                                </div>
                                <Button className="w-full gap-2" variant="destructive" onClick={handleDispute}>
                                  <MessageSquare className="w-4 h-4" /> Reportar y Llamar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Stock por ciudad ──────────────────────────────────────────────── */}
      {cityStats.rows.length > 0 ? (
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-black">{cityStats.city}</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Tu ciudad — stock confirmado</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-muted-foreground uppercase">Total</p>
                <p className="text-2xl font-black text-primary">{cityStats.totalUnits}</p>
                <p className="text-[9px] text-muted-foreground">uds</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {cityStats.rows.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">${product.price.toLocaleString()} c/u</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-black px-3 py-0.5 rounded-full",
                    quantity < (product.minStock ?? 4)
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  )}>
                    {quantity} uds
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center flex flex-col items-center gap-3">
            <div className="bg-muted/50 p-5 rounded-full">
              <Package className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-bold text-sm">Sin stock confirmado</p>
              <p className="text-xs text-muted-foreground italic">
                {sellerCity !== 'Sin ciudad' ? `No tienes unidades disponibles en ${sellerCity}.` : 'No tienes inventario confirmado actualmente.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
