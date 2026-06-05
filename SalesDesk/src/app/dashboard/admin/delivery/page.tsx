
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Truck, CheckCircle2, XCircle, Clock, MapPin, User, Package,
  Phone, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sale } from '@/lib/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  assigned:         { label: 'Por Confirmar', color: 'bg-muted text-muted-foreground' },
  accepted:         { label: 'Confirmada',    color: 'bg-blue-100 text-blue-700' },
  contacting:       { label: 'En Contacto',   color: 'bg-indigo-100 text-indigo-700' },
  scheduled:        { label: 'Agendado',      color: 'bg-purple-100 text-purple-700' },
  in_transit:       { label: 'En Camino',     color: 'bg-orange-100 text-orange-700' },
  delivered:        { label: 'Entregado',     color: 'bg-green-100 text-green-700' },
  paid:             { label: 'Liquidado',     color: 'bg-primary/10 text-primary' },
  cancelled:        { label: 'Cancelado',     color: 'bg-red-100 text-red-700' },
  delivery_failed:  { label: 'Fallo Entrega', color: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={cn("text-[9px] font-black uppercase border-none px-2 h-5", s.color)}>
      {s.label}
    </Badge>
  );
}

export default function AdminDeliveryPage() {
  const { users, sales, products, assignDeliveryPerson } = useStore();
  const deliveryPersons = users.filter(u => u.role === 'delivery');
  const [assigningSaleId, setAssigningSaleId] = useState<string | null>(null);
  const [filterDelivery, setFilterDelivery] = useState('all');

  const assignableSales = useMemo(() =>
    sales.filter(s => !['paid', 'cancelled'].includes(s.status) && !s.deliveryPersonId),
    [sales]
  );

  const assignedSales = useMemo(() =>
    sales.filter(s => !!s.deliveryPersonId),
    [sales]
  );

  const filteredAssigned = filterDelivery === 'all'
    ? assignedSales
    : assignedSales.filter(s => s.deliveryPersonId === filterDelivery);

  const stats = useMemo(() => ({
    active: sales.filter(s => s.deliveryPersonId && !['delivered', 'paid', 'cancelled', 'delivery_failed'].includes(s.status)).length,
    delivered: sales.filter(s => s.status === 'delivered' || s.status === 'paid').length,
    failed: sales.filter(s => s.status === 'delivery_failed').length,
    unassigned: assignableSales.length,
  }), [sales, assignableSales]);

  const getSaleSummary = (sale: Sale) => {
    const itemCount = sale.items.reduce((a, i) => a + i.quantity, 0);
    const names = sale.items.map(i => products.find(p => p.id === i.productId)?.name || 'Producto').join(', ');
    return `${itemCount} pza — ${names}`;
  };

  const deliveryByPerson = useMemo(() => {
    return deliveryPersons.map(dp => ({
      person: dp,
      sales: filteredAssigned.filter(s => s.deliveryPersonId === dp.id)
    })).filter(g => g.sales.length > 0);
  }, [deliveryPersons, filteredAssigned]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Truck className="w-8 h-8 text-primary" /> Paquetería
        </h1>
        <p className="text-muted-foreground text-sm">Control de repartidores y seguimiento logístico</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'En Curso', value: stats.active, icon: Truck, color: 'text-orange-500' },
          { label: 'Entregados', value: stats.delivered, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Fallidos', value: stats.failed, icon: XCircle, color: 'text-red-500' },
          { label: 'Sin Asignar', value: stats.unassigned, icon: Clock, color: 'text-blue-500' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-3xl font-black mt-1">{s.value}</p>
              </div>
              <s.icon className={cn("w-8 h-8", s.color)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {assignableSales.length > 0 && (
        <Card className="border-none shadow-md border-l-4 border-l-blue-400">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Pedidos sin Repartidor ({assignableSales.length})
            </CardTitle>
            <CardDescription>Asigna un repartidor a estos pedidos</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Pedido</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Productos</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Estado</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase pr-6">Asignar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignableSales.map(sale => (
                  <TableRow key={sale.id} className="h-16">
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-black text-sm">#{sale.id.toUpperCase()}</p>
                        <p className="text-[10px] text-muted-foreground">{sale.city}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold">{sale.customerName || 'N/A'}</span>
                      </div>
                      {sale.customerPhone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{sale.customerPhone}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">{getSaleSummary(sale)}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {deliveryPersons.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">Sin repartidores</span>
                      ) : (
                        <Dialog open={assigningSaleId === sale.id} onOpenChange={(open) => setAssigningSaleId(open ? sale.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="h-8 gap-2 text-[11px] font-bold shadow-sm">
                              <Truck className="w-3.5 h-3.5" /> Asignar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xs">
                            <DialogHeader>
                              <DialogTitle>Asignar Repartidor</DialogTitle>
                            </DialogHeader>
                            <p className="text-xs text-muted-foreground mb-2">Pedido #{sale.id.toUpperCase()} — {sale.customerName}</p>
                            <div className="space-y-2">
                              {deliveryPersons.map(dp => (
                                <button
                                  key={dp.id}
                                  className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-primary/5 hover:border-primary/30 text-left transition-colors"
                                  onClick={() => {
                                    assignDeliveryPerson(sale.id, dp.id);
                                    setAssigningSaleId(null);
                                  }}
                                >
                                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {dp.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">{dp.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{dp.city}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Actividad por Repartidor</CardTitle>
            <CardDescription>Seguimiento de entregas asignadas</CardDescription>
          </div>
          <Select value={filterDelivery} onValueChange={setFilterDelivery}>
            <SelectTrigger className="w-52 bg-white border-none shadow-sm rounded-xl h-10">
              <SelectValue placeholder="Todos los repartidores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {deliveryPersons.map(dp => (
                <SelectItem key={dp.id} value={dp.id}>{dp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {deliveryPersons.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Truck className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-muted-foreground italic text-sm">No hay repartidores. Crea uno en Usuarios.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="divide-y">
              {deliveryByPerson.map(({ person, sales: personSales }) => {
                const active = personSales.filter(s => !['delivered', 'paid', 'cancelled', 'delivery_failed'].includes(s.status)).length;
                const failed = personSales.filter(s => s.status === 'delivery_failed').length;
                return (
                  <AccordionItem key={person.id} value={person.id} className="border-none px-6 hover:bg-white/40 transition-colors">
                    <AccordionTrigger className="hover:no-underline py-5">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-black">
                            {person.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-black text-base">{person.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground">{person.city}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-orange-100 text-orange-700 border-none font-bold">{active} activas</Badge>
                          {failed > 0 && <Badge className="bg-red-100 text-red-700 border-none font-bold">{failed} fallidas</Badge>}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase pl-4">Pedido</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Dirección</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {personSales.map(s => (
                            <TableRow key={s.id} className="h-14">
                              <TableCell className="pl-4 font-black text-sm">#{s.id.toUpperCase()}</TableCell>
                              <TableCell>
                                <p className="text-xs font-bold">{s.customerName || 'N/A'}</p>
                                {s.customerPhone && <p className="text-[10px] text-muted-foreground">{s.customerPhone}</p>}
                              </TableCell>
                              <TableCell>
                                {s.customerAddress
                                  ? <p className="text-xs text-muted-foreground max-w-[180px] truncate">{s.customerAddress}</p>
                                  : <span className="text-[10px] italic text-muted-foreground/50">Sin dirección</span>
                                }
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <StatusBadge status={s.status} />
                                  {s.status === 'delivery_failed' && s.failureReason && (
                                    <p className="text-[9px] text-red-500 italic flex items-center gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" /> {s.failureReason}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              {deliveryByPerson.length === 0 && (
                <div className="py-16 text-center">
                  <Package className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground italic text-sm">Sin entregas asignadas aún</p>
                </div>
              )}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
