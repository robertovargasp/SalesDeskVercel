"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Truck, CheckCircle2, XCircle, Clock, MapPin, User, Package,
  Phone, AlertTriangle, SlidersHorizontal, X, CalendarDays, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sale } from '@/lib/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  assigned:        { label: 'Por Confirmar', color: 'bg-muted text-muted-foreground' },
  accepted:        { label: 'Confirmada',    color: 'bg-blue-100 text-blue-700' },
  contacting:      { label: 'En Contacto',   color: 'bg-indigo-100 text-indigo-700' },
  scheduled:       { label: 'Agendado',      color: 'bg-purple-100 text-purple-700' },
  in_transit:      { label: 'En Camino',     color: 'bg-orange-100 text-orange-700' },
  delivered:       { label: 'Entregado',     color: 'bg-green-100 text-green-700' },
  paid:            { label: 'Liquidado',     color: 'bg-primary/10 text-primary' },
  cancelled:       { label: 'Cancelado',     color: 'bg-red-100 text-red-700' },
  delivery_failed: { label: 'Fallido', color: 'bg-red-100 text-red-800' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'en_ruta',    label: 'En Ruta',    statuses: ['accepted', 'contacting', 'scheduled', 'in_transit'] },
  { value: 'completada', label: 'Completada', statuses: ['delivered', 'delivery_confirmed'] },
  { value: 'liquidada',  label: 'Liquidada',  statuses: ['paid'] },
  { value: 'cancelada',  label: 'Cancelada',  statuses: ['cancelled'] },
  { value: 'fallida',    label: 'Fallida',    statuses: ['delivery_failed'] },
];

