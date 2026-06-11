
"use client"

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck, CheckCircle2, XCircle, MapPin, User, Phone,
  Package, ExternalLink, Copy, ArrowLeft, Calendar, Clock,
  AlertTriangle, ChevronRight, ShoppingCart, MessageSquare,
  TrendingUp, Wallet, Camera, Send, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Sale, SaleStatus } from '@/lib/types';

const FAILURE_REASONS = [
  'Cliente no estaba en casa',
  'Cliente no contestó',
  'Dirección incorrecta',
  'Cliente canceló',
  'Zona de riesgo',
  'Problema de vehículo',
  'Otro',
];

// Pasos del tracker — igual visualmente, etiquetas actualizadas
const TRACKING_STEPS = [
  { label: 'Recibido',   key: 'received'  },
  { label: 'Confirmado', key: 'confirmed' },
  { label: 'En Ruta',    key: 'en_route'  },
  { label: 'Entregado',  key: 'delivered' },
];

// Mapeo estados DB (order_status enum de supabase.md) → paso visual
function getTrackingStep(status: string): number {
  if (status === 'assigned')                            return 0; // asignado, sin confirmar
  if (['accepted', 'contacting'].includes(status))      return 1; // confirmó recepción
  if (['scheduled', 'in_transit'].includes(status))     return 2; // en ruta
  if (['delivered', 'delivery_confirmed', 'paid'].includes(status)) return 3; // entregado
  return 0;
}

// Botón dinámico: siguiente paso disponible según estado actual
function getNextStep(status: string): { label: string; nextStatus: SaleStatus } | null {
  switch (status) {
    case 'assigned':   return { label: 'Confirmar Pedido Recibido', nextStatus: 'accepted'   };
    case 'accepted':
    case 'contacting': return { label: 'Salí a Entregar',           nextStatus: 'scheduled'  };
    case 'scheduled':  return { label: 'Estoy En Ruta',             nextStatus: 'in_transit' };
    case 'in_transit': return { label: 'Marcar como Entregado',     nextStatus: 'delivered'  };
    default:           return null;
  }
}

