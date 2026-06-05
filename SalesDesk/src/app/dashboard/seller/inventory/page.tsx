
"use client"

import { useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SellerInventoryPage() {
  const { currentUser, inventory, products, assignments, updateAssignmentStatus } = useStore();
  const [disputeNotes, setDisputeNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const myInventory = inventory.filter(i => i.sellerId === currentUser?.id);
  const myPendingAssignments = assignments.filter(a => a.sellerId === currentUser?.id && a.status === 'pending');

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

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Stock Disponible
          </CardTitle>
          <CardDescription>Resumen de tus unidades para la venta (Confirmadas)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad Disponible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myInventory.map((item) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {product?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-3 py-1 rounded-full font-bold text-xs",
                        item.quantity < 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      )}>
                        {item.quantity} unidades
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {myInventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-12 text-muted-foreground italic">
                    No tienes inventario confirmado actualmente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
