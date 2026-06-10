"use client"

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ShoppingBag, DollarSign, Users, MapPin, Calendar,
  TrendingUp, CheckCircle2, Truck, XCircle, Clock,
  FileSpreadsheet, X,
} from 'lucide-react';
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SaleStatus } from '@/lib/types';

type Period = 'today' | 'week' | 'month' | 'custom';
type SortOrder = 'recent' | 'oldest' | 'highest' | 'lowest';
type StatusGroup = 'all' | 'en_ruta' | 'entregado' | 'completado' | 'cancelado' | 'fallido';

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'today',  label: 'Hoy' },
  { key: 'week',   label: 'Esta semana' },
  { key: 'month',  label: 'Este mes' },
  { key: 'custom', label: 'Personalizado' },
];

const PERIOD_SLUG: Record<Period, string> = {
  today:  'hoy',
  week:   'semana',
  month:  'mes',
  custom: 'personalizado',
};

const STATUS_GROUP_MAP: Record<StatusGroup, string[]> = {
  all:        [],
  en_ruta:    ['assigned', 'accepted', 'contacting', 'scheduled', 'in_transit'],
  entregado:  ['delivered', 'delivery_confirmed'],
  completado: ['paid'],
  cancelado:  ['cancelled'],
  fallido:    ['delivery_failed'],
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  assigned:           { label: 'Por Confirmar', color: 'bg-muted text-muted-foreground',  icon: Clock        },
  accepted:           { label: 'Confirmada',    color: 'bg-blue-100 text-blue-700',       icon: Truck        },
  contacting:         { label: 'En Contacto',   color: 'bg-indigo-100 text-indigo-700',   icon: Truck        },
  scheduled:          { label: 'Agendado',      color: 'bg-purple-100 text-purple-700',   icon: Calendar     },
  in_transit:         { label: 'En Camino',     color: 'bg-orange-100 text-orange-700',   icon: Truck        },
  delivered:          { label: 'Entregado',     color: 'bg-green-100 text-green-700',     icon: CheckCircle2 },
  delivery_confirmed: { label: 'Entregado',     color: 'bg-green-100 text-green-700',     icon: CheckCircle2 },
  paid:               { label: 'Completado',    color: 'bg-primary/10 text-primary',      icon: CheckCircle2 },
  cancelled:          { label: 'Cancelado',     color: 'bg-red-100 text-red-700',         icon: XCircle      },
  delivery_failed:    { label: 'Fallido',       color: 'bg-red-100 text-red-800',         icon: XCircle      },
};

function getSaleStatusLabel(status: SaleStatus, failureReason?: string | null): string {
  if (status === 'delivery_failed')
    return failureReason?.startsWith('Rechazado') ? 'Rechazado' : 'Fallido';
  return STATUS_CONFIG[status]?.label ?? status;
}

function StatusBadge({ status, failureReason }: { status: SaleStatus; failureReason?: string | null }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={cn('text-[9px] font-black uppercase border-none px-2 h-5', cfg.color)}>
      {getSaleStatusLabel(status, failureReason)}
    </Badge>
  );
}