export default function DeliveryPage() {
  const { currentUser, sales, products, settlements, updateSaleStatus, confirmDelivery, reportDeliveryFailure, reportSettlement } = useStore();

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deliveryOutcome, setDeliveryOutcome] = useState<'entregado' | 'no_lo_quiere' | 'rechazado' | null>(null);
  const [deliveryComment, setDeliveryComment] = useState('');

  // Settlement states
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementReference, setSettlementReference] = useState('');
  const [settlementProof, setSettlementProof] = useState<string | undefined>(undefined);

  const mySales = useMemo(
    () => sales.filter(s => s.deliveryPersonId === currentUser?.id),
    [sales, currentUser?.id]
  );

  const pendingSales = mySales.filter(s => !['delivered', 'delivery_confirmed', 'paid', 'cancelled', 'delivery_failed'].includes(s.status));
  const completedSales = mySales.filter(s => ['delivered', 'delivery_confirmed', 'paid'].includes(s.status));
  const failedSales = mySales.filter(s => s.status === 'delivery_failed');

  const financials = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayCount = completedSales.filter(
      s => new Date(s.createdAt).toLocaleDateString('en-CA') === todayStr
    ).length;
    const unsettled = completedSales.filter(s => !s.settlementId);
    const comision = unsettled.reduce((sum, s) => sum + s.totalComision, 0);
    const deposito = unsettled.reduce((sum, s) => sum + s.totalDeposito, 0);
    const totalVenta = completedSales.reduce((sum, s) => sum + s.totalVenta, 0);
    return { todayCount, comision, deposito, unsettledCount: unsettled.length, totalVenta };
  }, [completedSales]);

  const unsettledDeliveries = useMemo(
    () => completedSales.filter(s => !s.settlementId),
    [completedSales]
  );

  const selectedUnsettled = useMemo(
    () => unsettledDeliveries.filter(s => selectedOrderIds.has(s.id)),
    [unsettledDeliveries, selectedOrderIds]
  );

  const settlementTotals = useMemo(() => {
    const totalVenta     = selectedUnsettled.reduce((s, v) => s + v.totalVenta,    0);
    const totalComision  = selectedUnsettled.reduce((s, v) => s + v.totalComision, 0);
    const totalDeposito  = selectedUnsettled.reduce((s, v) => s + v.totalDeposito, 0);
    return { totalVenta, totalComision, totalDeposito, count: selectedUnsettled.length, totalAvailable: unsettledDeliveries.length };
  }, [selectedUnsettled, unsettledDeliveries.length]);

  const mySettlements = useMemo(
    () => settlements.filter(s => s.sellerId === currentUser?.id),
    [settlements, currentUser]
  );

  useEffect(() => {
    setSelectedOrderIds(new Set(unsettledDeliveries.map(s => s.id)));
  }, [unsettledDeliveries.length]);

  useEffect(() => {
    setSettlementAmount(settlementTotals.totalDeposito > 0 ? settlementTotals.totalDeposito.toString() : '');
  }, [settlementTotals.totalDeposito]);

  const handleSettlementProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSettlementProof(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.size === 0) {
      toast({ variant: 'destructive', title: 'Sin pedidos seleccionados', description: 'Selecciona al menos un pedido para incluir en el reporte.' });
      return;
    }
    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Monto inválido', description: 'Ingresa una cantidad mayor a 0.' });
      return;
    }
    if (!settlementReference.trim()) {
      toast({ variant: 'destructive', title: 'Referencia requerida', description: 'Ingresa el folio o referencia de depósito.' });
      return;
    }
    if (!settlementProof) {
      toast({ variant: 'destructive', title: 'Comprobante requerido', description: 'Toma una foto del comprobante antes de enviar.' });
      return;
    }
    if (!currentUser?.id) return;
    const weekRange = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    await reportSettlement(
      currentUser.id,
      weekRange,
      settlementTotals.totalVenta,
      settlementTotals.totalComision,
      amount,
      settlementReference.trim(),
      settlementProof,
      selectedUnsettled.map(s => s.id)
    );
    setSettlementReference('');
    setSettlementProof(undefined);
  };

  const selectedSale = mySales.find(s => s.id === selectedSaleId);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado" });
  };

  const closeConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setDeliveryOutcome(null);
    setDeliveryComment('');
  };

  const handleConfirmDelivery = async () => {
    if (!selectedSale) return;
    if (!deliveryOutcome) {
      toast({ variant: 'destructive', title: 'Selecciona el resultado', description: 'Indica si el pedido fue entregado, rechazado o no aceptado.' });
      return;
    }

    if (deliveryOutcome === 'entregado') {
      await confirmDelivery(selectedSale.id, deliveryComment || undefined);
      toast({ title: '¡Entregado!', description: 'El pedido fue marcado como entregado.' });
    } else {
      const reasonLabel = deliveryOutcome === 'no_lo_quiere' ? 'No lo quiere' : 'Rechazado';
      const fullReason = deliveryComment.trim() ? `${reasonLabel}: ${deliveryComment.trim()}` : reasonLabel;
      await reportDeliveryFailure(selectedSale.id, fullReason);
    }

    closeConfirmDialog();
    setSelectedSaleId(null);
  };

  const handleNextStep = () => {
    if (!selectedSale) return;
    const next = getNextStep(selectedSale.status);
    if (!next) return;
    if (next.nextStatus === 'delivered') {
      setConfirmDialogOpen(true);
      return;
    }
    const notes: Record<string, string> = {
      accepted:   'Repartidor confirmó recepción del pedido',
      scheduled:  'Repartidor salió a entregar',
      in_transit: 'Repartidor está en ruta al cliente',
    };
    updateSaleStatus(selectedSale.id, next.nextStatus, { note: notes[next.nextStatus] ?? next.label });
  };

  const handleReportFailure = () => {
    if (!selectedSale) return;
    const reason = failureReason === 'Otro' ? customReason : failureReason;
    if (!reason.trim()) {
      toast({ variant: "destructive", title: "Indica el motivo" });
      return;
    }
    reportDeliveryFailure(selectedSale.id, reason);
    setFailureDialogOpen(false);
    setFailureReason('');
    setCustomReason('');
    setSelectedSaleId(null);
  };

  if (selectedSale) {
    const trackingStep = getTrackingStep(selectedSale.status);
    const isFailed = selectedSale.status === 'delivery_failed';
    const isCompleted = ['delivered', 'delivery_confirmed', 'paid'].includes(selectedSale.status);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Modal: resultado de la entrega */}
        <Dialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) closeConfirmDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Entrega</DialogTitle>
              <DialogDescription>
                ¿Cómo resultó la entrega? Selecciona un estado para continuar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {(
                [
                  { value: 'entregado',     label: 'Entregado',     desc: 'El cliente recibió el pedido',    color: 'border-green-500 bg-green-50 text-green-700'   },
                  { value: 'no_lo_quiere',  label: 'No lo quiere',  desc: 'El cliente rechazó el pedido',    color: 'border-orange-400 bg-orange-50 text-orange-700' },
                  { value: 'rechazado',     label: 'Rechazado',     desc: 'El cliente no aceptó la entrega', color: 'border-red-400 bg-red-50 text-red-700'          },
                ] as const
              ).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeliveryOutcome(opt.value)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border-2 transition-all',
                    deliveryOutcome === opt.value
                      ? opt.color + ' font-bold'
                      : 'border-muted hover:bg-muted/40'
                  )}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}

              <button
                type="button"
                onClick={() => { closeConfirmDialog(); setFailureDialogOpen(true); }}
                className="w-full text-left p-3 rounded-xl border-2 border-muted hover:bg-muted/40 transition-all"
              >
                <p className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Reportar problema
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Dirección incorrecta, zona de riesgo u otro inconveniente</p>
              </button>

              <div className="pt-1">
                <Label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 mb-1.5">
                  <MessageSquare className="w-3 h-3" /> Comentario (opcional)
                </Label>
                <Textarea
                  placeholder="Agrega un comentario si lo deseas..."
                  value={deliveryComment}
                  onChange={e => setDeliveryComment(e.target.value)}
                  className="resize-none h-20 text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeConfirmDialog}>Cancelar</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 gap-2"
                disabled={!deliveryOutcome}
                onClick={handleConfirmDelivery}
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedSaleId(null)} className="rounded-full h-10 w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black">Pedido #{selectedSale.id.toUpperCase()}</h1>
            <p className="text-muted-foreground text-sm">{new Date(selectedSale.createdAt).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Tracking 4 pasos */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Seguimiento del pedido</CardTitle>
          </CardHeader>
          <CardContent className="py-6 px-8">
            <div className="relative">
              <div className="absolute top-6 left-0 w-full h-0.5 bg-muted z-0" />
              <div className="absolute top-6 left-0 h-0.5 bg-primary z-0 transition-all duration-700"
                style={{ width: `${(trackingStep / (TRACKING_STEPS.length - 1)) * 100}%` }} />
              <div className="flex justify-between relative z-10">
                {TRACKING_STEPS.map((step, idx) => {
                  const isPast = idx <= trackingStep && !isFailed;
                  const isCurrent = idx === trackingStep && !isFailed && !isCompleted;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 w-1/4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500",
                        isFailed && idx === trackingStep
                          ? "bg-red-500 border-red-500 text-white"
                          : isPast
                          ? "bg-primary border-primary text-primary-foreground shadow-lg"
                          : "bg-white border-muted text-muted-foreground"
                      )}>
                        {isFailed && idx === trackingStep
                          ? <XCircle className="w-5 h-5" />
                          : isPast
                          ? <CheckCircle2 className="w-5 h-5" />
                          : <span className="text-sm font-black">{idx + 1}</span>
                        }
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-tight text-center",
                        isPast ? "text-primary" : "text-muted-foreground"
                      )}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {isFailed && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-700 text-sm">Fallo en entrega</p>
                  <p className="text-red-600 text-xs mt-0.5">{selectedSale.failureReason}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones — botón dinámico según estado actual */}
        {!isFailed && !isCompleted && (() => {
          const next = getNextStep(selectedSale.status);
          if (!next) return null;
          const isLastStep = next.nextStatus === 'delivered';
          return (
            <div className="flex gap-3">
              <Button
                className={cn(
                  "flex-1 h-14 text-base font-black rounded-2xl gap-2 shadow-xl",
                  isLastStep ? "bg-green-600 hover:bg-green-700" : ""
                )}
                onClick={handleNextStep}
              >
                <CheckCircle2 className="w-5 h-5" /> {next.label}
              </Button>
              <Dialog open={failureDialogOpen} onOpenChange={setFailureDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-14 px-6 rounded-2xl border-destructive text-destructive hover:bg-destructive/10 font-bold gap-2"
                >
                  <XCircle className="w-5 h-5" /> Reportar Fallo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reportar Fallo en Entrega</DialogTitle>
                  <DialogDescription>Indica el motivo para que el administrador tome acción.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  {FAILURE_REASONS.map(reason => (
                    <button
                      key={reason}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border text-sm font-medium transition-colors",
                        failureReason === reason
                          ? "bg-destructive/10 border-destructive text-destructive font-bold"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setFailureReason(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                  {failureReason === 'Otro' && (
                    <Input
                      placeholder="Describe el motivo..."
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      className="h-12"
                    />
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    className="w-full h-12 font-black"
                    onClick={handleReportFailure}
                    disabled={!failureReason}
                  >
                    Confirmar Fallo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          );
        })()}

        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <div>
              <p className="font-black text-green-700 text-lg">Pedido Entregado</p>
              <p className="text-green-600 text-sm">Este pedido fue completado exitosamente.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Datos del cliente */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-black">Nombre</Label>
                <div className="flex items-center justify-between">
                  <p className="font-black text-lg">{selectedSale.customerName || 'N/A'}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedSale.customerName || '')}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-black">Teléfono</Label>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{selectedSale.customerPhone || 'N/A'}</p>
                  {selectedSale.customerPhone && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedSale.customerPhone!)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-black">Dirección</Label>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-relaxed">{selectedSale.customerAddress || 'N/A'}</p>
                  {selectedSale.customerAddress && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(selectedSale.customerAddress!)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              {selectedSale.googleMapsLink && (
                <Button className="w-full gap-2 rounded-xl" onClick={() => window.open(selectedSale.googleMapsLink!, '_blank')}>
                  <ExternalLink className="w-4 h-4" /> Ver en Google Maps
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Productos */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Productos a Entregar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedSale.items.map((item, idx) => {
                const p = products.find(prod => prod.id === item.productId);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{p?.name || 'Producto'}</p>
                        {p?.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-black text-sm">{item.quantity} pza</Badge>
                  </div>
                );
              })}

              {selectedSale.deliveryDate && (
                <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-3 mt-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase">Entrega pactada</p>
                    <p className="font-bold text-sm text-primary">{selectedSale.deliveryDate}</p>
                    {selectedSale.deliveryTime && (
                      <p className="text-xs text-primary/70 flex items-center gap-1"><Clock className="w-3 h-3" />{selectedSale.deliveryTime}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Truck className="w-8 h-8 text-primary" /> Mis Entregas
        </h1>
        <p className="text-muted-foreground text-sm">Hola, {currentUser?.name} — {currentUser?.city}</p>
      </div>

      <Tabs defaultValue="entregas">
        <TabsList>
          <TabsTrigger value="entregas">Mis Entregas</TabsTrigger>
          <TabsTrigger value="liquidar" className="relative">
            Liquidar
            {settlementTotals.count > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {settlementTotals.count}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Mis Entregas ─────────────────────────────────────────────────── */}
        <TabsContent value="entregas" className="space-y-6 mt-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pendientes', value: pendingSales.length, icon: Clock, color: 'text-orange-500' },
              { label: 'Entregadas', value: completedSales.length, icon: CheckCircle2, color: 'text-green-600' },
              { label: 'Fallidas',   value: failedSales.length,   icon: AlertTriangle, color: 'text-red-500' },
            ].map((s, i) => (
              <Card key={i} className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={cn("w-7 h-7", s.color)} />
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">{s.label}</p>
                    <p className="text-2xl font-black">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Resumen financiero */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Truck className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">Entregadas hoy</span>
                  </div>
                  <p className="text-3xl font-black">{financials.todayCount}</p>
                  <p className="text-[10px] text-muted-foreground">{completedSales.length} total</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">Total cobrado</span>
                  </div>
                  <p className="text-3xl font-black text-primary">
                    ${financials.totalVenta.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">acumulado</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">Mi comisión</span>
                  </div>
                  <p className="text-3xl font-black text-green-600">
                    ${financials.comision.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">sin liquidar</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Wallet className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">Por depositar</span>
                  </div>
                  <p className={cn("text-3xl font-black", financials.deposito > 0 ? "text-orange-600" : "text-muted-foreground")}>
                    ${financials.deposito.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">a entregar al admin</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pendientes ({pendingSales.length})</TabsTrigger>
              <TabsTrigger value="completed">Completadas ({completedSales.length})</TabsTrigger>
              {failedSales.length > 0 && <TabsTrigger value="failed">Fallidas ({failedSales.length})</TabsTrigger>}
            </TabsList>

            {(['pending', 'completed', 'failed'] as const).map(tab => {
              const tabSales = tab === 'pending' ? pendingSales : tab === 'completed' ? completedSales : failedSales;
              return (
                <TabsContent key={tab} value={tab}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {tabSales.slice().reverse().map(sale => (
                      <Card
                        key={sale.id}
                        className={cn(
                          "border-none shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl overflow-hidden",
                          tab === 'pending' ? "ring-1 ring-primary/20" :
                          tab === 'failed' ? "ring-1 ring-red-200" : ""
                        )}
                        onClick={() => setSelectedSaleId(sale.id)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-black text-base">#{sale.id.toUpperCase()}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>
                            </div>
                            {tab === 'completed' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                            {tab === 'failed' && <XCircle className="w-6 h-6 text-red-500" />}
                            {tab === 'pending' && <Truck className="w-6 h-6 text-orange-400 animate-pulse" />}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-bold text-sm">{sale.customerName || 'Cliente'}</span>
                            </div>
                            {sale.customerPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{sale.customerPhone}</span>
                              </div>
                            )}
                            {sale.city && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{sale.city}</span>
                              </div>
                            )}
                            {sale.customerAddress && (
                              <div className="flex items-start gap-2 pl-5">
                                <span className="text-xs text-muted-foreground line-clamp-1">{sale.customerAddress}</span>
                              </div>
                            )}
                          </div>
                          {tab === 'failed' && sale.failureReason && (
                            <div className="mt-3 bg-red-50 rounded-lg p-2 flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              <p className="text-[11px] text-red-600 font-medium">{sale.failureReason}</p>
                            </div>
                          )}
                          <div className="mt-4 border-t pt-3">
                            <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">Productos</p>
                            <div className="space-y-0.5">
                              {sale.items.map((item, idx) => {
                                const p = products.find(prod => prod.id === item.productId);
                                return (
                                  <p key={idx} className="text-xs font-bold">
                                    {p?.name || 'Producto'} <span className="text-muted-foreground font-normal">×{item.quantity}</span>
                                  </p>
                                );
                              })}
                            </div>
                            <div className="flex justify-end mt-2">
                              <div className="bg-primary/10 p-1.5 rounded-full">
                                <ChevronRight className="w-4 h-4 text-primary" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {tabSales.length === 0 && (
                      <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed">
                        <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground italic text-sm">
                          {tab === 'pending' ? 'No tienes entregas pendientes' :
                           tab === 'completed' ? 'Sin entregas completadas aún' : 'Sin fallos registrados'}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </TabsContent>

        {/* ── Liquidar ─────────────────────────────────────────────────────── */}
        <TabsContent value="liquidar" className="space-y-6 mt-6">
          {/* Balance summary */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Balance a liquidar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Wallet className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">Total cobrado</span>
                  </div>
                  <p className="text-3xl font-black">
                    ${settlementTotals.totalVenta.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">Mi comisión</span>
                  </div>
                  <p className="text-3xl font-black text-green-600">
                    ${settlementTotals.totalComision.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">A depositar</span>
                  </div>
                  <p className={cn("text-3xl font-black", settlementTotals.totalDeposito > 0 ? "text-orange-600" : "text-muted-foreground")}>
                    ${settlementTotals.totalDeposito.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              {settlementTotals.count > 0 && (
                <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
                  {settlementTotals.count} {settlementTotals.count === 1 ? 'entrega sin liquidar' : 'entregas sin liquidar'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Form or all-settled state */}
          {settlementTotals.totalAvailable === 0 ? (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <div className="bg-green-50 p-5 rounded-full">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <p className="font-black text-lg">¡Al corriente!</p>
                <p className="text-muted-foreground text-sm">No tienes entregas pendientes de liquidar.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black">Enviar Reporte de Liquidación</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitSettlement} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">
                        Pedidos a incluir ({settlementTotals.count} de {settlementTotals.totalAvailable})
                      </Label>
                      <button
                        type="button"
                        className="text-[10px] text-primary font-bold hover:underline"
                        onClick={() => setSelectedOrderIds(
                          selectedOrderIds.size === unsettledDeliveries.length
                            ? new Set()
                            : new Set(unsettledDeliveries.map(s => s.id))
                        )}
                      >
                        {selectedOrderIds.size === unsettledDeliveries.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto rounded-xl border bg-muted/10 p-3">
                      {unsettledDeliveries.map(s => (
                        <label key={s.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(s.id)}
                            onChange={e => {
                              const next = new Set(selectedOrderIds);
                              if (e.target.checked) next.add(s.id); else next.delete(s.id);
                              setSelectedOrderIds(next);
                            }}
                            className="w-4 h-4 accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{s.customerName || 'Cliente'}</p>
                            <p className="text-[10px] text-muted-foreground">{s.city || '—'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-primary">${s.totalDeposito.toLocaleString()}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Monto a depositar
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settlementAmount}
                        onChange={e => setSettlementAmount(e.target.value)}
                        className="pl-9 h-12 text-lg font-black"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">
                      Referencia / Folio de depósito
                    </Label>
                    <Input
                      placeholder="Ej: TRANSF-20260609-001"
                      value={settlementReference}
                      onChange={e => setSettlementReference(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Comprobante <span className="text-destructive">*</span>
                    </Label>
                    {settlementProof ? (
                      <div className="relative">
                        <img src={settlementProof} alt="Comprobante" className="w-full max-h-48 object-contain rounded-xl border" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setSettlementProof(undefined)}
                        >
                          Cambiar
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-destructive/50 rounded-xl h-28 cursor-pointer hover:bg-muted/20 transition-colors">
                        <Camera className="w-6 h-6 text-destructive/60 mb-2" />
                        <span className="text-xs text-destructive/70 font-bold">Foto obligatoria</span>
                        <span className="text-[10px] text-muted-foreground">Tomar foto o subir archivo</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSettlementProof} />
                      </label>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 font-black gap-2 bg-green-600 hover:bg-green-700"
                    disabled={!settlementAmount || !settlementReference.trim() || !settlementProof || settlementTotals.count === 0}
                  >
                    <Send className="w-4 h-4" /> Enviar al Admin
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Settlement history */}
          {mySettlements.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                  Historial de Liquidaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {mySettlements.map(s => (
                    <div key={s.id} className={cn(
                      "px-5 py-4",
                      s.status === 'rejected' ? 'bg-red-50/60' : ''
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">{s.weekRange}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.reportedAt ? new Date(s.reportedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-primary">${s.totalDeposito.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                          <Badge className={cn(
                            "text-[9px] font-black uppercase border-none mt-1",
                            s.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            s.status === 'reported'  ? 'bg-orange-100 text-orange-700' :
                            s.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                                                       'bg-muted text-muted-foreground'
                          )}>
                            {s.status === 'confirmed' ? 'Confirmado' :
                             s.status === 'reported'  ? 'Pendiente' :
                             s.status === 'rejected'  ? 'Rechazado' : s.status}
                          </Badge>
                        </div>
                      </div>
                      {s.status === 'rejected' && s.rejectionReason && (
                        <div className="mt-2 flex items-start gap-2 bg-red-100/60 rounded-lg px-3 py-2">
                          <XCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-red-700 font-medium">
                            <span className="font-black">Motivo:</span> {s.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
