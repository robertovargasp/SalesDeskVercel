
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Truck, CheckCircle2, XCircle, Clock, MapPin, User, Package,
  Phone, X, DollarSign, TrendingUp, Wallet, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sale } from '@/lib/types';
import { applyDateFilter, DATE_FILTER_LABELS, DateRangeFilter } from '@/lib/date-filters';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  assigned:        { label: 'Por Confirmar', color: 'bg-muted text-muted-foreground' },
  accepted:        { label: 'Confirmada',    color: 'bg-blue-100 text-blue-700' },
  contacting:      { label: 'En Contacto',   color: 'bg-indigo-100 text-indigo-700' },
  scheduled:       { label: 'Agendado',      color: 'bg-purple-100 text-purple-700' },
  in_transit:      { label: 'En Camino',     color: 'bg-orange-100 text-orange-700' },
  delivered:       { label: 'Entregado',     color: 'bg-green-100 text-green-700' },
  paid:            { label: 'Liquidado',     color: 'bg-primary/10 text-primary' },
  cancelled:       { label: 'Cancelado',     color: 'bg-red-100 text-red-700' },
  delivery_failed: { label: 'Fallo Entrega', color: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={cn("text-[9px] font-black uppercase border-none px-2 h-5", s.color)}>
      {s.label}
    </Badge>
  );
}

const EN_RUTA_STATUSES = ['assigned', 'accepted', 'contacting', 'scheduled', 'in_transit'] as const;

