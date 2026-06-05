
"use client"

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Wallet, Send, CheckCircle2, Copy, AlertCircle, Camera,
  Calendar, DollarSign, TrendingUp, ShoppingBag, MapPin, Users
} from 'lucide-react';
import { format, startOfWeek, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SellerSettlementsPage() {
  const { currentUser, sales, settlements, paymentInfo, reportSettlement } = useStore();
  const [reference, setReference] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [proofBase64, setProofBase64] = useState<string | undefined>(undefined);

  const mySettlements = settlements.filter(s => s.sellerId === currentUser?.id);

  const periodData = useMemo(() => {
    if (!currentUser || !sales) return null;

    const today = startOfDay(new Date());
    const startDay = currentUser.settlementStartDay || 1;

    const start = startOfWeek(today, { weekStartsOn: startDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    const end = addDays(start, 6);
    const rangeLabel = `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`;

    // Solo ventas confirmadas por el admin y aún no liquidadas
    // Las ventas ya aprobadas tienen status 'paid' y se excluyen automáticamente
    const myRelevantSales = sales.filter(
      s => s.sellerId === currentUser.id && s.status === 'delivery_confirmed'
    );

    const totalVenta = myRelevantSales.reduce((acc, s) => acc + (s.totalVenta || 0), 0);
    const totalComision = myRelevantSales.reduce((acc, s) => acc + (s.totalComision || 0), 0);
    const ventaNeta = totalVenta - totalComision;

    const saldoPendienteReal = myRelevantSales.reduce((acc, s) => acc + (s.totalDeposito || 0), 0);

    return {
      rangeLabel,
      totalVenta,
      totalComision,
      ventaNeta,
      totalDeposito: ventaNeta,
      saldoPendiente: saldoPendienteReal,
      count: myRelevantSales.length,
      sales: myRelevantSales,
    };
  }, [sales, currentUser]);

  const citySummary = useMemo(() => {
    if (!periodData?.sales?.length) return [];
    const map = new Map<string, { count: number; totalVenta: number; totalComision: number }>();
    for (const s of periodData.sales) {
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
  }, [periodData]);

  useEffect(() => {
    if (periodData) setCustomAmount(periodData.saldoPendiente.toString());
  }, [periodData]);

  const handleCopyInfo = () => {
    navigator.clipboard.writeText(paymentInfo);
    toast({ title: 'Copiado', description: 'Datos bancarios copiados al portapapeles.' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProofBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (!periodData || isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Monto inválido', description: 'Ingresa una cantidad válida a depositar.' });
      return;
    }
    if (!reference) {
      toast({ variant: 'destructive', title: 'Referencia requerida', description: 'Ingresa un número de folio o referencia de pago.' });
      return;
    }
    await reportSettlement(
      currentUser!.id,
      periodData.rangeLabel,
      periodData.totalVenta,
      periodData.totalComision,
      amount,
      reference,
      proofBase64,
      periodData.sales.map(s => s.id)
    );
    setReference('');
    setProofBase64(undefined);
  };

  if (!periodData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Corte de Caja Automático</h1>
          <p className="text-muted-foreground text-sm">Resumen de ventas listas para liquidar</p>
        </div>
        <Badge variant="outline" className="gap-2 px-4 py-2 bg-white shadow-sm border-primary/20 rounded-xl">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs">Periodo: {periodData.rangeLabel}</span>
        </Badge>
      </div>

      {/* 4 tarjetas del resumen financiero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-xl bg-white border-b-4 border-b-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" /> TOTAL VENTAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter text-foreground">
              ${periodData.totalVenta.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 italic">Ventas entregadas del período</p>
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
              ${periodData.totalComision.toLocaleString()}
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
              ${periodData.ventaNeta.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 italic">Total Ventas − Comisión Repartidores</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-primary text-primary-foreground border-b-4 border-b-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-primary-foreground/70 uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" /> A DEPOSITAR AL ADMIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black tracking-tighter text-white">
              ${periodData.ventaNeta.toLocaleString()}
            </p>
            <p className="text-[9px] text-primary-foreground/60 mt-1 italic">Total a entregar</p>
          </CardContent>
        </Card>
      </div>

      {/* Desglose por ciudad */}
      {citySummary.length > 0 && (
        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Ventas por Ciudad</CardTitle>
                <CardDescription className="text-xs font-medium">
                  Desglose del período actual por zona de entrega
                </CardDescription>
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
                <TableRow className="bg-muted/20 hover:bg-muted/30 font-black">
                  <TableCell className="pl-8 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Total General
                  </TableCell>
                  <TableCell className="text-center font-black">{periodData.count}</TableCell>
                  <TableCell className="text-right font-black">${periodData.totalVenta.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-black text-orange-500">
                    ${periodData.totalComision.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right pr-8 font-black text-primary">
                    ${periodData.ventaNeta.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Grid principal: formulario + detalle de ventas / sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {/* Formulario de corte — sin cambios funcionales */}
          <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Finalizar Corte Semanal</CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Informa tu depósito para limpiar tu saldo pendiente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {periodData.count === 0 && (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="bg-green-50 p-5 rounded-full">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <div>
                    <p className="font-black text-lg text-green-700">Período al día</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No tienes ventas pendientes de liquidar. Cuando el admin confirme nuevas entregas aparecerán aquí.
                    </p>
                  </div>
                </div>
              )}
              {periodData.count > 0 && (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Monto Depositado ($)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="pl-12 h-14 border-none bg-muted/30 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl text-lg font-black"
                      />
                    </div>
                    {periodData.saldoPendiente > 0 && (
                      <p className="text-[10px] font-bold text-orange-600 px-2">
                        Sugerido por ventas entregadas: ${periodData.saldoPendiente.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Folio / Referencia
                    </Label>
                    <Input
                      placeholder="Ej: Transf. #98765..."
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="h-14 border-none bg-muted/30 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Ticket de Pago
                  </Label>
                  <div className="flex items-center gap-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-3 h-16 px-8 border-dashed border-2 bg-muted/10 hover:bg-primary/5 hover:border-primary/40 rounded-2xl transition-all"
                      asChild
                    >
                      <label>
                        <Camera className="w-6 h-6" />
                        <span className="font-black text-sm">{proofBase64 ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </Button>
                    {proofBase64 ? (
                      <div className="flex items-center gap-2 text-green-600 animate-in zoom-in">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">¡Foto Lista!</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-red-500 font-bold">* Requerido para enviar el reporte</p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-16 text-lg font-black gap-3 shadow-2xl rounded-2xl transition-all hover:scale-[1.01] active:scale-95"
                  disabled={parseFloat(customAmount) <= 0 || !reference.trim() || !proofBase64}
                >
                  <Send className="w-5 h-5" /> Enviar Reporte de Corte
                </Button>
              </form>
              )}
            </CardContent>
          </Card>

          {/* Detalle de ventas del corte */}
          <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="px-8 pt-8">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Detalle del Corte Actual</CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Historial de ventas que componen tu balance semanal
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[10px] font-black uppercase pl-8 h-12">Cliente / Fecha</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Ciudad</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Estado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Cobrado ($)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right pr-8 h-12">A Liquidar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodData.sales.slice().reverse().map((sale) => (
                    <TableRow key={sale.id} className="h-16 hover:bg-muted/10 transition-colors border-b border-muted/20">
                      <TableCell className="pl-8">
                        <div className="flex flex-col">
                          <span className="text-sm font-black truncate max-w-[150px] uppercase tracking-tight">
                            {sale.customerName || 'Sin Nombre'}
                          </span>
                          <span className="text-[9px] font-medium text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">
                          {sale.city || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={sale.status === 'paid' ? 'default' : 'secondary'}
                          className="text-[8px] font-black uppercase tracking-tighter"
                        >
                          {sale.status === 'paid' ? 'Confirmado' : 'Pendiente Dep.'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">${sale.totalVenta.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-8">
                        <span className={cn(
                          'text-sm font-black tracking-tighter',
                          sale.status === 'paid' ? 'text-muted-foreground line-through opacity-50' : 'text-primary'
                        )}>
                          ${sale.totalDeposito.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {periodData.sales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
                        No hay ventas registradas en este periodo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: datos de depósito + historial de reportes */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden sticky top-8">
            <CardHeader className="bg-muted/30 p-8 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Datos de Depósito
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl"
                  onClick={handleCopyInfo}
                >
                  <Copy className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="bg-primary/5 p-6 rounded-3xl border-2 border-dashed border-primary/20">
                <pre className="whitespace-pre-wrap font-sans text-sm text-primary font-black leading-relaxed">
                  {paymentInfo}
                </pre>
              </div>
              <div className="p-5 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-800 leading-tight font-bold uppercase">
                  Recuerda subir tu ticket. El administrador validará el pago para limpiar tu saldo de la semana.
                </p>
              </div>

              {/* Historial de reportes enviados */}
              <div className="space-y-4 pt-4">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Historial de Reportes
                </h4>
                <div className="space-y-3">
                  {mySettlements.slice().reverse().slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="p-4 bg-muted/20 rounded-2xl border border-muted/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">{s.weekRange}</p>
                        <Badge
                          variant={s.status === 'confirmed' ? 'default' : 'secondary'}
                          className={cn(
                            'text-[8px] font-black uppercase tracking-tighter',
                            s.status === 'reported' ? 'bg-orange-100 text-orange-700' : ''
                          )}
                        >
                          {s.status === 'confirmed' ? 'Validado' : s.status === 'reported' ? 'Validando' : 'Pendiente'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-primary">${s.totalDeposito.toLocaleString()}</p>
                        {s.reportedAt && (
                          <p className="text-[8px] text-muted-foreground">
                            {new Date(s.reportedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </div>
                      {s.reference && (
                        <p className="text-[8px] text-muted-foreground truncate">Ref: {s.reference}</p>
                      )}
                    </div>
                  ))}
                  {mySettlements.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4">
                      Aún no has enviado reportes de corte.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
