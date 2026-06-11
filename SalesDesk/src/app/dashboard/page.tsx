
"use client"

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DollarSign, Truck, CheckCircle2, XCircle, Package,
  TrendingUp, AlertTriangle, CalendarDays, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { applyDateFilter, DATE_FILTER_LABELS, DateRangeFilter } from '@/lib/date-filters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export default function DashboardPage() {
  const { currentUser, sales = [], inventory = [], products = [], users = [], assignments = [] } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role === 'delivery') {
      router.replace('/dashboard/delivery');
    }
  }, [currentUser, router]);

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [selectedCity, setSelectedCity] = useState('all');

  const isAdmin = currentUser?.role === 'admin';

  const baseSales = useMemo(() => {
    if (!currentUser) return [];
    const userFiltered = isAdmin ? sales : sales.filter(s => s.sellerId === currentUser.id);
    return applyDateFilter(userFiltered, dateFilter, customStart, customEnd);
  }, [sales, currentUser, isAdmin, dateFilter, customStart, customEnd]);

  const filteredSales = useMemo(() => {
    if (selectedCity === 'all') return baseSales;
    return baseSales.filter(s => s.city === selectedCity);
  }, [baseSales, selectedCity]);

  const uniqueCities = useMemo(() => Array.from(new Set(sales.map(s => s.city))).filter(Boolean), [sales]);

  const stats = useMemo(() => {
    const enRuta = filteredSales.filter(s => ['in_transit', 'assigned', 'accepted', 'contacting', 'scheduled'].includes(s.status)).length;
    const entregadas = filteredSales.filter(s => s.status === 'delivery_confirmed').length;
    const pagadas = filteredSales.filter(s => s.status === 'paid').length;
    const fallidas = filteredSales.filter(s => s.status === 'delivery_failed' || s.status === 'cancelled').length;
    const dineroManos = filteredSales
      .filter(s => s.status === 'delivery_confirmed')
      .reduce((acc, s) => acc + s.totalDeposito, 0);
    const totalVentas = filteredSales
      .filter(s => !['cancelled', 'delivery_failed'].includes(s.status))
      .reduce((acc, s) => acc + s.totalVenta, 0);
    const totalComisiones = filteredSales
      .filter(s => !['cancelled', 'delivery_failed'].includes(s.status))
      .reduce((acc, s) => acc + s.totalComision, 0);
    return { enRuta, entregadas, pagadas, fallidas, dineroManos, totalVentas, totalComisiones };
  }, [filteredSales]);

  const lowStockCount = useMemo(() =>
    products.reduce((acc, p) => {
      const minStock = p.minStock ?? 4;
      const hasLow = inventory.some(i => i.productId === p.id && i.quantity <= minStock && i.quantity > 0);
      return hasLow ? acc + 1 : acc;
    }, 0),
  [products, inventory]);

  const cityChartData = useMemo(() => {
    const map: Record<string, number> = {};
    baseSales
      .filter(s => !['cancelled', 'delivery_failed'].includes(s.status))
      .forEach(s => {
        map[s.city] = (map[s.city] || 0) + s.totalVenta;
      });
    return Object.entries(map)
      .map(([city, total]) => ({ city, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [baseSales]);

  const sellerRows = useMemo(() => {
    if (!isAdmin) return [];
    const sellers = users.filter(u => u.role === 'seller');
    return sellers.map(seller => {
      const sellerSales = baseSales.filter(s => s.sellerId === seller.id);
      const activas = sellerSales.filter(s => !['paid', 'cancelled', 'delivery_failed'].includes(s.status)).length;
      const totalVenta = sellerSales.filter(s => !['cancelled', 'delivery_failed'].includes(s.status)).reduce((a, s) => a + s.totalVenta, 0);
      const comisiones = sellerSales.filter(s => !['cancelled', 'delivery_failed'].includes(s.status)).reduce((a, s) => a + s.totalComision, 0);
      const pendiente = sellerSales.filter(s => s.status === 'delivered').reduce((a, s) => a + s.totalDeposito, 0);
      const fallidas = sellerSales.filter(s => s.status === 'delivery_failed' || s.status === 'cancelled').length;
      return { seller, activas, totalVenta, comisiones, pendiente, fallidas };
    }).filter(r => r.totalVenta > 0 || r.activas > 0);
  }, [isAdmin, users, baseSales]);

  const deliveryRows = useMemo(() => {
    if (!isAdmin) return [];
    const deliveryPersons = users.filter(u => u.role === 'delivery');
    return deliveryPersons.map(dp => {
      const dpSales = baseSales.filter(s => s.deliveryPersonId === dp.id);
      const entregados = dpSales.filter(s => s.status === 'delivered' || s.status === 'paid').length;
      const fallidos = dpSales.filter(s => s.status === 'delivery_failed').length;
      const activos = dpSales.filter(s => ['assigned', 'accepted', 'contacting', 'scheduled', 'in_transit'].includes(s.status)).length;
      return { dp, entregados, fallidos, activos };
    }).filter(r => r.entregados > 0 || r.fallidos > 0 || r.activos > 0);
  }, [isAdmin, users, baseSales]);

  const dateLabel = dateFilter === 'custom' && customStart
    ? `${format(customStart, 'd MMM', { locale: es })}${customEnd ? ` – ${format(customEnd, 'd MMM', { locale: es })}` : ''}`
    : DATE_FILTER_LABELS[dateFilter];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline">
            Panel de {isAdmin ? 'Administrador' : 'Vendedor'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {dateLabel} · {filteredSales.length} operaciones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateRangeFilter)}>
            <SelectTrigger className="w-40 bg-card border shadow-sm">
              <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DATE_FILTER_LABELS) as DateRangeFilter[]).map(k => (
                <SelectItem key={k} value={k}>{DATE_FILTER_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {dateFilter === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {customStart ? format(customStart, 'dd/MM') : 'Inicio'} →{' '}
                  {customEnd ? format(customEnd, 'dd/MM') : 'Fin'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: customStart, to: customEnd }}
                  onSelect={(r) => { setCustomStart(r?.from); setCustomEnd(r?.to); }}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          )}

          {isAdmin && (
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-48 bg-card border shadow-sm">
                <SelectValue placeholder="Todas las ciudades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Ventas"
          value={`$${stats.totalVentas.toLocaleString()}`}
          icon={TrendingUp}
          color="text-primary"
          desc="Valor bruto del periodo"
        />
        <StatCard
          title="Comisiones"
          value={`$${stats.totalComisiones.toLocaleString()}`}
          icon={DollarSign}
          color="text-violet-600"
          desc="Ganancia vendedores"
        />
        <StatCard
          title="Dinero en Manos"
          value={`$${stats.dineroManos.toLocaleString()}`}
          icon={DollarSign}
          color="text-green-600"
          desc="Entregado, sin liquidar"
        />
        <StatCard
          title="En Ruta"
          value={stats.enRuta}
          icon={Truck}
          color="text-orange-500"
          desc="Pedidos activos"
        />
        <StatCard
          title="Entregadas"
          value={stats.entregadas}
          icon={CheckCircle2}
          color="text-blue-500"
          desc="Pendientes de liquidar"
        />
        <StatCard
          title="Liquidadas"
          value={stats.pagadas}
          icon={CheckCircle2}
          color="text-emerald-600"
          desc="Cerradas totalmente"
        />
        <StatCard
          title="Fallidas / Cancel."
          value={stats.fallidas}
          icon={XCircle}
          color="text-red-500"
          desc="Sin completar"
        />
        {isAdmin && (
          <StatCard
            title="Stock Bajo"
            value={lowStockCount}
            icon={AlertTriangle}
            color={lowStockCount > 0 ? "text-orange-500" : "text-muted-foreground"}
            desc="Productos bajo mínimo"
          />
        )}
      </div>

      {/* Charts & Tables — admin only */}
      {isAdmin && (
        <div className="space-y-6">

          {/* Bar chart + Seller performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Ventas por Ciudad</CardTitle>
              </CardHeader>
              <CardContent>
                {cityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={cityChartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                      <XAxis dataKey="city" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(v: number) => [`$${v.toLocaleString()}`, 'Total']}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {cityChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm italic">
                    Sin datos para el periodo
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> Rendimiento Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sellerRows.length > 0 ? (
                  <div className="divide-y">
                    {sellerRows.map(row => (
                      <div key={row.seller.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                            {row.seller.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{row.seller.name}</p>
                            <p className="text-[10px] text-muted-foreground">{row.seller.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right shrink-0">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Ventas</p>
                            <p className="text-xs font-black">${row.totalVenta.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Pendiente</p>
                            <p className="text-xs font-black text-green-600">${row.pendiente.toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {row.activas > 0 && (
                              <Badge className="text-[9px] h-4 px-1.5 bg-orange-100 text-orange-700 border-0">{row.activas} activas</Badge>
                            )}
                            {row.fallidas > 0 && (
                              <Badge className="text-[9px] h-4 px-1.5 bg-red-100 text-red-700 border-0">{row.fallidas} fallidas</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm italic">
                    Sin actividad en el periodo
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Delivery performance */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Truck className="w-4 h-4" /> Rendimiento Repartidores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {deliveryRows.length > 0 ? (
                <div className="divide-y">
                  {deliveryRows.map(row => (
                    <div key={row.dp.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black shrink-0">
                          {row.dp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{row.dp.name}</p>
                          <p className="text-[10px] text-muted-foreground">{row.dp.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Entregados</p>
                          <p className="text-xs font-black text-green-600">{row.entregados}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {row.activos > 0 && (
                            <Badge className="text-[9px] h-4 px-1.5 bg-orange-100 text-orange-700 border-0">{row.activos} activos</Badge>
                          )}
                          {row.fallidos > 0 && (
                            <Badge className="text-[9px] h-4 px-1.5 bg-red-100 text-red-700 border-0">{row.fallidos} fallidos</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm italic">
                  Sin actividad en el periodo
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Seller own stats (non-admin) */}
      {!isAdmin && currentUser && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" /> Mi Inventario Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {products
                .filter(p => {
                  const qty = inventory
                    .filter(i => i.productId === p.id)
                    .reduce((s, i) => s + i.quantity, 0);
                  return qty > 0;
                })
                .map(p => {
                  const qty = inventory
                    .filter(i => i.productId === p.id)
                    .reduce((s, i) => s + i.quantity, 0);
                  const minStock = p.minStock ?? 4;
                  return (
                    <div key={p.id} className={cn(
                      "p-3 rounded-xl border",
                      qty === 0 ? "bg-muted/30 border-dashed" : qty <= minStock ? "bg-orange-50 border-orange-200" : "bg-card"
                    )}>
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <p className={cn("text-2xl font-black mt-1", qty === 0 ? "text-muted-foreground/30" : qty <= minStock ? "text-orange-500" : "text-foreground")}>
                        {qty}
                      </p>
                      <p className="text-[10px] text-muted-foreground">unidades</p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function StatCard({
  title, value, icon: Icon, color, desc
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  desc: string;
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">{title}</CardTitle>
        <Icon className={cn("w-4 h-4", color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1 italic">{desc}</p>
      </CardContent>
    </Card>
  );
}