export default function AdminDeliveryPage() {
  const { users, sales, products, settlements, assignDeliveryPerson, confirmSettlement } = useStore();
  const deliveryPersons = users.filter(u => u.role === 'delivery');
  const [assigningSaleId, setAssigningSaleId] = useState<string | null>(null);
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterDate, setFilterDate] = useState<'all' | DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dateFilteredSales = useMemo(() => {
    if (filterDate === 'all') return sales;
    const start = customStart ? new Date(customStart) : undefined;
    const end = customEnd ? new Date(customEnd) : undefined;
    return applyDateFilter(sales, filterDate, start, end);
  }, [sales, filterDate, customStart, customEnd]);

  const uniqueCities = useMemo(() =>
    Array.from(new Set(sales.map(s => s.city).filter(Boolean))).sort() as string[],
    [sales]
  );

  const activeProducts = useMemo(() =>
    products.filter(p => (p as any).isActive !== false),
    [products]
  );

  const hasActiveFilters = filterCity !== 'all' || filterProduct !== 'all' || filterDate !== 'all';

  const assignableSales = useMemo(() =>
    dateFilteredSales.filter(s => !['paid', 'cancelled'].includes(s.status) && !s.deliveryPersonId),
    [dateFilteredSales]
  );

  const assignedSales = useMemo(() =>
    dateFilteredSales.filter(s => !!s.deliveryPersonId),
    [dateFilteredSales]
  );

  const filteredAssigned = useMemo(() => {
    let result = filterDelivery === 'all'
      ? assignedSales
      : assignedSales.filter(s => s.deliveryPersonId === filterDelivery);
    if (filterCity !== 'all') result = result.filter(s => s.city === filterCity);
    if (filterProduct !== 'all') result = result.filter(s => s.items.some(i => i.productId === filterProduct));
    return result;
  }, [assignedSales, filterDelivery, filterCity, filterProduct]);

  const financialSummary = useMemo(() => {
    const pendingCobro = dateFilteredSales
      .filter(s => s.status === 'delivered' && !s.settlementId)
      .reduce((sum, s) => sum + s.totalDeposito, 0);
    const totalLiquidado = dateFilteredSales
      .filter(s => s.status === 'paid' || !!s.settlementId)
      .reduce((sum, s) => sum + s.totalDeposito, 0);
    const totalComisiones = dateFilteredSales
      .filter(s => [...EN_RUTA_STATUSES, 'delivered', 'paid'].includes(s.status as any))
      .reduce((sum, s) => sum + s.totalComision, 0);
    const enProceso = dateFilteredSales
      .filter(s => (EN_RUTA_STATUSES as readonly string[]).includes(s.status))
      .length;
    return { pendingCobro, totalLiquidado, totalComisiones, enProceso };
  }, [dateFilteredSales]);

  const pendingSettlements = useMemo(
    () => settlements.filter(s => s.status === 'reported'),
    [settlements]
  );

  const deliveryByPerson = useMemo(() =>
    deliveryPersons
      .map(dp => ({ person: dp, sales: filteredAssigned.filter(s => s.deliveryPersonId === dp.id) }))
      .filter(g => g.sales.length > 0),
    [deliveryPersons, filteredAssigned]
  );

  const getProductsText = (sale: Sale) =>
    sale.items
      .map(i => { const p = products.find(p => p.id === i.productId); return p ? `${p.name} ×${i.quantity}` : null; })
      .filter(Boolean)
      .join(', ') || '—';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Truck className="w-8 h-8 text-primary" /> Paquetería
        </h1>
        <p className="text-muted-foreground text-sm">Control de repartidores y seguimiento logístico</p>
      </div>

      {/* ── Header financiero ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-primary border-l-8 border-l-primary-foreground/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-primary-foreground/70 uppercase flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Pendiente de Cobro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-primary-foreground tracking-tighter">
              ${financialSummary.pendingCobro.toLocaleString()}
            </p>
            <p className="text-[10px] text-primary-foreground/60 mt-2 font-medium">Dinero sin depositar</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-l-8 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Total Liquidado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-green-600 tracking-tighter">
              ${financialSummary.totalLiquidado.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Ingresado a caja</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-l-8 border-l-blue-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Comisiones Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-blue-600 tracking-tighter">
              ${financialSummary.totalComisiones.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">A pagar a repartidores</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-l-8 border-l-orange-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-400" /> Entregas en Proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-orange-500 tracking-tighter">
              {financialSummary.enProceso}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Flujo logístico activo</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pedidos sin repartidor ────────────────────────────────────────────── */}
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
                      <p className="font-black text-sm">#{sale.id.toUpperCase()}</p>
                      <p className="text-[10px] text-muted-foreground">{sale.city}</p>
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
                      <p className="text-xs text-muted-foreground">{getProductsText(sale)}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {deliveryPersons.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">Sin repartidores</span>
                      ) : (
                        <Dialog
                          open={assigningSaleId === sale.id}
                          onOpenChange={open => setAssigningSaleId(open ? sale.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" className="h-8 gap-2 text-[11px] font-bold shadow-sm">
                              <Truck className="w-3.5 h-3.5" /> Asignar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xs">
                            <DialogHeader>
                              <DialogTitle>Asignar Repartidor</DialogTitle>
                            </DialogHeader>
                            <p className="text-xs text-muted-foreground mb-2">
                              Pedido #{sale.id.toUpperCase()} — {sale.customerName}
                            </p>
                            <div className="space-y-2">
                              {deliveryPersons.map(dp => (
                                <button
                                  key={dp.id}
                                  className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-primary/5 hover:border-primary/30 text-left transition-colors"
                                  onClick={() => { assignDeliveryPerson(sale.id, dp.id); setAssigningSaleId(null); }}
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

      {/* ── Actividad por Repartidor ──────────────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Actividad por Repartidor</CardTitle>
              <CardDescription>Seguimiento detallado por etapa de entrega</CardDescription>
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
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterDate} onValueChange={v => setFilterDate(v as 'all' | DateRangeFilter)}>
              <SelectTrigger className="w-44 bg-muted/30 border-none rounded-xl h-9 text-xs">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Todo el tiempo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                {(['today', 'week', 'month', 'custom'] as DateRangeFilter[]).map(k => (
                  <SelectItem key={k} value={k}>{DATE_FILTER_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterDate === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-36 h-9 text-xs bg-muted/30 border-none rounded-xl"
                />
                <span className="text-muted-foreground text-sm font-medium">—</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-36 h-9 text-xs bg-muted/30 border-none rounded-xl"
                />
              </>
            )}
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-44 bg-muted/30 border-none rounded-xl h-9 text-xs">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Todas las ciudades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-44 bg-muted/30 border-none rounded-xl h-9 text-xs">
                <Package className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Todos los productos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {activeProducts.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => { setFilterCity('all'); setFilterProduct('all'); setFilterDate('all'); }}
              >
                <X className="w-3.5 h-3.5" /> Limpiar filtros
              </Button>
            )}
          </div>
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
                const enRuta            = personSales.filter(s => (EN_RUTA_STATUSES as readonly string[]).includes(s.status));
                const entregados        = personSales.filter(s => ['delivered', 'paid'].includes(s.status));
                const pendienteLiquidar = personSales.filter(s => s.status === 'delivered' && !s.settlementId);
                const liquidados        = personSales.filter(s => s.status === 'paid');
                const totalCobrado      = entregados.reduce((sum, s) => sum + s.totalVenta, 0);
                const saldoDepositar    = pendienteLiquidar.reduce((sum, s) => sum + s.totalDeposito, 0);
                const comision          = entregados.reduce((sum, s) => sum + s.totalComision, 0);

                return (
                  <AccordionItem
                    key={person.id}
                    value={person.id}
                    className="border-none px-6 hover:bg-white/40 transition-colors"
                  >
                    <AccordionTrigger className="hover:no-underline py-5">
                      <div className="flex flex-col gap-3 w-full pr-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-black shrink-0">
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
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className="bg-orange-100 text-orange-700 border-none font-bold">
                            {enRuta.length} activas
                          </Badge>
                          <div className="flex gap-2 flex-wrap">
                            <div className="bg-muted/40 rounded-lg px-3 py-1.5 min-w-[100px]">
                              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Total cobrado</p>
                              <p className="text-sm font-semibold text-foreground">${totalCobrado.toLocaleString()}</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg px-3 py-1.5 min-w-[100px]">
                              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">A depositar</p>
                              <p className={cn("text-sm font-semibold", saldoDepositar > 0 ? "text-orange-500" : "text-muted-foreground")}>
                                ${saldoDepositar.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-muted/40 rounded-lg px-3 py-1.5 min-w-[100px]">
                              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Comisión</p>
                              <p className="text-sm font-semibold text-green-600">${comision.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-8 space-y-6">

                      {/* ── EN RUTA ─────────────────────────────────────────── */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center gap-1.5 mb-3 px-1">
                          <Truck className="w-3.5 h-3.5" /> En Ruta
                        </p>
                        {enRuta.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic px-1">Sin pedidos en esta sección</p>
                        ) : (
                          <Table>
                            <TableHeader className="bg-orange-50/60">
                              <TableRow>
                                <TableHead className="text-[10px] font-black uppercase pl-4">Cliente</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Producto(s)</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Ciudad</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">Monto venta</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">Comisión</TableHead>
                                <TableHead className="text-[10px] font-black uppercase pr-4">Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {enRuta.map(s => (
                                <TableRow key={s.id} className="h-12">
                                  <TableCell className="pl-4">
                                    <p className="text-xs font-bold">{s.customerName || 'N/A'}</p>
                                    {s.customerPhone && (
                                      <p className="text-[10px] text-muted-foreground">{s.customerPhone}</p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-xs text-muted-foreground max-w-[160px]">{getProductsText(s)}</p>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-xs text-muted-foreground">{s.city || '—'}</span>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-xs">
                                    ${s.totalVenta.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-xs text-green-600">
                                    ${s.totalComision.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="pr-4">
                                    <StatusBadge status={s.status} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* ── ENTREGADOS — Pendiente de liquidar ──────────────── */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5 mb-3 px-1">
                          <Wallet className="w-3.5 h-3.5" /> Entregados — Pendiente de Liquidar
                        </p>
                        {pendienteLiquidar.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic px-1">Sin pedidos en esta sección</p>
                        ) : (
                          <Table>
                            <TableHeader className="bg-amber-50/60">
                              <TableRow>
                                <TableHead className="text-[10px] font-black uppercase pl-4">Cliente</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Producto(s)</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Ciudad</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">Cobrado</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">A depositar</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right pr-4">Comisión</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendienteLiquidar.map(s => (
                                <TableRow key={s.id} className="h-12">
                                  <TableCell className="pl-4">
                                    <p className="text-xs font-bold">{s.customerName || 'N/A'}</p>
                                    {s.customerPhone && (
                                      <p className="text-[10px] text-muted-foreground">{s.customerPhone}</p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-xs text-muted-foreground max-w-[160px]">{getProductsText(s)}</p>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-xs text-muted-foreground">{s.city || '—'}</span>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-xs">
                                    ${s.totalVenta.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-black text-xs text-orange-600">
                                    ${s.totalDeposito.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-xs text-green-600 pr-4">
                                    ${s.totalComision.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* ── LIQUIDADOS ───────────────────────────────────────── */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 mb-3 px-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Liquidados
                        </p>
                        {liquidados.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic px-1">Sin pedidos en esta sección</p>
                        ) : (
                          <Table>
                            <TableHeader className="bg-primary/5">
                              <TableRow>
                                <TableHead className="text-[10px] font-black uppercase pl-4">Cliente</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Producto(s)</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Ciudad</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">Cobrado</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">Depositado</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right pr-4">Comisión</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {liquidados.map(s => (
                                <TableRow key={s.id} className="h-12">
                                  <TableCell className="pl-4">
                                    <p className="text-xs font-bold">{s.customerName || 'N/A'}</p>
                                    {s.customerPhone && (
                                      <p className="text-[10px] text-muted-foreground">{s.customerPhone}</p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-xs text-muted-foreground max-w-[160px]">{getProductsText(s)}</p>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-xs text-muted-foreground">{s.city || '—'}</span>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-xs">
                                    ${s.totalVenta.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-black text-xs text-primary">
                                    ${s.totalDeposito.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-xs text-green-600 pr-4">
                                    ${s.totalComision.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

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

      {/* ── Liquidaciones Reportadas ──────────────────────────────────────────── */}
      {pendingSettlements.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-500" /> Liquidaciones Reportadas ({pendingSettlements.length})
            </CardTitle>
            <CardDescription>Reportes de depósito pendientes de confirmación</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Repartidor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Período</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Cobrado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Comisión</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Depósito</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSettlements.map(s => {
                  const dp = users.find(u => u.id === s.sellerId);
                  return (
                    <TableRow key={s.id} className="h-16">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {dp?.name.charAt(0) ?? '?'}
                          </div>
                          <p className="font-bold text-sm">{dp?.name ?? 'Repartidor'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{s.weekRange}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.reportedAt
                            ? new Date(s.reportedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                            : '—'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">${s.totalVenta.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-sm text-green-600">${s.totalComision.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-black text-sm text-orange-600">${s.totalDeposito.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="h-8 gap-1.5 text-[11px] font-bold bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Confirmar Liquidación</DialogTitle>
                              <DialogDescription>
                                ¿Confirmar el depósito de{' '}
                                <span className="font-bold text-foreground">{dp?.name ?? 'este repartidor'}</span>{' '}
                                por ${s.totalDeposito.toLocaleString()}? Las ventas vinculadas quedarán como pagadas.
                              </DialogDescription>
                            </DialogHeader>
                            {s.proofUrl && (
                              <div className="rounded-xl overflow-hidden border">
                                <img src={s.proofUrl} alt="Comprobante" className="w-full max-h-48 object-contain" />
                              </div>
                            )}
                            {s.reference && (
                              <p className="text-xs text-muted-foreground">
                                Ref: <span className="font-bold text-foreground">{s.reference}</span>
                              </p>
                            )}
                            <DialogFooter>
                              <Button
                                className="w-full h-10 font-black gap-2 bg-green-600 hover:bg-green-700"
                                onClick={() => confirmSettlement(s.id)}
                              >
                                <CheckCircle2 className="w-4 h-4" /> Confirmar Depósito
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
