
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { applyDateFilter, DateRangeFilter, DATE_FILTER_LABELS, countsForTotals } from '@/lib/date-filters';
import {
  CheckCircle2,
  Truck,
  Phone,
  MapPin,
  User,
  DollarSign, TrendingUp,
  Package,
  ShoppingCart,
  ArrowLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Copy,
  Handshake,
  XCircle,
  Wallet,
  Camera,
  Maximize2,
  CalendarDays,
  MessageSquare,
  SlidersHorizontal,
  X,
  Trash2,
  Plus,
  Send,
  Link
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { SaleStatus } from '@/lib/types';

const STEPS = [
  { id: 'accepted', label: 'Confirmar', icon: Handshake },
  { id: 'contacting', label: 'Contacto', icon: Phone },
  { id: 'scheduled', label: 'Agendado', icon: CalendarDays },
  { id: 'in_transit', label: 'En camino', icon: Truck },
  { id: 'delivered', label: 'Entregado', icon: Package },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'por_confirmar', label: 'Por Confirmar', statuses: ['assigned', 'accepted'] },
  { value: 'en_ruta',       label: 'En Ruta',       statuses: ['contacting', 'scheduled', 'in_transit'] },
  { value: 'completada',    label: 'Completada',    statuses: ['delivered', 'delivery_confirmed'] },
  { value: 'liquidada',     label: 'Liquidada',     statuses: ['paid'] },
  { value: 'devolucion',    label: 'Devolución',    statuses: ['pending_return'] },
  { value: 'fallida',       label: 'Fallida',       statuses: ['delivery_failed'] },
  { value: 'cancelada',     label: 'Cancelada',     statuses: ['cancelled'] },
];