function StatusBadge({ status, failureReason }: { status: string; failureReason?: string | null }) {
  let label: string;
  let color: string;
  if (status === 'delivery_failed') {
    label = failureReason?.startsWith('Rechazado') ? 'Rechazado' : 'Fallido';
    color = 'bg-red-100 text-red-800';
  } else {
    const s = STATUS_LABELS[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
    label = s.label;
    color = s.color;
  }
  return (
    <Badge className={cn("text-[9px] font-black uppercase border-none px-2 h-5", color)}>
      {label}
    </Badge>
  );
}

export default function SellerDeliveryPage() {
  const { users, sales, products, assignDeliveryPerson } = useStore();
  const deliveryPersons = users.filter(u => u.role === 'delivery');

  const [assigningSaleId, setAssigningSaleId] = useState<string | null>(null);
  const [detailSaleId, setDetailSaleId] = useState<string | null>(null);

  // ── Filtros ──────────────────────────────────────────────────────────
  const [filterMetric, setFilterMetric] = useState<string | null>(null);
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatusPills, setFilterStatusPills] = useState<string[]>([]);
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');

  // ── Datos base ───────────────────────────────────────────────────────
  const assignableSales = useMemo(() =>
    sales.filter(s => !['paid', 'cancelled'].includes(s.status) && !s.deliveryPersonId),
    [sales]
  );

  const assignedSales = useMemo(() =>
    sales.filter(s => !!s.deliveryPersonId),
    [sales]
  );

  const stats = useMemo(() => ({
    active:     sales.filter(s => s.deliveryPersonId && !['delivered', 'paid', 'cancelled', 'delivery_failed'].includes(s.status)).length,
    delivered:  sales.filter(s => s.status === 'delivered' || s.status === 'paid').length,
    failed:     sales.filter(s => s.status === 'delivery_failed').length,
    unassigned: assignableSales.length,
  }), [sales, assignableSales]);

  const salesCities = useMemo(() =>
    [...new Set(sales.map(s => s.city).filter(Boolean) as string[])].sort(),
    [sales]
  );

  // ── Filtrado combinado para "Actividad por Repartidor" ───────────────
  const filteredForActivity = useMemo(() => {
    const STATUS_GROUPS: Record<string, string[]> = {
      en_ruta:    ['accepted', 'contacting', 'scheduled', 'in_transit'],
      completada: ['delivered', 'delivery_confirmed'],
      liquidada:  ['paid'],
      cancelada:  ['cancelled'],
      fallida:    ['delivery_failed'],
    };
    let result = assignedSales;
    if (filterMetric === 'active')         result = result.filter(s => !['delivered', 'paid', 'cancelled', 'delivery_failed'].includes(s.status));
    else if (filterMetric === 'delivered') result = result.filter(s => ['delivered', 'paid'].includes(s.status));
    else if (filterMetric === 'failed')    result = result.filter(s => s.status === 'delivery_failed');
    if (filterDelivery !== 'all') result = result.filter(s => s.deliveryPersonId === filterDelivery);
    if (filterCity !== 'all')     result = result.filter(s => s.city?.toLowerCase() === filterCity.toLowerCase());
    if (filterStatusPills.length > 0) {
      const allowed = filterStatusPills.flatMap(sv => STATUS_GROUPS[sv] ?? []);
      result = result.filter(s => allowed.includes(s.status));
    }
    if (filterProduct !== 'all') result = result.filter(s => s.items.some(i => i.productId === filterProduct));
    if (filterDateFrom) result = result.filter(s => new Date(s.createdAt).toLocaleDateString('en-CA') >= filterDateFrom);
    if (filterDateTo)   result = result.filter(s => new Date(s.createdAt).toLocaleDateString('en-CA') <= filterDateTo);
    if (filterAmountMin) result = result.filter(s => s.totalVenta >= Number(filterAmountMin));
    if (filterAmountMax) result = result.filter(s => s.totalVenta <= Number(filterAmountMax));
    return result;
  }, [assignedSales, filterMetric, filterDelivery, filterCity, filterStatusPills, filterProduct, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  const hasActiveFilters =
    filterMetric !== null || filterDelivery !== 'all' || filterCity !== 'all' ||
    filterStatusPills.length > 0 || filterProduct !== 'all' ||
    !!filterDateFrom || !!filterDateTo || !!filterAmountMin || !!filterAmountMax;

  const clearFilters = () => {
    setFilterMetric(null);
    setFilterDelivery('all');
    setFilterCity('all');
    setFilterStatusPills([]);
    setFilterProduct('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  const toggleMetric = (key: string) => setFilterMetric(prev => prev === key ? null : key);
  const toggleStatusPill = (v: string) =>
    setFilterStatusPills(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const getSaleSummary = (sale: Sale) => {
    const itemCount = sale.items.reduce((a, i) => a + i.quantity, 0);
    const names = sale.items.map(i => products.find(p => p.id === i.productId)?.name || 'Producto').join(', ');
    return `${itemCount} pza — ${names}`;
  };

  const deliveryByPerson = useMemo(() =>
    deliveryPersons
      .map(dp => ({ person: dp, sales: filteredForActivity.filter(s => s.deliveryPersonId === dp.id) }))
      .filter(g => g.sales.length > 0),
    [deliveryPersons, filteredForActivity]
  );

  const detailSale = sales.find(s => s.id === detailSaleId) ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Truck className="w-8 h-8 text-primary" /> Asignar Repartidores
        </h1>
        <p className="text-muted-foreground text-sm">Asigna y gestiona la entrega de tus ventas</p>
      </div>

      {/* ── Métricas clickeables (2c) ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { key: 'active',     label: 'En Curso',    value: stats.active,     icon: Truck,        color: 'text-orange-500', bg: 'bg-orange-50' },
          { key: 'delivered',  label: 'Entregados',  value: stats.delivered,  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50'  },
          { key: 'failed',     label: 'Fallidos',    value: stats.failed,     icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50'    },
          { key: 'unassigned', label: 'Sin Asignar', value: stats.unassigned, icon: Clock,        color: 'text-blue-500',   bg: 'bg-blue-50'   },
        ] as const).map(m => {
          const isActive = filterMetric === m.key;
          const isClickable = m.key !== 'unassigned' && m.value > 0;
          return (
            <Card
              key={m.key}
              className={cn(
                "border-none shadow-sm transition-all",
                isClickable ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : "",
                isActive ? "ring-2 ring-primary shadow-md" : ""
              )}
              onClick={() => isClickable && toggleMetric(m.key)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <p className={cn("text-3xl font-black mt-1", isActive && "text-primary")}>{m.value}</p>
                  {isClickable && (
                    <p className={cn("text-[10px] mt-1 font-bold", isActive ? "text-primary" : "text-muted-foreground")}>
                      {isActive ? "Filtrando ✓" : "Click para filtrar"}
                    </p>
                  )}
                </div>
                <div className={cn("p-3 rounded-xl", m.bg)}>
                  <m.icon className={cn("w-6 h-6", m.color)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Ventas sin repartidor ─────────────────────────────────────── */}
      {assignableSales.length > 0 && (
        <Card className="border-none shadow-md border-l-4 border-l-blue-400">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Ventas sin Repartidor ({assignableSales.length})
            </CardTitle>
            <CardDescription>Asigna un repartidor a estas ventas</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Venta</TableHead>
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
                      <button className="text-left group" onClick={() => setDetailSaleId(sale.id)}>
                        <p className="font-black text-sm group-hover:text-primary transition-colors">
                          #{sale.id.toUpperCase().slice(0, 8)}
                        </p>
                        <p className="text-[10px] text-primary font-bold">Ver detalle →</p>
                      </button>
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
                      <StatusBadge status={sale.status} failureReason={sale.failureReason} />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {deliveryPersons.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">Sin repartidores</span>
                      ) : (
                        <Dialog
                          open={assigningSaleId === sale.id}
                          onOpenChange={(open) => setAssigningSaleId(open ? sale.id : null)}
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
                              Venta #{sale.id.toUpperCase().slice(0, 8)} — {sale.customerName}
                            </p>
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

      {assignableSales.length === 0 && assignedSales.length === 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="py-20 text-center flex flex-col items-center gap-3">
            <Package className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-muted-foreground italic text-sm">No tienes ventas activas para asignar.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Barra de filtros globales (2b) ────────────────────────────── */}
      {assignedSales.length > 0 && (
        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filtros — Actividad
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Mostrando{' '}
                  <span className="font-black text-foreground">{filteredForActivity.length}</span>
                  {' '}de{' '}
                  <span className="font-bold">{assignedSales.length}</span>
                  {' '}entregas asignadas
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5"
                  >
                    <X className="w-3 h-3" /> Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Repartidor</label>
                <Select value={filterDelivery} onValueChange={setFilterDelivery}>
                  <SelectTrigger className="h-9 rounded-xl border-none bg-muted/30 text-xs font-medium">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {deliveryPersons.map(dp => (
                      <SelectItem key={dp.id} value={dp.id}>{dp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Ciudad</label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="h-9 rounded-xl border-none bg-muted/30 text-xs font-medium">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ciudades</SelectItem>
                    {salesCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Producto</label>
                <Select value={filterProduct} onValueChange={setFilterProduct}>
                  <SelectTrigger className="h-9 rounded-xl border-none bg-muted/30 text-xs font-medium">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los productos</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Estado</label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {STATUS_FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleStatusPill(opt.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase border transition-all",
                        filterStatusPills.includes(opt.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-transparent hover:border-primary/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Rango de Fechas</label>
                <div className="flex gap-2">
                  <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="h-9 rounded-xl border-none bg-muted/30 text-xs" />
                  <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="h-9 rounded-xl border-none bg-muted/30 text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Monto Cobrado ($)</label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Mín" value={filterAmountMin}
                    onChange={e => setFilterAmountMin(e.target.value)}
                    className="h-9 rounded-xl border-none bg-muted/30 text-xs" />
                  <Input type="number" placeholder="Máx" value={filterAmountMax}
                    onChange={e => setFilterAmountMax(e.target.value)}
                    className="h-9 rounded-xl border-none bg-muted/30 text-xs" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Actividad por repartidor ──────────────────────────────────── */}
      {assignedSales.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Actividad por Repartidor</CardTitle>
            <CardDescription>Seguimiento de tus ventas asignadas</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {deliveryByPerson.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground italic text-sm">
                  {hasActiveFilters ? 'Sin entregas que coincidan con los filtros' : 'Sin entregas asignadas aún'}
                </p>
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
                              <TableHead className="text-[10px] font-black uppercase pl-4">Venta</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Dirección</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Estado</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase pr-4">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {personSales.map(s => (
                              <TableRow key={s.id} className="h-14">
                                <TableCell className="pl-4">
                                  <button className="text-left group" onClick={() => setDetailSaleId(s.id)}>
                                    <p className="font-black text-sm group-hover:text-primary transition-colors">
                                      #{s.id.toUpperCase().slice(0, 8)}
                                    </p>
                                    <p className="text-[10px] text-primary font-bold">Ver detalle →</p>
                                  </button>
                                </TableCell>
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
                                    <StatusBadge status={s.status} failureReason={s.failureReason} />
                                    {s.status === 'delivery_failed' && s.failureReason && (
                                      <p className="text-[9px] text-red-500 italic flex items-center gap-1">
                                        <AlertTriangle className="w-2.5 h-2.5" /> {s.failureReason}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                  {s.status === 'delivered' || s.status === 'paid' ? (
                                    <span className="text-[10px] font-black uppercase text-green-600">✓ Entregado</span>
                                  ) : s.status === 'cancelled' ? (
                                    <span className="text-[10px] font-black uppercase text-red-500">Cancelado</span>
                                  ) : s.status === 'delivery_failed' ? (
                                    <span className="text-[10px] font-black uppercase text-red-500">Fallido</span>
                                  ) : s.status === 'pending_return' ? (
                                    <span className="text-[10px] font-black uppercase text-orange-500">Pendiente Devolución</span>
                                  ) : s.status === 'in_transit' ? (
                                    <Dialog
                                      open={assigningSaleId === s.id}
                                      onOpenChange={(open) => setAssigningSaleId(open ? s.id : null)}
                                    >
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 font-bold border-blue-200 text-blue-600 hover:bg-blue-50">
                                          <Truck className="w-3 h-3" /> Reasignar
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-xs">
                                        <DialogHeader>
                                          <DialogTitle>Reasignar Repartidor</DialogTitle>
                                        </DialogHeader>
                                        <p className="text-xs text-muted-foreground mb-2">
                                          Venta #{s.id.toUpperCase().slice(0, 8)} — {s.customerName}
                                        </p>
                                        <div className="space-y-2">
                                          {deliveryPersons.map(dp => {
                                            const isCurrent = s.deliveryPersonId === dp.id;
                                            return (
                                              <button
                                                key={dp.id}
                                                className={cn(
                                                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                                                  isCurrent ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted/50"
                                                )}
                                                onClick={() => {
                                                  assignDeliveryPerson(s.id, dp.id);
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
                                                {isCurrent && <span className="ml-auto text-[10px] font-black text-primary">Actual</span>}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialog de detalle de entrega (2a) ────────────────────────── */}
      <Dialog open={!!detailSaleId} onOpenChange={(open) => { if (!open) setDetailSaleId(null); }}>
        <DialogContent className="max-w-lg">
          {detailSale && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Package className="w-5 h-5 text-primary" />
                  Detalle — #{detailSale.id.toUpperCase().slice(0, 8)}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{detailSale.city || 'Sin ciudad'}</span>
                    <span className="mx-0.5 text-muted-foreground">·</span>
                    <StatusBadge status={detailSale.status} failureReason={detailSale.failureReason} />
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-1">
                {/* Productos */}
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Productos</p>
                  <div className="rounded-xl bg-muted/30 divide-y overflow-hidden">
                    {detailSale.items.map((item, idx) => {
                      const p = products.find(prod => prod.id === item.productId);
                      return (
                        <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-bold">{p?.name || 'Producto'}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5">×{item.quantity}</Badge>
                          </div>
                          <span className="text-sm font-black text-primary">${item.subtotal.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Montos */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center bg-primary/5 rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Cobrado</p>
                    <p className="text-lg font-black text-primary mt-1">${detailSale.totalVenta.toLocaleString()}</p>
                  </div>
                  <div className="text-center bg-blue-50 rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Comisión</p>
                    <p className="text-lg font-black text-blue-600 mt-1">${detailSale.totalComision.toLocaleString()}</p>
                  </div>
                  <div className="text-center bg-green-50 rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">A liquidar</p>
                    <p className="text-lg font-black text-green-600 mt-1">${detailSale.totalDeposito.toLocaleString()}</p>
                  </div>
                </div>
                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 mb-1">
                      <CalendarDays className="w-3.5 h-3.5" /> Creado
                    </p>
                    <p className="text-sm font-bold">
                      {new Date(detailSale.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  {detailSale.deliveryDate && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Truck className="w-3.5 h-3.5" /> Entrega acordada
                      </p>
                      <p className="text-sm font-bold">{detailSale.deliveryDate}</p>
                      {detailSale.deliveryTime && (
                        <p className="text-xs text-muted-foreground">{detailSale.deliveryTime}</p>
                      )}
                    </div>
                  )}
                </div>
                {/* Comentario del repartidor */}
                {detailSale.notes && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 mb-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Comentario
                    </p>
                    <p className="text-sm italic bg-muted/30 rounded-xl px-4 py-3">"{detailSale.notes}"</p>
                  </div>
                )}
                {/* Motivo de fallo */}
                {detailSale.failureReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-black uppercase text-red-600 flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Motivo de fallo
                    </p>
                    <p className="text-sm text-red-700 font-medium">{detailSale.failureReason}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
