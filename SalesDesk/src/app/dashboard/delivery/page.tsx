
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck, CheckCircle2, XCircle, MapPin, User, Phone,
  Package, ExternalLink, Copy, ArrowLeft, Calendar, Clock,
  AlertTriangle, ChevronRight, ShoppingCart, Camera
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
  const { currentUser, sales, products, updateSaleStatus, confirmDelivery, reportDeliveryFailure } = useStore();

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [deliveryPhotoDialogOpen, setDeliveryPhotoDialogOpen] = useState(false);
  const [deliveryPhotoBase64, setDeliveryPhotoBase64] = useState<string | undefined>(undefined);

  const mySales = useMemo(() => sales, [sales]);

  const pendingSales = mySales.filter(s => !['delivered', 'delivery_confirmed', 'paid', 'cancelled', 'delivery_failed'].includes(s.status));
  const completedSales = mySales.filter(s => ['delivered', 'delivery_confirmed', 'paid'].includes(s.status));
  const failedSales = mySales.filter(s => s.status === 'delivery_failed');

  const selectedSale = mySales.find(s => s.id === selectedSaleId);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado" });
  };

  const handleDeliveryPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDeliveryPhotoBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmDelivery = () => {
    if (!selectedSale || !deliveryPhotoBase64) return;
    confirmDelivery(selectedSale.id, deliveryPhotoBase64);
    setDeliveryPhotoDialogOpen(false);
    setDeliveryPhotoBase64(undefined);
    toast({ title: '¡Entregado!', description: 'El pedido fue confirmado con evidencia fotográfica.' });
    setSelectedSaleId(null);
  };

  const handleNextStep = () => {
    if (!selectedSale) return;
    const next = getNextStep(selectedSale.status);
    if (!next) return;
    if (next.nextStatus === 'delivered') {
      setDeliveryPhotoDialogOpen(true);
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
        {/* Modal: foto obligatoria para confirmar entrega */}
        <Dialog
          open={deliveryPhotoDialogOpen}
          onOpenChange={(open) => { if (!open) { setDeliveryPhotoDialogOpen(false); setDeliveryPhotoBase64(undefined); } }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Entrega</DialogTitle>
              <DialogDescription>
                Sube una foto como evidencia de la entrega. Es obligatoria para registrar el pedido como entregado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-3 h-16 border-dashed border-2 bg-muted/10 hover:bg-primary/5 hover:border-primary/40 rounded-2xl transition-all"
                asChild
              >
                <label>
                  <Camera className="w-6 h-6" />
                  <span className="font-black text-sm">
                    {deliveryPhotoBase64 ? 'Cambiar Foto' : 'Subir Foto de Entrega'}
                  </span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleDeliveryPhotoChange} />
                </label>
              </Button>
              {deliveryPhotoBase64 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold">Foto lista</span>
                </div>
              ) : (
                <p className="text-[10px] text-red-500 font-bold text-center">
                  * La foto es obligatoria para confirmar la entrega
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => { setDeliveryPhotoDialogOpen(false); setDeliveryPhotoBase64(undefined); }}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 gap-2"
                disabled={!deliveryPhotoBase64}
                onClick={handleConfirmDelivery}
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar Entrega
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
                        {sale.customerAddress && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
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

                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-black">Productos</p>
                          <p className="text-xs font-bold">
                            {sale.items.reduce((a, i) => a + i.quantity, 0)} pzas — {sale.items.length} tipo{sale.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="bg-primary/10 p-1.5 rounded-full">
                          <ChevronRight className="w-4 h-4 text-primary" />
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
    </div>
  );
}