export default function SellerSalesPage() {
  const { currentUser, users, sales, products, inventory, registerMultiSale, updateSaleStatus, assignDeliveryPerson, deleteSale } = useStore();
  const deliveryPersons = users.filter(u => u.role === 'delivery');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isAssignDeliveryOpen, setIsAssignDeliveryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });
  const [rejectionNote, setRejectionNote] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState<DateRangeFilter | 'all'>('all');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [deleteConfirmSaleId, setDeleteConfirmSaleId] = useState<string | null>(null);

  const mySales = sales.filter(s => s.sellerId === currentUser?.id);

  // ── Nueva Venta ──────────────────────────────────────────────────────────
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [nsDeliveryPersonId, setNsDeliveryPersonId] = useState('');
  const [nsCity, setNsCity] = useState('');
  const [nsCustomerName, setNsCustomerName] = useState('');
  const [nsCustomerPhone, setNsCustomerPhone] = useState('');
  const [nsCustomerAddress, setNsCustomerAddress] = useState('');
  const [nsGoogleMapsLink, setNsGoogleMapsLink] = useState('');
  const [nsNotes, setNsNotes] = useState('');
  const [nsBatchItems, setNsBatchItems] = useState<Record<string, { quantity: string; price: string; commission: string }>>({});
  const [nsPhoto, setNsPhoto] = useState<string | undefined>(undefined);
  const [nsManualVenta, setNsManualVenta] = useState('');
  const [nsManualComision, setNsManualComision] = useState('');

  // Repartidores con stock (vinculados a pedidos del seller O con inventario disponible)
  const availableDeliveryPersons = useMemo(() => {
    const linkedIds = new Set(mySales.map(s => s.deliveryPersonId).filter(Boolean) as string[]);
    const withInventory = new Set(inventory.map(i => i.deliveryPersonId));
    return deliveryPersons.filter(d => linkedIds.has(d.id) || withInventory.has(d.id));
  }, [deliveryPersons, mySales, inventory]);

  const nsStockErrors = useMemo(() => {
    if (!nsDeliveryPersonId) return {} as Record<string, { available: number; requested: number }>;
    const errors: Record<string, { available: number; requested: number }> = {};
    Object.entries(nsBatchItems).forEach(([productId, data]) => {
      const qty = parseInt(data.quantity);
      if (qty > 0) {
        const available = inventory.find(i => i.productId === productId && i.deliveryPersonId === nsDeliveryPersonId)?.quantity ?? 0;
        if (qty > available) errors[productId] = { available, requested: qty };
      }
    });
    return errors;
  }, [nsBatchItems, nsDeliveryPersonId, inventory]);

  const nsTotals = useMemo(() => {
    let calcVenta = 0; let calcComision = 0; const items: any[] = [];
    Object.entries(nsBatchItems).forEach(([productId, data]) => {
      const qty = parseInt(data.quantity);
      if (qty > 0) {
        const price = parseFloat(data.price) || 0;
        const commission = parseFloat(data.commission) || 0;
        const subtotal = qty * price;
        calcVenta += subtotal; calcComision += qty * commission;
        items.push({ productId, quantity: qty, priceAtSale: price, commissionAtSale: commission, subtotal });
      }
    });
    const totalVenta = nsManualVenta !== '' ? parseFloat(nsManualVenta) : calcVenta;
    const totalComision = nsManualComision !== '' ? parseFloat(nsManualComision) : calcComision;
    return { calcVenta, calcComision, totalVenta, totalComision, totalDeposito: totalVenta - totalComision, items };
  }, [nsBatchItems, nsManualVenta, nsManualComision]);

  const resetNewSaleForm = () => {
    setNsDeliveryPersonId(''); setNsCity(''); setNsCustomerName(''); setNsCustomerPhone('');
    setNsCustomerAddress(''); setNsGoogleMapsLink(''); setNsNotes('');
    setNsPhoto(undefined); setNsManualVenta(''); setNsManualComision('');
    const init: Record<string, any> = {};
    products.forEach(p => { init[p.id] = { quantity: '', price: p.price.toString(), commission: p.defaultCommission.toString() }; });
    setNsBatchItems(init);
  };

  const handleNewSaleDeliveryChange = (dpId: string) => {
    setNsDeliveryPersonId(dpId);
    const dp = users.find(u => u.id === dpId);
    setNsCity(dp?.city || '');
    const init: Record<string, any> = {};
    products.forEach(p => { init[p.id] = { quantity: '', price: p.price.toString(), commission: p.defaultCommission.toString() }; });
    setNsBatchItems(init);
  };

  const handleNewSaleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsDeliveryPersonId) { toast({ variant: 'destructive', title: 'Repartidor requerido', description: 'Selecciona el repartidor que entregará el pedido.' }); return; }
    if (!nsCustomerName.trim()) { toast({ variant: 'destructive', title: 'Cliente requerido', description: 'Ingresa el nombre del cliente.' }); return; }
    if (!nsCustomerPhone.trim()) { toast({ variant: 'destructive', title: 'Teléfono requerido', description: 'Ingresa el número de contacto del cliente.' }); return; }
    if (!nsCustomerAddress.trim()) { toast({ variant: 'destructive', title: 'Dirección requerida', description: 'Ingresa la dirección de entrega.' }); return; }
    if (nsTotals.items.length === 0) { toast({ variant: 'destructive', title: 'Venta vacía', description: 'Ingresa cantidades para al menos un producto.' }); return; }
    if (Object.keys(nsStockErrors).length > 0) { toast({ variant: 'destructive', title: 'Stock insuficiente', description: 'Corrige las cantidades marcadas antes de continuar.' }); return; }

    registerMultiSale(
      currentUser!.id, nsCity,
      nsTotals.items, nsCustomerName, nsCustomerPhone, nsCustomerAddress,
      nsNotes, nsTotals.totalVenta, nsTotals.totalComision,
      nsGoogleMapsLink, nsPhoto, nsDeliveryPersonId
    );
    setIsNewSaleOpen(false);
    resetNewSaleForm();
  };

  const selectedSale = mySales.find(s => s.id === selectedSaleId);

  // Resumen por ciudad — agrupa las ventas activas (excluye canceladas/fallidas)
  const citySummary = useMemo(() => {
    const active = mySales.filter(s => countsForTotals(s.status));
    const map: Record<string, number> = {};
    active.forEach(s => {
      const city = s.city?.trim() || 'Sin ciudad';
      map[city] = (map[city] || 0) + 1;
    });
    return {
      rows: Object.entries(map).sort(([, a], [, b]) => b - a),
      total: active.length,
    };
  }, [mySales]);

  const salesCities = useMemo(() =>
    [...new Set(mySales.map(s => s.city).filter(Boolean) as string[])].sort(),
    [mySales]
  );

  const myDeliveryPersonStats = useMemo(() => {
    const activeIds = [...new Set(mySales.filter(s => s.deliveryPersonId).map(s => s.deliveryPersonId!))];
    return deliveryPersons
      .filter(dp => activeIds.includes(dp.id))
      .map(dp => {
        const dpSales = mySales.filter(s => s.deliveryPersonId === dp.id);
        return {
          person: dp,
          activos: dpSales.filter(s => ['assigned','accepted','contacting','scheduled','in_transit'].includes(s.status)).length,
          entregados: dpSales.filter(s => ['delivered','delivery_confirmed','paid'].includes(s.status)).length,
          fallidos: dpSales.filter(s => s.status === 'delivery_failed').length,
          comisionPendiente: dpSales
            .filter(s => ['delivered','delivery_confirmed'].includes(s.status) && !s.settlementId)
            .reduce((sum, s) => sum + s.totalComision, 0),
        };
      });
  }, [mySales, deliveryPersons]);

  const filteredSales = useMemo(() => {
    const STATUS_GROUPS: Record<string, string[]> = {
      por_confirmar: ['assigned', 'accepted'],
      en_ruta:       ['contacting', 'scheduled', 'in_transit'],
      completada:    ['delivered', 'delivery_confirmed'],
      liquidada:     ['paid'],
      devolucion:    ['pending_return'],
      fallida:       ['delivery_failed'],
      cancelada:     ['cancelled'],
    };
    let result = filterPeriod === 'all' ? mySales : applyDateFilter(mySales, filterPeriod);
    if (filterCity !== 'all') result = result.filter(s => s.city === filterCity);
    if (filterStatuses.length > 0) {
      const allowed = filterStatuses.flatMap(sv => STATUS_GROUPS[sv] ?? []);
      result = result.filter(s => allowed.includes(s.status));
    }
    if (filterDelivery !== 'all') result = result.filter(s => s.deliveryPersonId === filterDelivery);
    if (filterAmountMin) result = result.filter(s => s.totalVenta >= Number(filterAmountMin));
    if (filterAmountMax) result = result.filter(s => s.totalVenta <= Number(filterAmountMax));
    if (filterCustomer.trim()) result = result.filter(s => s.customerName?.toLowerCase().includes(filterCustomer.toLowerCase()));
    return result;
  }, [mySales, filterPeriod, filterCity, filterStatuses, filterDelivery, filterAmountMin, filterAmountMax, filterCustomer]);

  const hasActiveFilters =
    filterCity !== 'all' || filterStatuses.length > 0 || filterDelivery !== 'all' ||
    filterPeriod !== 'all' || !!filterAmountMin || !!filterAmountMax || !!filterCustomer;

  const clearFilters = () => {
    setFilterCity('all');
    setFilterStatuses([]);
    setFilterDelivery('all');
    setFilterPeriod('all');
    setFilterAmountMin('');
    setFilterAmountMax('');
    setFilterCustomer('');
  };

  const toggleStatus = (value: string) =>
    setFilterStatuses(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const getStepProgress = (status: SaleStatus) => {
    switch (status) {
      case 'assigned': return 0;
      case 'accepted': return 20;
      case 'contacting': return 40;
      case 'scheduled': return 60;
      case 'in_transit': return 80;
      case 'delivered':
      case 'delivery_confirmed':
      case 'paid': return 100;
      default: return 0;
    }
  };

  const getStatusLabel = (status: SaleStatus) => {
    switch (status) {
      case 'assigned': return 'Por Confirmar';
      case 'accepted': return 'Confirmada';
      case 'contacting': return 'En Contacto';
      case 'scheduled': return 'Agendado';
      case 'in_transit': return 'En camino';
      case 'delivered': return 'Entregado';
      case 'delivery_confirmed': return 'Entregado';
      case 'paid': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'delivery_failed': return 'Fallido';
      default: return status;
    }
  };

  const getSaleStatusLabel = (sale: { status: SaleStatus; failureReason?: string | null }) => {
    if (sale.status === 'delivery_failed')
      return sale.failureReason?.startsWith('Rechazado') ? 'Rechazado' : 'Fallido';
    return getStatusLabel(sale.status);
  };

  const handleUpdateStatus = (status: SaleStatus) => {
    if (!selectedSale) return;
    if (status === 'scheduled') {
      setIsScheduleDialogOpen(true);
      return;
    }
    updateSaleStatus(selectedSale.id, status);
  };

  const confirmSchedule = () => {
    if (!selectedSale || !selectedDate) {
      toast({ variant: "destructive", title: "Fecha requerida", description: "Debes seleccionar el día del acuerdo." });
      return;
    }
    
    const dateStr = format(selectedDate, "EEEE d 'de' MMMM", { locale: es });
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    updateSaleStatus(selectedSale.id, 'scheduled', { 
      deliveryDate: formattedDate, 
      deliveryTime: scheduleData.time,
      note: `Entrega pactada para el ${formattedDate} ${scheduleData.time}`
    });
    
    setIsScheduleDialogOpen(false);
    setSelectedDate(undefined);
    setScheduleData({ date: '', time: '' });
  };

  const confirmRejection = () => {
    if (!selectedSale || !rejectionNote.trim()) {
      toast({ variant: "destructive", title: "Nota requerida", description: "Por favor indica el motivo del rechazo." });
      return;
    }

    updateSaleStatus(selectedSale.id, 'cancelled', { note: rejectionNote });
    setIsRejectDialogOpen(false);
    setRejectionNote('');
    toast({ title: "Venta Rechazada", description: "Se ha notificado al administrador y devuelto el stock." });
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Información copiada al portapapeles." });
  };

  if (selectedSale) {
    const progress = getStepProgress(selectedSale.status);
    const currentStatusIdx = STEPS.findIndex(s => {
      if (selectedSale.status === 'paid') return STEPS.length - 1;
      return s.id === selectedSale.status;
    });

    const isPendingConfirmation = selectedSale.status === 'assigned';
    // Solo el vendedor puede actuar sobre estos estados; el resto son terminales para él
    const isSellerActionable = ['accepted', 'contacting', 'scheduled', 'in_transit'].includes(selectedSale.status);
    const isSaleCompleted = ['delivered', 'delivery_confirmed', 'paid'].includes(selectedSale.status);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedSaleId(null)} className="rounded-full h-10 w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black">Venta #{selectedSale.id.toUpperCase()}</h1>
              <Badge variant="secondary" className={cn(
                "border-none font-bold",
                ['cancelled', 'delivery_failed'].includes(selectedSale.status) ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
              )}>
                {getSaleStatusLabel(selectedSale)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {new Date(selectedSale.createdAt).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {isPendingConfirmation && (
          <Card className="border-none shadow-2xl bg-amber-500 text-white rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
            <CardContent className="p-6 md:p-8 flex items-center gap-6">
              <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                <Handshake className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{getSaleStatusLabel(selectedSale).toUpperCase()}</h2>
                <p className="text-white/80 text-sm mt-1">Venta asignada — en espera de aceptación.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {!['delivery_failed', 'pending_return'].includes(selectedSale.status) && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">Seguimiento del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-12 py-6">
                <div className="relative px-4">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
                  <div className="flex justify-between relative z-10">
                    {STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const isPast = idx <= currentStatusIdx || selectedSale.status === 'paid';
                      const isCurrent = idx === currentStatusIdx && selectedSale.status !== 'paid';

                      return (
                        <div key={step.id} className="flex flex-col items-center gap-2 group">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500",
                            isPast ? "bg-primary border-primary text-primary-foreground shadow-lg" : "bg-white border-muted text-muted-foreground"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-tight",
                            isPast ? "text-primary" : "text-muted-foreground"
                          )}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6 px-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">Situación actual</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-3">
                      {getStatusLabel(selectedSale.status)}
                    </Badge>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-visible">
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 bg-primary w-8 h-8 rounded-xl shadow-lg flex items-center justify-center text-primary-foreground transition-all duration-1000 ease-out"
                      style={{ left: `calc(${progress}% - 16px)` }}
                    >
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {isSaleCompleted && (
              <Card className="border-none shadow-2xl bg-green-600 text-white rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
                <CardContent className="p-8 flex items-center gap-6">
                  <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">COMPLETADA</h2>
                    <p className="text-white/70 text-sm mt-1">El repartidor confirmó la entrega. No se requieren más acciones del vendedor.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {['delivery_failed', 'pending_return'].includes(selectedSale.status) && (
              <Card className="border-none shadow-2xl bg-red-600 text-white rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
                <CardContent className="p-8 flex items-center gap-6">
                  <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">ENTREGA FALLIDA</h2>
                    {selectedSale.failureReason ? (
                      <p className="text-white/80 text-sm mt-1 italic">"{selectedSale.failureReason}"</p>
                    ) : (
                      <p className="text-white/70 text-sm mt-1">El repartidor no pudo completar la entrega.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}


            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">Productos vendidos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-[10px] font-black uppercase pl-6">Producto</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Cant.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">P. Unit.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right pr-6">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item, idx) => {
                      const p = products.find(prod => prod.id === item.productId);
                      return (
                        <TableRow key={idx} className="h-16">
                          <TableCell className="font-bold text-sm pl-6">{p?.name || 'Producto'}</TableCell>
                          <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                          <TableCell className="text-center font-medium">${item.priceAtSale.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-black pr-6">${item.subtotal.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={3} className="text-right font-bold py-4">Total:</TableCell>
                      <TableCell className="text-right font-black text-lg pr-6 py-4">${selectedSale.totalVenta.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Asignar repartidor — vendedor puede asignar sus propias ventas (no para pedidos ya entregados) */}
            {isSellerActionable && (
              <Card className="border-none shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" /> REPARTIDOR
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedSale.deliveryPersonId ? (
                    <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-xl mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {deliveryPersons.find(d => d.id === selectedSale.deliveryPersonId)?.name.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          {deliveryPersons.find(d => d.id === selectedSale.deliveryPersonId)?.name ?? 'Repartidor asignado'}
                        </p>
                        <p className="text-[10px] text-primary font-black uppercase">Asignado</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic mb-2">Sin repartidor asignado</p>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedSale.deliveryDate && (
              <Card className="border-none shadow-xl bg-primary/5 border-l-4 border-l-primary rounded-2xl overflow-hidden animate-in fade-in duration-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black text-primary uppercase flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> ACUERDO DE ENTREGA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-lg font-black text-primary px-3 py-1 rounded-lg w-fit border border-primary/20">{selectedSale.deliveryDate}</p>
                    {selectedSale.deliveryTime && (
                      <p className="text-sm font-bold text-primary flex items-center gap-1 mt-2">
                        <Clock className="w-3.5 h-3.5" /> {selectedSale.deliveryTime}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className={cn(
              "border-none shadow-sm rounded-2xl transition-opacity",
              isPendingConfirmation ? "opacity-50 grayscale pointer-events-none" : ""
            )}>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  Cliente {isPendingConfirmation && <Badge variant="outline" className="text-[8px] bg-red-50 text-red-700">Acepta para ver</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-black">Nombre</Label>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-lg">{isPendingConfirmation ? '**********' : (selectedSale.customerName || 'N/A')}</p>
                    {!isPendingConfirmation && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedSale.customerName || '')}>
                      <Copy className="h-3 w-3" />
                    </Button>}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-black">Teléfono</Label>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{isPendingConfirmation ? '**********' : (selectedSale.customerPhone || 'N/A')}</p>
                    {!isPendingConfirmation && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedSale.customerPhone || '')}>
                      <Copy className="h-3 w-3" />
                    </Button>}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-black">Dirección</Label>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-xs leading-relaxed">{isPendingConfirmation ? '**********' : (selectedSale.customerAddress || 'N/A')}</p>
                    {!isPendingConfirmation && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedSale.customerAddress || '')}>
                      <Copy className="h-3 w-3" />
                    </Button>}
                  </div>
                </div>
                {!isPendingConfirmation && selectedSale.googleMapsLink && (
                  <Button className="w-full gap-2 rounded-xl" onClick={() => window.open(selectedSale.googleMapsLink, '_blank')}>
                    <ExternalLink className="w-4 h-4" /> Ver Ubicación Exacta
                  </Button>
                )}
              </CardContent>
            </Card>

            {selectedSale.notes && (
              <Card className="border-none shadow-sm rounded-2xl bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" /> OBSERVACIONES
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic font-medium">"{selectedSale.notes}"</p>
                </CardContent>
              </Card>
            )}

            {selectedSale.photoUrl && !isPendingConfirmation && (
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" /> FOTO DE REFERENCIA
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="relative group cursor-pointer rounded-xl overflow-hidden border shadow-inner bg-muted/20">
                        <img 
                          src={selectedSale.photoUrl} 
                          alt="Referencia de venta" 
                          className="w-full h-auto object-cover max-h-[300px] transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="text-white w-8 h-8 drop-shadow-lg" />
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                      <DialogHeader className="hidden">
                        <DialogTitle>Foto de Referencia</DialogTitle>
                      </DialogHeader>
                      <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img 
                          src={selectedSale.photoUrl} 
                          alt="Referencia Full" 
                          className="max-w-full max-h-[90vh] rounded-xl shadow-2xl border-4 border-white/10" 
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <Card className="border-none shadow-2xl bg-primary text-primary-foreground rounded-3xl overflow-hidden p-8">
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase opacity-70 tracking-widest">Total de la venta</p>
                  <p className="text-5xl font-black tracking-tighter">${selectedSale.totalVenta.toLocaleString()}</p>
                </div>
              </Card>

              <Card className="border-none shadow-lg bg-white border-l-8 border-l-blue-500 rounded-3xl p-8">
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <Truck className="w-3 h-3 text-blue-600" /> COMISIÓN REPARTIDOR
                  </p>
                  <p className="text-4xl font-black tracking-tighter text-blue-600">${selectedSale.totalComision.toLocaleString()}</p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Dialog open={isScheduleDialogOpen} onOpenChange={(val) => {
          setIsScheduleDialogOpen(val);
          if (!val) {
            setSelectedDate(undefined);
            setScheduleData({ date: '', time: '' });
          }
        }}>
          <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
            <div className="bg-primary p-6 text-primary-foreground">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-white">Agendar Entrega</DialogTitle>
                    <DialogDescription className="text-primary-foreground/70">
                      Selecciona la fecha y hora acordada con el cliente.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>
            
            <div className="p-8 space-y-8 bg-white flex flex-col items-center">
              <div className="w-full flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={es}
                  numberOfMonths={2}
                  weekStartsOn={1}
                  className="rounded-xl border shadow-sm p-6"
                  classNames={{
                    day_selected: "border-2 border-slate-900 text-slate-900 bg-slate-50 font-black rounded-xl !opacity-100 ring-offset-2 shadow-sm",
                    day_today: "text-primary font-bold border-b-2 border-primary",
                    head_cell: "text-muted-foreground rounded-md w-12 font-bold text-[0.8rem] lowercase",
                    cell: "h-12 w-12 text-center p-0 relative",
                    day: "h-12 w-12 p-0 font-medium aria-selected:opacity-100 rounded-full hover:bg-muted transition-all",
                  }}
                />
              </div>
              
              <div className="w-full max-w-md space-y-3">
                <Label htmlFor="time" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center block">HORA APROXIMADA</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="time" 
                    placeholder="Ej: 3:30 PM" 
                    className="h-14 pl-12 rounded-2xl border-none bg-muted/30 focus:bg-white focus:ring-2 focus:ring-primary/20 text-lg font-bold"
                    value={scheduleData.time}
                    onChange={e => setScheduleData({...scheduleData, time: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-muted/10 border-t flex justify-end gap-6">
              <Button variant="ghost" onClick={() => {
                setSelectedDate(undefined);
                setScheduleData({ date: '', time: '' });
                setIsScheduleDialogOpen(false);
              }} className="px-8 h-12 rounded-xl font-bold text-muted-foreground hover:bg-transparent">
                Borrar
              </Button>
              <Button onClick={confirmSchedule} className="px-10 h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95" disabled={!selectedDate}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Mis Ventas</h1>
          <p className="text-muted-foreground text-sm">Gestiona y actualiza el estado de tus entregas</p>
        </div>
        <Dialog open={isNewSaleOpen} onOpenChange={(val) => { setIsNewSaleOpen(val); if (val) resetNewSaleForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-12 px-6 shadow-xl bg-primary hover:bg-primary/90">
              <Plus className="w-5 h-5" /> Nueva Venta Directa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
            <div className="bg-primary p-6 text-primary-foreground">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl"><ShoppingCart className="w-6 h-6" /></div>
                  <div>
                    <DialogTitle className="text-2xl font-bold">Registrar Venta Directa</DialogTitle>
                    <p className="text-primary-foreground/70 text-sm">Completa el formulario para descontar stock y registrar el cobro.</p>
                  </div>
                </div>
              </DialogHeader>
            </div>
            <div className="p-4 md:p-8 space-y-8">
              {/* Repartidor + Ciudad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 md:p-8 rounded-3xl border border-dashed border-primary/20">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Repartidor <span className="text-destructive">*</span>
                  </Label>
                  <Select value={nsDeliveryPersonId} onValueChange={handleNewSaleDeliveryChange}>
                    <SelectTrigger className="h-11 bg-white border-none shadow-sm"><SelectValue placeholder="Seleccionar repartidor..." /></SelectTrigger>
                    <SelectContent>
                      {availableDeliveryPersons.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name} ({d.city})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Ciudad</Label>
                  <Input className="h-11 bg-white border-none shadow-sm" value={nsCity} onChange={e => setNsCity(e.target.value)} placeholder="Ciudad del cliente" />
                </div>

                {/* Cliente */}
                <div className="md:col-span-2 space-y-4 pt-4 border-t border-primary/10">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-black uppercase text-primary tracking-widest">
                      <User className="w-4 h-4" /> CLIENTE <span className="text-destructive text-[10px] font-bold">(OBLIGATORIO *)</span>
                    </Label>
                    <Input className="h-14 bg-white border-2 border-primary/20 shadow-sm text-lg font-bold rounded-2xl focus:border-primary" value={nsCustomerName} onChange={e => setNsCustomerName(e.target.value)} placeholder="Nombre completo del cliente" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Phone className="w-3.5 h-3.5" /> Teléfono</Label>
                      <Input className="h-12 bg-white border-none shadow-sm" value={nsCustomerPhone} onChange={e => setNsCustomerPhone(e.target.value)} placeholder="Número de contacto" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> Dirección de Entrega *</Label>
                      <Input className="h-12 bg-white border-none shadow-sm" value={nsCustomerAddress} onChange={e => setNsCustomerAddress(e.target.value)} placeholder="Calle, número, colonia..." />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Link className="w-3.5 h-3.5" /> Link de Google Maps (Opcional)</Label>
                  <Input className="h-11 bg-white border-none shadow-sm" value={nsGoogleMapsLink} onChange={e => setNsGoogleMapsLink(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                </div>
              </div>

              {/* Productos */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Mercancía Entregada</Label>
                <div className="rounded-2xl border bg-card shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-[10px] h-10 uppercase font-black text-left pl-6">Producto</th>
                        <th className="text-[10px] h-10 text-center uppercase font-black">Stock</th>
                        <th className="text-[10px] h-10 text-center uppercase font-black">Cant.</th>
                        <th className="text-[10px] h-10 text-right uppercase font-black pr-6">Precio Unit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => {
                        const stock = nsDeliveryPersonId
                          ? (inventory.find(i => i.productId === p.id && i.deliveryPersonId === nsDeliveryPersonId)?.quantity ?? 0)
                          : 0;
                        const itemData = nsBatchItems[p.id] || { quantity: '', price: p.price.toString(), commission: p.defaultCommission.toString() };
                        const isSelected = parseInt(itemData.quantity) > 0;
                        return (
                          <tr key={p.id} className={cn("h-14 border-t transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/10")}>
                            <td className="py-2 pl-6">
                              <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "")}>{p.name}</span>
                            </td>
                            <td className="py-2 text-center">
                              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md", stock < 5 ? "bg-red-100 text-red-700" : "bg-secondary text-secondary-foreground")}>{stock}</span>
                            </td>
                            <td className="py-2">
                              <div className="flex flex-col items-center">
                                <Input
                                  type="number" min="0" max={stock} placeholder="0"
                                  className={cn("h-9 w-16 mx-auto text-center text-xs font-bold border-none bg-muted/30 focus:bg-white", nsStockErrors[p.id] && "ring-1 ring-destructive bg-destructive/5")}
                                  value={itemData.quantity}
                                  onChange={e => setNsBatchItems(prev => ({ ...prev, [p.id]: { ...prev[p.id], quantity: e.target.value } }))}
                                  disabled={!nsDeliveryPersonId || stock === 0}
                                />
                                {nsStockErrors[p.id] && <p className="text-[10px] text-destructive font-bold mt-0.5">Máx. {nsStockErrors[p.id].available}</p>}
                              </div>
                            </td>
                            <td className="py-2 text-right pr-6">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  className="h-9 w-24 text-right text-xs font-bold border-none bg-muted/30 focus:bg-white"
                                  value={itemData.price}
                                  onChange={e => setNsBatchItems(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                                  disabled={!nsDeliveryPersonId}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Foto */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Foto de Comprobante (Opcional)</Label>
                <div className="flex items-center gap-6">
                  <Button type="button" variant="outline" className="gap-3 h-16 px-8 border-dashed border-2 bg-muted/10 hover:bg-primary/5 rounded-2xl" asChild>
                    <label>
                      <Camera className="w-6 h-6" /> <span className="font-black text-sm">{nsPhoto ? 'Cambiar Foto' : 'Subir Foto'}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setNsPhoto(r.result as string); r.readAsDataURL(f); } }} />
                    </label>
                  </Button>
                  {nsPhoto && (
                    <div className="relative">
                      <img src={nsPhoto} alt="Preview" className="w-20 h-20 object-cover rounded-xl shadow-md border-2 border-primary/20" />
                      <button onClick={() => setNsPhoto(undefined)} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-lg">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Totales */}
              {nsTotals.items.length > 0 && (
                <div className="bg-primary/5 p-4 md:p-8 rounded-3xl space-y-6 border border-primary/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3 bg-white p-5 rounded-2xl shadow-sm border border-primary/10">
                      <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Cobro al Cliente</Label>
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg"><DollarSign className="w-4 h-4 text-primary" /></div>
                        <Input type="number" className="h-10 text-xl font-black border-none focus:ring-0"
                          value={nsManualVenta === '' ? nsTotals.calcVenta : nsManualVenta}
                          onChange={e => setNsManualVenta(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-3 bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
                      <Label className="text-[10px] text-blue-600 uppercase font-black tracking-widest">Comisión Repartidor</Label>
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-lg"><Truck className="w-4 h-4 text-blue-600" /></div>
                        <Input type="number" className="h-10 text-xl font-black text-blue-600 border-none focus:ring-0"
                          value={nsManualComision === '' ? nsTotals.calcComision : nsManualComision}
                          onChange={e => setNsManualComision(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-3 bg-primary p-5 rounded-2xl shadow-lg flex flex-col justify-center">
                      <Label className="text-[10px] text-primary-foreground/70 uppercase font-black tracking-widest">A PAGAR AL ADMIN</Label>
                      <div className="flex items-center gap-3 text-primary-foreground">
                        <CheckCircle2 className="w-6 h-6" />
                        <p className="text-3xl font-black tracking-tighter">${nsTotals.totalDeposito.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleNewSaleRegister}
                className="w-full gap-3 h-16 text-xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.02]"
                disabled={nsTotals.items.length === 0 || !nsDeliveryPersonId || !nsCustomerPhone.trim() || !nsCustomerAddress.trim() || Object.keys(nsStockErrors).length > 0}
              >
                <Send className="w-6 h-6" /> Registrar y Finalizar Venta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Métricas ─────────────────────────────────────────────────────── */}
      {mySales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary border-l-8 border-l-primary-foreground/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-primary-foreground/70 uppercase flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Total Entregado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-primary-foreground tracking-tighter">
                ${filteredSales.filter(s => ['delivered','paid'].includes(s.status)).reduce((acc, s) => acc + s.totalVenta, 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-primary-foreground/60 mt-2 font-medium">Valor de productos entregados</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white border-l-8 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-500" /> En Ruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-green-600 tracking-tighter">
                ${filteredSales.filter(s => ['assigned','accepted','contacting','scheduled','in_transit'].includes(s.status)).reduce((acc, s) => acc + s.totalVenta, 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">Valor de productos en camino</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white border-l-8 border-l-orange-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-400" /> Comisiones Repartidores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-orange-500 tracking-tighter">
                ${filteredSales.filter(s => ['delivered','paid'].includes(s.status)).reduce((acc, s) => acc + s.totalComision, 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">A pagar a repartidores</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Resumen por Ciudad ─────────────────────────────────────────── */}
      {mySales.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Conteo por ciudad */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Ventas por Ciudad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {citySummary.rows.map(([city, count]) => (
                    <TableRow key={city} className="h-12">
                      <TableCell className="pl-6 font-bold text-sm">{city}</TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="bg-primary/10 text-primary font-black text-sm px-3 py-1 rounded-full">
                          {count} {count === 1 ? 'venta' : 'ventas'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/20 h-12">
                    <TableCell className="pl-6 font-black text-sm uppercase tracking-widest text-muted-foreground">Total</TableCell>
                    <TableCell className="text-right pr-6">
                      <span className="font-black text-primary text-base">{citySummary.total} ventas</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Últimas Ventas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-4">Fecha / Ciudad</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Monto</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right pr-4">Com. Rep.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mySales.filter(s => countsForTotals(s.status))
                    .slice().reverse().slice(0, 8)
                    .map(sale => (
                    <TableRow key={sale.id} className="h-14">
                      <TableCell className="pl-4">
                        <p className="font-bold text-xs">{new Date(sale.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{sale.city || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">${sale.totalVenta.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs text-blue-600 font-bold pr-4">${sale.totalComision.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      {mySales.length > 0 && (
        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filtros
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Mostrando{' '}
                  <span className="font-black text-foreground">{filteredSales.length}</span>
                  {' '}de{' '}
                  <span className="font-bold">{mySales.length}</span>
                  {' '}ventas
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5"
                  >
                    <X className="w-3 h-3" /> Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Ciudad</label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="h-9 rounded-xl border-none bg-muted/30 text-xs font-medium">
                    <SelectValue placeholder="Todas las ciudades" />
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
                <label className="text-[10px] font-black uppercase text-muted-foreground">Estado</label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {STATUS_FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleStatus(opt.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase border transition-all",
                        filterStatuses.includes(opt.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-transparent hover:border-primary/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Cliente</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={filterCustomer}
                    onChange={e => setFilterCustomer(e.target.value)}
                    className="h-9 rounded-xl border-none bg-muted/30 text-xs pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Período</label>
                <Select value={filterPeriod} onValueChange={v => setFilterPeriod(v as DateRangeFilter | 'all')}>
                  <SelectTrigger className="h-9 rounded-xl border-none bg-muted/30 text-xs font-medium">
                    <SelectValue placeholder="Todo el tiempo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el tiempo</SelectItem>
                    {(Object.entries(DATE_FILTER_LABELS) as [DateRangeFilter, string][]).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Monto de Venta ($)</label>
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmSaleId} onOpenChange={open => { if (!open) setDeleteConfirmSaleId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar venta</DialogTitle>
            <DialogDescription>
              ¿Eliminar la venta #{deleteConfirmSaleId?.toUpperCase()}? El stock será devuelto a tu inventario. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmSaleId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteConfirmSaleId) {
                  await deleteSale(deleteConfirmSaleId);
                  setDeleteConfirmSaleId(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSales.slice().reverse().map((sale) => (
          <Card 
            key={sale.id} 
            className={cn(
              "border-none shadow-sm hover:shadow-xl transition-all cursor-pointer rounded-2xl overflow-hidden group relative",
              sale.status === 'assigned' ? "ring-2 ring-primary ring-offset-2" : ""
            )}
            onClick={() => setSelectedSaleId(sale.id)}
          >
            {sale.status === 'assigned' && (
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-primary animate-pulse text-[8px] font-black uppercase">Nueva Asignación</Badge>
              </div>
            )}
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-black pt-2">#{sale.id.toUpperCase()}</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase">{new Date(sale.createdAt).toLocaleDateString()}</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Badge className={cn(
                    "font-black text-[10px] uppercase border-none",
                    sale.status === 'assigned' ? "bg-muted text-muted-foreground" :
                    ['delivered', 'delivery_confirmed', 'paid'].includes(sale.status) ? "bg-green-100 text-green-700" :
                    ['cancelled', 'delivery_failed'].includes(sale.status) ? "bg-red-100 text-red-700" :
                    "bg-primary/10 text-primary"
                  )}>
                    {getSaleStatusLabel(sale)}
                  </Badge>
                  {['assigned','accepted','contacting','scheduled','in_transit'].includes(sale.status) && (
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirmSaleId(sale.id); }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Eliminar venta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg"><User className="w-4 h-4 text-primary" /></div>
                <span className="font-bold text-sm truncate">{sale.status === 'assigned' ? '**********' : (sale.customerName || 'Cliente')}</span>
              </div>
              {sale.deliveryPersonId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium">{deliveryPersons.find(d => d.id === sale.deliveryPersonId)?.name || '—'}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-3.5 h-3.5 text-primary/60" />
                <span className="text-xs font-medium">{users.find(u => u.id === sale.sellerId)?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase">Total Venta</p>
                  <p className="text-xl font-black text-primary">${sale.totalVenta.toLocaleString()}</p>
                </div>
                <div className="bg-primary p-2 rounded-full text-primary-foreground transition-colors group-hover:bg-primary/90">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {mySales.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
             <div className="bg-muted/50 p-6 rounded-full"><ShoppingCart className="w-12 h-12 text-muted-foreground/30" /></div>
             <div>
                <h3 className="text-lg font-bold">Sin ventas registradas</h3>
                <p className="text-sm text-muted-foreground italic">Las ventas que te asigne el administrador aparecerán aquí.</p>
             </div>
          </div>
        )}
        {filteredSales.length === 0 && mySales.length > 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
            <div className="bg-muted/50 p-6 rounded-full"><SlidersHorizontal className="w-10 h-10 text-muted-foreground/30" /></div>
            <div>
              <h3 className="text-lg font-bold">Sin resultados</h3>
              <p className="text-sm text-muted-foreground italic">Ninguna venta coincide con los filtros aplicados.</p>
            </div>
          </div>
        )}
      </div>

      {myDeliveryPersonStats.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Mis Repartidores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Repartidor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Activos</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Entregados</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Fallidos</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6">Com. Pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myDeliveryPersonStats.map(({ person, activos, entregados, fallidos, comisionPendiente }) => (
                  <TableRow key={person.id} className="h-14">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{person.name}</p>
                          <p className="text-[10px] text-muted-foreground">{person.city}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-black text-orange-500">{activos}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-black text-green-600">{entregados}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("text-sm font-black", fallidos > 0 ? "text-red-500" : "text-muted-foreground")}>{fallidos}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className="font-black text-primary text-sm">${comisionPendiente.toLocaleString()}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