export default function SellerSettlementsPage() {
  const { currentUser, sales, products, users } = useStore();

  const [period, setPeriod]               = useState<Period>('week');
  const [customFrom, setCustomFrom]       = useState('');
  const [customTo, setCustomTo]           = useState('');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterStatus, setFilterStatus]   = useState<StatusGroup>('all');
  const [filterCity, setFilterCity]       = useState('all');
  const [sortOrder, setSortOrder]         = useState<SortOrder>('recent');

  const mySales = useMemo(
    () => sales.filter(s => s.sellerId === currentUser?.id),
    [sales, currentUser]
  );

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === 'today') return startOfDay(now);
    if (period === 'week')  return startOfWeek(now, { weekStartsOn: 1 });
    if (period === 'month') return startOfMonth(now);
    return null;
  }, [period]);

  const periodSales = useMemo(() => {
    if (period === 'custom') {
      const from = customFrom ? new Date(customFrom + 'T00:00:00') : null;
      const to   = customTo   ? new Date(customTo   + 'T23:59:59') : null;
      return mySales.filter(s => {
        const d = new Date(s.createdAt);
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      });
    }
    if (!periodStart) return mySales;
    return mySales.filter(s => new Date(s.createdAt) >= periodStart);
  }, [mySales, period, periodStart, customFrom, customTo]);

  const deliveryPersonsInPeriod = useMemo(() => {
    const ids = new Set(periodSales.map(s => s.deliveryPersonId).filter(Boolean) as string[]);
    return users.filter(u => ids.has(u.id) && u.role === 'delivery');
  }, [periodSales, users]);

  const citiesInPeriod = useMemo(
    () => Array.from(new Set(periodSales.map(s => s.city).filter(Boolean))).sort() as string[],
    [periodSales]
  );

  const filteredSales = useMemo(() => {
    let result = [...periodSales];
    if (filterDelivery !== 'all')
      result = result.filter(s => s.deliveryPersonId === filterDelivery);
    if (filterStatus !== 'all')
      result = result.filter(s => STATUS_GROUP_MAP[filterStatus].includes(s.status));
    if (filterCity !== 'all')
      result = result.filter(s => s.city === filterCity);
    return result;
  }, [periodSales, filterDelivery, filterStatus, filterCity]);

  const sortedSales = useMemo(() => {
    const arr = [...filteredSales];
    if (sortOrder === 'recent')  arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortOrder === 'oldest')  arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sortOrder === 'highest') arr.sort((a, b) => b.totalVenta - a.totalVenta);
    if (sortOrder === 'lowest')  arr.sort((a, b) => a.totalVenta - b.totalVenta);
    return arr;
  }, [filteredSales, sortOrder]);

  const metrics = useMemo(() => ({
    totalVentas:   filteredSales.length,
    totalVenta:    filteredSales.reduce((s, v) => s + v.totalVenta, 0),
    totalComision: filteredSales.reduce((s, v) => s + v.totalComision, 0),
    entregadas:    filteredSales.filter(s => ['delivered', 'delivery_confirmed', 'paid'].includes(s.status)).length,
  }), [filteredSales]);

  const citySummary = useMemo(() => {
    const map = new Map<string, { city: string; delivery: string; count: number; totalVenta: number; totalComision: number }>();
    for (const s of filteredSales) {
      const city = s.city?.trim() || 'Sin ciudad';
      const deliveryId = s.deliveryPersonId ?? '';
      const deliveryName = deliveryId
        ? (users.find(u => u.id === deliveryId)?.name ?? 'Repartidor')
        : 'Sin asignar';
      const key = `${city}||${deliveryId}`;
      const prev = map.get(key) ?? { city, delivery: deliveryName, count: 0, totalVenta: 0, totalComision: 0 };
      map.set(key, { ...prev, count: prev.count + 1, totalVenta: prev.totalVenta + s.totalVenta, totalComision: prev.totalComision + s.totalComision });
    }
    return Array.from(map.values()).sort((a, b) => b.totalVenta - a.totalVenta);
  }, [filteredSales, users]);

  const hasFilters = filterDelivery !== 'all' || filterStatus !== 'all' || filterCity !== 'all';

  const clearFilters = () => {
    setFilterDelivery('all');
    setFilterStatus('all');
    setFilterCity('all');
    setSortOrder('recent');
  };

  const handleExport = () => {
    const rows = sortedSales.map(s => {
      const deliveryName = s.deliveryPersonId
        ? (users.find(u => u.id === s.deliveryPersonId)?.name ?? 'Repartidor')
        : 'Sin asignar';
      const productos = s.items.map(item => {
        const p = products.find(prod => prod.id === item.productId);
        return `${p?.name || 'Producto'} ×${item.quantity}`;
      }).join(', ');
      return {
        'Fecha':               format(new Date(s.createdAt), 'dd/MM/yyyy'),
        'Cliente':             s.customerName || '',
        'Ciudad':              s.city || '',
        'Productos':           productos,
        'Repartidor':          deliveryName,
        'Estado':              getSaleStatusLabel(s.status as SaleStatus, s.failureReason),
        'Total Cobrado':       s.totalVenta,
        'Comisión Repartidor': s.totalComision,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `reporte-ventas-${PERIOD_SLUG[period]}-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-16">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Mis Ventas</h1>
          <p className="text-muted-foreground text-sm">Reporte de desempeño — solo lectura</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 font-bold h-9"
            onClick={handleExport}
            disabled={sortedSales.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all',
                    period === opt.key
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="h-9 rounded-xl border bg-card text-xs px-3 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-xs text-muted-foreground font-bold">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="h-9 rounded-xl border bg-card text-xs px-3 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas',                   value: metrics.totalVentas,                              icon: ShoppingBag,  color: 'text-primary',    bg: 'bg-primary/10' },
          { label: 'Total Ventas',             value: `$${metrics.totalVenta.toLocaleString()}`,        icon: DollarSign,   color: 'text-green-600',  bg: 'bg-green-50'   },
          { label: 'Comisiones Repartidores',  value: `$${metrics.totalComision.toLocaleString()}`,     icon: Users,        color: 'text-orange-600', bg: 'bg-orange-50'  },
          { label: 'Entregadas',               value: metrics.entregadas,                               icon: CheckCircle2, color: 'text-blue-600',   bg: 'bg-blue-50'    },
        ].map((m, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{m.label}</p>
                <p className="text-2xl font-black mt-1">{m.value}</p>
              </div>
              <div className={cn('p-3 rounded-xl', m.bg)}>
                <m.icon className={cn('w-5 h-5', m.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-2xl border border-muted/40">
        <Select value={filterDelivery} onValueChange={setFilterDelivery}>
          <SelectTrigger className="w-44 h-9 bg-card border shadow-sm text-xs">
            <Truck className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Repartidor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los repartidores</SelectItem>
            {deliveryPersonsInPeriod.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as StatusGroup)}>
          <SelectTrigger className="w-36 h-9 bg-card border shadow-sm text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="en_ruta">En Ruta</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="completado">Liquidado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="fallido">Fallido</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-40 h-9 bg-card border shadow-sm text-xs">
            <MapPin className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {citiesInPeriod.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={v => setSortOrder(v as SortOrder)}>
          <SelectTrigger className="w-44 h-9 bg-card border shadow-sm text-xs">
            <SelectValue placeholder="Orden" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más reciente</SelectItem>
            <SelectItem value="oldest">Más antiguo</SelectItem>
            <SelectItem value="highest">Mayor monto</SelectItem>
            <SelectItem value="lowest">Menor monto</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={clearFilters}
          >
            <X className="w-3 h-3" /> Limpiar
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground font-bold">
          Mostrando {filteredSales.length} de {periodSales.length} pedidos
        </span>
      </div>

      {/* ── Ventas por Ciudad × Repartidor ───────────────────────────────── */}
      {citySummary.length > 0 && (
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Ventas por Ciudad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Ciudad</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Repartidor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Ventas</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Total Cobrado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6">Comisión Rep.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {citySummary.map((row, i) => (
                  <TableRow key={i} className="h-11">
                    <TableCell className="pl-6 font-bold text-sm">{row.city}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.delivery}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold text-xs">{row.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary">${row.totalVenta.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-orange-600 pr-6">${row.totalComision.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Tabla de pedidos ─────────────────────────────────────────────── */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Pedidos del período
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedSales.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="bg-muted/40 p-5 rounded-full">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground italic">Sin pedidos en este período</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Fecha</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Productos</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Repartidor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Estado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Cobrado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6">Comisión Rep.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSales.map(sale => {
                  const deliveryName = sale.deliveryPersonId
                    ? (users.find(u => u.id === sale.deliveryPersonId)?.name ?? 'Repartidor')
                    : 'Sin asignar';
                  return (
                    <TableRow key={sale.id} className="h-14 hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-sm">{sale.customerName || 'Cliente'}</p>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="text-[10px]">{sale.city || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {sale.items.map((item, idx) => {
                            const p = products.find(prod => prod.id === item.productId);
                            return (
                              <p key={idx} className="text-xs text-muted-foreground">
                                {p?.name || 'Producto'}{' '}
                                <span className="font-bold text-foreground">×{item.quantity}</span>
                              </p>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs">{deliveryName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={sale.status} failureReason={sale.failureReason} />
                      </TableCell>
                      <TableCell className="text-right font-black text-primary">
                        ${sale.totalVenta.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600 pr-6">
                        ${sale.totalComision.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
