
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CheckCircle2, Clock, Info, Pencil, FileText, Image as ImageIcon,
  Search, CalendarDays, MapPin, Truck, ShoppingBag, TrendingUp, Users, Wallet, XCircle
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { applyDateFilter, getDateRange, DATE_FILTER_LABELS, DateRangeFilter } from '@/lib/date-filters';

export default function AdminSettlementsPage() {
  const { settlements, users, sales, paymentInfo, updatePaymentInfo, confirmSettlement, rejectSettlement } = useStore();
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [tempInfo, setTempInfo] = useState(paymentInfo);
  const [filterSeller, setFilterSeller] = useState('');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const deliveryPersons = useMemo(
    () => users.filter(u => u.role === 'delivery' && u.isActive),
    [users]
  );

  const allCities = useMemo(
    () => Array.from(new Set(sales.map(s => s.city).filter(Boolean))).sort() as string[],
    [sales]
  );

  // Ventas filtradas por repartidor, ciudad y rango de fechas — base para el resumen y el desglose
  const filteredSales = useMemo(() => {
    const startDate = customStart ? new Date(customStart) : undefined;
    const endDate = customEnd ? new Date(customEnd) : undefined;
    const { start, end } = getDateRange(dateFilter, startDate, endDate);

    return sales.filter(s => {
      if (!['delivered', 'paid'].includes(s.status)) return false;
      const d = new Date(s.createdAt);
      if (d < start || d > end) return false;
      if (filterDelivery !== 'all' && s.deliveryPersonId !== filterDelivery) return false;
      if (filterCity !== 'all' && s.city !== filterCity) return false;
      return true;
    });
  }, [sales, dateFilter, customStart, customEnd, filterDelivery, filterCity]);

  // Resumen financiero calculado desde ventas filtradas
  const summary = useMemo(() => {
    const totalVenta = filteredSales.reduce((acc, s) => acc + s.totalVenta, 0);
    const totalComision = filteredSales.reduce((acc, s) => acc + s.totalComision, 0);
    // IDs de settlements ya confirmados — solo esos se excluyen de A RECIBIR
    const confirmedSettlementIds = new Set(
      settlements.filter(s => s.status === 'confirmed').map(s => s.id)
    );
    const aRecibir = filteredSales
      .filter(s => !s.settlementId || !confirmedSettlementIds.has(s.settlementId))
      .reduce((acc, s) => acc + s.totalDeposito, 0);
    return { totalVenta, totalComision, ventaNeta: totalVenta - totalComision, aRecibir };
  }, [filteredSales]);

  // Desglose por ciudad desde ventas filtradas
  const citySummary = useMemo(() => {
    const map = new Map<string, { count: number; totalVenta: number; totalComision: number }>();
    for (const s of filteredSales) {
      const city = s.city || 'Sin ciudad';
      const prev = map.get(city) ?? { count: 0, totalVenta: 0, totalComision: 0 };
      map.set(city, {
        count: prev.count + 1,
        totalVenta: prev.totalVenta + s.totalVenta,
        totalComision: prev.totalComision + s.totalComision,
      });
    }
    return Array.from(map.entries())
      .map(([city, d]) => ({ city, ...d, ventaNeta: d.totalVenta - d.totalComision }))
      .sort((a, b) => b.totalVenta - a.totalVenta);
  }, [filteredSales]);

  // Tabla de liquidaciones filtrada por fecha + vendedor + cruzada con ventas cuando hay filtros activos
  const filteredSettlements = useMemo(() => {
    const startDate = customStart ? new Date(customStart) : undefined;
    const endDate = customEnd ? new Date(customEnd) : undefined;
    const byDate = applyDateFilter(settlements, dateFilter, startDate, endDate);

    return byDate.filter(s => {
      const seller = users.find(u => u.id === s.sellerId);
      if (!seller?.name.toLowerCase().includes(filterSeller.toLowerCase())) return false;
      if (filterDelivery !== 'all' || filterCity !== 'all') {
        const hasMatch = filteredSales.some(sale => sale.settlementId === s.id);
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [settlements, dateFilter, customStart, customEnd, filterSeller, users, filterDelivery, filterCity, filteredSales]);

  const handleSaveInfo = () => {
    updatePaymentInfo(tempInfo);
    setIsEditingInfo(false);
  };

  const pendingCount = filteredSettlements.filter(s => s.status === 'reported').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline">Control de Liquidaciones</h1>
          <p className="text-muted-foreground text-sm">Validación de depósitos y reportes de vendedores</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-2 h-9 px-4 animate-pulse">
            <Clock className="w-4 h-4" /> {pendingCount} Reportes por validar
          </Badge>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-muted/40">
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateRangeFilter)}>
          <SelectTrigger className="w-40 bg-card border shadow-sm h-10">
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
          <>
            <Input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="w-36 h-10 text-sm bg-card"
            />
            <span className="text-muted-foreground text-sm font-medium">—</span>
            <Input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="w-36 h-10 text-sm bg-card"
            />
          </>
        )}

        <Select value={filterDelivery} onValueChange={setFilterDelivery}>
          <SelectTrigger className="w-48 bg-card border shadow-sm h-10">
            <Truck className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Repartidor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los repartidores</SelectItem>
            {deliveryPersons.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-44 bg-card border shadow-sm h-10">
            <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {allCities.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterDelivery !== 'all' || filterCity !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setFilterDelivery('all'); setFilterCity('all'); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Resumen financiero — recalcula con cada filtro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-xl bg-white border-b-4 border-b-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" /> TOTAL VENTAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter text-foreground">
              ${summary.totalVenta.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 italic">
              {filteredSales.length} ventas en el período
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white border-b-4 border-b-orange-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> COMISIÓN REPARTIDORES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter text-orange-500">
              ${summary.totalComision.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 italic">Total pagado a repartidores</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white border-b-4 border-b-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> VENTA NETA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter text-blue-600">
              ${summary.ventaNeta.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 italic">Total Ventas − Comisión Repartidores</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-primary text-primary-foreground border-b-4 border-b-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-primary-foreground/70 uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" /> A RECIBIR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black tracking-tighter text-white">
              ${summary.aRecibir.toLocaleString()}
            </p>
            <p className="text-[9px] text-primary-foreground/60 mt-1 italic">Pendiente de recibir de repartidores</p>
          </CardContent>
        </Card>
      </div>

      {/* Desglose por ciudad — recalcula con cada filtro */}
      {citySummary.length > 0 && (
        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="px-8 pt-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black">Ventas por Ciudad</CardTitle>
                <CardDescription className="text-xs font-medium">Desglose del período filtrado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] font-black uppercase pl-8 h-10">Ciudad</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center h-10">Ventas</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right h-10">Total Cobrado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right h-10">Com. Repartidor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-8 h-10">Venta Neta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {citySummary.map((row) => (
                  <TableRow key={row.city} className="h-12 hover:bg-muted/10 border-b border-muted/20">
                    <TableCell className="pl-8">
                      <span className="font-black text-sm uppercase tracking-tight">{row.city}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold text-xs">{row.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">${row.totalVenta.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-orange-500 font-bold">
                      ${row.totalComision.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right pr-8 font-black text-primary">
                      ${row.ventaNeta.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 hover:bg-muted/30">
                  <TableCell className="pl-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                    Total General
                  </TableCell>
                  <TableCell className="text-center font-black">{filteredSales.length}</TableCell>
                  <TableCell className="text-right font-black">${summary.totalVenta.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-black text-orange-500">
                    ${summary.totalComision.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right pr-8 font-black text-primary">
                    ${summary.ventaNeta.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Mesa de validación + instrucciones de pago */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> Instrucciones de Pago
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setIsEditingInfo(!isEditingInfo); setTempInfo(paymentInfo); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
              <CardDescription className="text-[10px]">Datos bancarios visibles para los vendedores.</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingInfo ? (
                <div className="space-y-4">
                  <Textarea
                    value={tempInfo}
                    onChange={(e) => setTempInfo(e.target.value)}
                    className="min-h-[150px] bg-background text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveInfo} className="flex-1 h-10">Guardar</Button>
                    <Button variant="outline" onClick={() => setIsEditingInfo(false)} className="h-10">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="bg-background/80 p-5 rounded-xl border border-dashed border-primary/20">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-primary font-medium">
                    {paymentInfo}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Métricas de Caja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-xs font-medium text-muted-foreground">Por validar:</span>
                <Badge variant="secondary" className="font-bold text-orange-600 bg-orange-50">
                  {pendingCount} registros
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total confirmado:</span>
                <span className="font-black text-lg text-primary">
                  ${settlements
                    .filter(s => s.status === 'confirmed')
                    .reduce((acc, s) => acc + s.totalDeposito, 0)
                    .toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg">Mesa de Validación</CardTitle>
                <CardDescription>Revisa la evidencia y aprueba los depósitos</CardDescription>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vendedor..."
                  className="pl-8 h-9 text-xs"
                  value={filterSeller}
                  onChange={(e) => setFilterSeller(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px]">VENDEDOR / SEMANA</TableHead>
                    <TableHead className="text-[10px]">DEPÓSITO ($)</TableHead>
                    <TableHead className="text-[10px]">EVIDENCIA</TableHead>
                    <TableHead className="text-[10px]">ESTADO</TableHead>
                    <TableHead className="text-right text-[10px]">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettlements.map((s) => {
                    const seller = users.find(u => u.id === s.sellerId);
                    return (
                      <TableRow key={s.id} className={cn(s.status === 'reported' ? 'bg-orange-50/30' : '')}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{seller?.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{s.weekRange}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-black text-primary text-base">${s.totalDeposito.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            {s.reference && (
                              <span className="text-[10px] font-medium flex items-center gap-1.5 bg-muted/50 w-fit px-2 py-0.5 rounded">
                                <FileText className="w-3 h-3" /> {s.reference}
                              </span>
                            )}
                            {s.proofUrl && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] gap-2 px-3 border-primary/20 hover:bg-primary/5"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 text-primary" /> Ver Ticket
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Validación de Comprobante</DialogTitle>
                                    <DialogDescription className="text-xs">
                                      Vendedor: <span className="font-bold">{seller?.name}</span> | Folio:{' '}
                                      <span className="font-bold">{s.reference}</span>
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="p-2 bg-muted/30 rounded-2xl overflow-hidden border">
                                    <img src={s.proofUrl} alt="Comprobante" className="w-full h-auto rounded-xl shadow-lg" />
                                  </div>
                                  <DialogFooter>
                                    {s.status === 'reported' && (
                                      <Button
                                        className="w-full h-12 gap-2 text-base font-bold"
                                        onClick={() => confirmSettlement(s.id)}
                                      >
                                        <CheckCircle2 className="w-5 h-5" /> Aprobar Depósito de ${s.totalDeposito.toLocaleString()}
                                      </Button>
                                    )}
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'text-[9px] uppercase font-black tracking-widest px-2 h-5 border-none',
                              s.status === 'reported'  ? 'bg-orange-100 text-orange-700' :
                              s.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              s.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                              'bg-muted text-muted-foreground'
                            )}
                          >
                            {s.status === 'reported'  ? 'Por Validar' :
                             s.status === 'confirmed' ? 'Confirmado' :
                             s.status === 'rejected'  ? 'Rechazado' : s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {s.status === 'reported' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-[11px] font-bold border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => { setRejectingId(s.id); setRejectionReason(''); }}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Rechazar
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 gap-1.5 text-[11px] font-bold shadow-sm"
                                onClick={() => confirmSettlement(s.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                              </Button>
                            </div>
                          )}
                          {s.status === 'confirmed' && (
                            <div className="flex flex-col items-end">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-[8px] text-muted-foreground mt-0.5">
                                {new Date(s.confirmedAt!).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredSettlements.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-20 text-muted-foreground italic text-sm border-2 border-dashed"
                      >
                        No hay reportes que coincidan con los filtros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de rechazo */}
      <Dialog open={!!rejectingId} onOpenChange={open => { if (!open) setRejectingId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rechazar liquidación</DialogTitle>
            <DialogDescription>El repartidor verá este motivo y los pedidos quedarán disponibles nuevamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Motivo del rechazo (obligatorio)"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim()}
              onClick={async () => {
                if (!rejectingId) return;
                await rejectSettlement(rejectingId, rejectionReason.trim());
                setRejectingId(null);
              }}
            >
              <XCircle className="w-4 h-4 mr-2" /> Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
