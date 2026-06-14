
"use client"

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Plus, Send, Phone, MapPin, User, DollarSign, Wallet,
  CheckCircle2, Truck, ShoppingCart, TrendingUp,
  XCircle, Link, Trash2, Handshake, Clock, Camera, X,
  CalendarDays, Package, AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { SaleStatus } from '@/lib/types';
import { applyDateFilter, DATE_FILTER_LABELS, DateRangeFilter } from '@/lib/date-filters';

const STATUS_STEPS = [
  { id: 'accepted', label: 'Confirmar', icon: Handshake },
  { id: 'contacting', label: 'Contacto', icon: Phone },
  { id: 'scheduled', label: 'Agendado', icon: CalendarDays },
  { id: 'in_transit', label: 'En camino', icon: Truck },
  { id: 'delivered', label: 'Entregado', icon: Package },
];

const SALE_STATUS_BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  assigned:           { label: 'En Ruta',    color: 'bg-muted text-muted-foreground' },
  accepted:           { label: 'En Ruta',    color: 'bg-muted text-muted-foreground' },
  contacting:         { label: 'En Ruta',    color: 'bg-muted text-muted-foreground' },
  scheduled:          { label: 'En Ruta',    color: 'bg-muted text-muted-foreground' },
  in_transit:         { label: 'En Camino',  color: 'bg-blue-100 text-blue-700' },
  delivered:          { label: 'Entregado',  color: 'bg-green-100 text-green-700' },
  delivery_confirmed: { label: 'Entregado',  color: 'bg-green-100 text-green-700' },
  paid:               { label: 'Liquidado',  color: 'bg-emerald-100 text-emerald-700' },
  cancelled:          { label: 'Cancelado',  color: 'bg-red-100 text-red-600' },
  delivery_failed:    { label: 'Fallido',    color: 'bg-red-100 text-red-800' },
  pending_return:     { label: 'Devolución', color: 'bg-orange-100 text-orange-700' },
};

const FINAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid:               { label: 'Liquidado',   color: 'bg-primary/10 text-primary' },
  cancelled:          { label: 'Cancelado',   color: 'bg-red-100 text-red-700' },
  delivery_failed:    { label: 'Fallido',     color: 'bg-red-100 text-red-800' },
  delivered:          { label: 'Entregado',   color: 'bg-green-100 text-green-700' },
  delivery_confirmed: { label: 'Confirmado',  color: 'bg-green-100 text-green-700' },
  pending_return:     { label: 'Devolución',  color: 'bg-orange-100 text-orange-700' },
};
const FINAL_STATUSES = Object.keys(FINAL_STATUS_CONFIG);

const ADMIN_STATUS_GROUPS: Record<string, string[]> = {
  en_ruta:    ['assigned', 'accepted', 'contacting', 'scheduled', 'in_transit'],
  completada: ['delivered', 'delivery_confirmed'],
  liquidada:  ['paid'],
  cancelada:  ['cancelled'],
  fallida:    ['delivery_failed', 'pending_return'],
};

export default function SalesPage() {
  const { currentUser, products, users, sales, inventory, registerMultiSale, updateSaleStatus, deleteSale, assignDeliveryPerson } = useStore();
  const isMobile = useIsMobile();

  // Calcula el tiempo restante de las 48h desde que un pedido falló
  const get48hCountdown = (failedAt?: string): { expired: boolean; label: string } => {
    if (!failedAt) return { expired: false, label: '' };
    const deadline = new Date(new Date(failedAt).getTime() + 48 * 60 * 60 * 1000);
    const msLeft = deadline.getTime() - Date.now();
    if (msLeft <= 0) return { expired: true, label: '48HS VENCIDAS' };
    const h = Math.floor(msLeft / 3600000);
    const m = Math.floor((msLeft % 3600000) / 60000);
    return { expired: false, label: `${h}h ${m}m restantes` };
  };
  const isSeller = currentUser?.role === 'seller';
  const sellers = users.filter(u => u.role === 'seller');
  const deliveryPersons = users.filter(u => u.role === 'delivery');
  const [isOpen, setIsOpen] = useState(false);
  const [assigningDeliveryForSaleId, setAssigningDeliveryForSaleId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('month');
  const [filterCity, setFilterCity] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterStatusGroup, setFilterStatusGroup] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [header, setHeader] = useState({
    sellerId: '',
    deliveryPersonId: '',
    city: '',
    customerName: '',
    customerPhone: '',
    additionalPhone: '',
    customerAddress: '',
    googleMapsLink: '',
    notes: ''
  });

  const [batchItems, setBatchItems] = useState<Record<string, { quantity: string, price: string, commission: string }>>({});
  const [manualTotalVenta, setManualTotalVenta] = useState<string>('');
  const [manualTotalComision, setManualTotalComision] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);

  // Cuando el usuario es vendedor, auto-seleccionarse como vendedor responsable
  useEffect(() => {
    if (isSeller && currentUser?.id && products.length > 0) {
      setHeader(h => ({ ...h, sellerId: currentUser.id, city: currentUser.city || '' }));
      resetBatchItems();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeller, currentUser?.id, products.length]);

  const resetBatchItems = () => {
    const initial: Record<string, any> = {};
    products.forEach(p => {
      initial[p.id] = {
        quantity: '',
        price: p.price.toString(),
        commission: p.defaultCommission.toString()
      };
    });
    setBatchItems(initial);
    setManualTotalVenta('');
    setManualTotalComision('');
    setPhotoBase64(undefined);
  };

  const handleSellerChange = (v: string) => {
    const seller = users.find(u => u.id === v);
    setHeader(h => ({ ...h, sellerId: v, city: seller?.city || '', deliveryPersonId: '' }));
    resetBatchItems();
  };

  const handleDeliveryChange = (dpId: string) => {
    const dp = users.find(u => u.id === dpId);
    setHeader(h => ({ ...h, deliveryPersonId: dpId, city: dp?.city || h.city }));
    resetBatchItems();
  };

  const handleBatchUpdate = (productId: string, field: 'quantity' | 'price' | 'commission', value: string) => {
    setBatchItems(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const stockErrors = useMemo(() => {
    if (!header.deliveryPersonId) return {} as Record<string, { available: number; requested: number }>;
    const errors: Record<string, { available: number; requested: number }> = {};
    Object.entries(batchItems).forEach(([productId, data]) => {
      const qty = parseInt(data.quantity);
      if (qty > 0) {
        const available = inventory.find(i => i.productId === productId && i.deliveryPersonId === header.deliveryPersonId)?.quantity ?? 0;
        if (qty > available) errors[productId] = { available, requested: qty };
      }
    });
    return errors;
  }, [batchItems, header.deliveryPersonId, inventory]);

  const hasStockError = Object.keys(stockErrors).length > 0;

  const totals = useMemo(() => {
    let calculatedVenta = 0;
    let calculatedComision = 0;
    const itemsToRegister: any[] = [];

    Object.entries(batchItems).forEach(([productId, data]) => {
      const qty = parseInt(data.quantity);
      if (qty > 0) {
        const price = parseFloat(data.price) || 0;
        const commission = parseFloat(data.commission) || 0;
        const subtotal = qty * price;
        
        calculatedVenta += subtotal;
        calculatedComision += (qty * commission);
        
        itemsToRegister.push({
          productId,
          quantity: qty,
          priceAtSale: price,
          commissionAtSale: commission,
          subtotal
        });
      }
    });

    const finalTotalVenta = manualTotalVenta !== '' ? parseFloat(manualTotalVenta) : calculatedVenta;
    const finalTotalComision = manualTotalComision !== '' ? parseFloat(manualTotalComision) : calculatedComision;

    return { 
      calculatedVenta,
      calculatedComision,
      totalVenta: finalTotalVenta, 
      totalComision: finalTotalComision, 
      totalDeposito: finalTotalVenta - finalTotalComision, 
      itemsToRegister 
    };
  }, [batchItems, manualTotalVenta, manualTotalComision]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!header.sellerId) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Seleccione un vendedor responsable." });
      return;
    }

    if (!header.customerName) {
      toast({ 
        variant: "destructive", 
        title: "NOMBRE REQUERIDO", 
        description: "Debe ingresar el Nombre del Cliente para continuar." 
      });
      return;
    }

    if (!header.deliveryPersonId) {
      toast({ variant: 'destructive', title: 'Repartidor requerido', description: 'Selecciona el repartidor que entregará el pedido.' });
      return;
    }

    if (!header.customerPhone.trim()) {
      toast({ variant: 'destructive', title: 'El teléfono es requerido', description: 'Ingresa el número de contacto del cliente.' });
      return;
    }

    if (!header.customerAddress.trim()) {
      toast({ variant: 'destructive', title: 'La dirección es requerida', description: 'Ingresa la dirección de entrega del cliente.' });
      return;
    }

    if (totals.itemsToRegister.length === 0) {
      toast({ variant: "destructive", title: "Venta vacía", description: "Ingrese cantidades para al menos un producto." });
      return;
    }

    if (hasStockError) {
      toast({ variant: "destructive", title: "Stock insuficiente", description: "Corrige las cantidades marcadas en rojo antes de continuar." });
      return;
    }

    registerMultiSale(
      header.sellerId,
      header.city,
      totals.itemsToRegister,
      header.customerName,
      header.customerPhone,
      header.customerAddress,
      header.notes,
      totals.totalVenta,
      totals.totalComision,
      header.googleMapsLink,
      photoBase64,
      header.deliveryPersonId
    );

    setIsOpen(false);
    setHeader({ sellerId: '', deliveryPersonId: '', city: '', customerName: '', customerPhone: '', additionalPhone: '', customerAddress: '', googleMapsLink: '', notes: '' });
    setBatchItems({});
    setManualTotalVenta('');
    setManualTotalComision('');
    setPhotoBase64(undefined);
  };

  const salesInPeriod = useMemo(() => {
    const start = customStart ? new Date(customStart) : undefined;
    const end = customEnd ? new Date(customEnd) : undefined;
    return applyDateFilter(sales, dateFilter, start, end);
  }, [sales, dateFilter, customStart, customEnd]);

  const allCities = useMemo(() =>
    [...new Set(sales.map(s => s.city).filter(Boolean) as string[])].sort(),
    [sales]
  );

  const filteredAdminSales = useMemo(() => {
    let result = salesInPeriod;
    if (filterCity !== 'all') result = result.filter(s => s.city === filterCity);
    if (filterDelivery !== 'all') result = result.filter(s => s.deliveryPersonId === filterDelivery);
    if (filterStatusGroup !== 'all') {
      const allowed = ADMIN_STATUS_GROUPS[filterStatusGroup] ?? [];
      result = result.filter(s => allowed.includes(s.status));
    }
    return result;
  }, [salesInPeriod, filterCity, filterDelivery, filterStatusGroup]);

  const hasAdminFilters = filterCity !== 'all' || filterDelivery !== 'all' || filterStatusGroup !== 'all';

  const clearAdminFilters = () => {
    setFilterCity('all');
    setFilterDelivery('all');
    setFilterStatusGroup('all');
  };

  const salesBySeller = useMemo(() => {
    const sellerIds = Array.from(new Set(filteredAdminSales.map(s => s.sellerId)));

    return sellerIds.map(sid => {
      const seller = users.find(u => u.id === sid);
      const sellerSales = filteredAdminSales.filter(s => s.sellerId === sid);
      const pendingDeposit = sellerSales
        .filter(s => s.status === 'delivery_confirmed')
        .reduce((acc, s) => acc + s.totalDeposito, 0);

      return {
        seller: seller || { name: `Vendedor Eliminado`, city: 'N/A', id: sid },
        sales: sellerSales,
        pendingDeposit
      };
    }).sort((a, b) => b.pendingDeposit - a.pendingDeposit);
  }, [filteredAdminSales, users]);

  const StatusTimeline = ({ status, sale }: { status: SaleStatus; sale?: typeof sales[0] }) => {
    if (status === 'cancelled') {
      return (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
          <XCircle className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase">Cancelada</span>
        </div>
      );
    }

    if (status === 'delivery_failed') {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
            <XCircle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase">No Entregado</span>
          </div>
          {sale?.failureReason && (
            <p className="text-[9px] text-red-500 italic pl-1">{sale.failureReason}</p>
          )}
        </div>
      );
    }

    if (status === 'pending_return') {
      const { expired, label } = get48hCountdown(sale?.failedAt);
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-red-700 bg-red-100 px-3 py-1 rounded-full border border-red-300">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] font-black uppercase">Pendiente Devolución</span>
          </div>
          {sale?.failureReason && (
            <p className="text-[9px] text-red-500 italic pl-1">{sale.failureReason}</p>
          )}
          {label && (
            <p className={cn("text-[9px] font-black pl-1", expired ? "text-red-700 animate-pulse" : "text-orange-600")}>
              ⏱ {label}
            </p>
          )}
        </div>
      );
    }

    const currentIdx = STATUS_STEPS.findIndex(s => s.id === status);
    const isPaid = status === 'paid' || status === 'delivery_confirmed';

    return (
      <div className="flex items-center gap-1">
        {status === 'assigned' && (
          <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full border border-dashed animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase">Por Aceptar</span>
          </div>
        )}
        {status !== 'assigned' && STATUS_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isPast    = idx < currentIdx || isPaid || status === 'delivered' || idx === currentIdx;
          const isCurrent = idx === currentIdx && !isPaid;

          return (
            <div key={step.id} className="flex items-center">
              <div
                title={step.label}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center",
                  isCurrent
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                    : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground/30"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isCurrent && step.id === 'in_transit' ? "animate-bounce" : "")} />
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={cn("w-3 h-0.5", isPast ? "bg-primary/20" : "bg-muted")} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Ventas y Cobranza</h1>
          <p className="text-muted-foreground text-sm">Registro de transacciones y control de liquidación</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateRangeFilter)}>
            <SelectTrigger className="w-40 bg-card border shadow-sm h-10">
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
                className="w-36 h-10 text-sm bg-card border shadow-sm"
              />
              <span className="text-muted-foreground text-sm font-medium">—</span>
              <Input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-36 h-10 text-sm bg-card border shadow-sm"
              />
            </>
          )}
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (val) resetBatchItems(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-12 px-6 shadow-xl bg-primary hover:bg-primary/90 transition-all">
              <Plus className="w-5 h-5" /> Nueva Venta Directa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
            <div className="bg-primary p-6 text-primary-foreground">
              <DialogHeader>
                <div className="flex items-center gap-3">
                   <div className="bg-white/20 p-2 rounded-xl">
                      <ShoppingCart className="w-6 h-6" />
                   </div>
                   <div>
                    <DialogTitle className="text-2xl font-bold">Registrar Venta Directa</DialogTitle>
                    <p className="text-primary-foreground/70 text-sm">Completa el formulario para descontar stock y registrar el cobro.</p>
                   </div>
                </div>
              </DialogHeader>
            </div>

            <div className="p-4 md:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 md:p-8 rounded-3xl border border-dashed border-primary/20">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">Vendedor Responsable <span className="text-destructive">*</span></Label>
                  {isSeller ? (
                    // Vendedor: se auto-asigna, campo de solo lectura
                    <div className="h-11 bg-white border-none shadow-sm rounded-md flex items-center px-3 text-sm font-semibold text-foreground">
                      {currentUser?.name} ({currentUser?.city})
                    </div>
                  ) : (
                    // Admin: puede seleccionar cualquier vendedor
                    <Select value={header.sellerId} onValueChange={handleSellerChange}>
                      <SelectTrigger className="h-11 bg-white border-none shadow-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.city})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Ciudad</Label>
                  <Input className="h-11 bg-white border-none shadow-sm" value={header.city} onChange={e => setHeader({...header, city: e.target.value})} placeholder="Ej: Buenos Aires" />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Repartidor <span className="text-destructive">*</span>
                  </Label>
                  <Select value={header.deliveryPersonId} onValueChange={handleDeliveryChange}>
                    <SelectTrigger className="h-11 bg-white border-none shadow-sm"><SelectValue placeholder="Seleccionar repartidor..." /></SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.role === 'delivery').map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name} ({d.city})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4 border-t border-primary/10">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-black uppercase text-primary tracking-widest">
                      <User className="w-4 h-4" /> CLIENTE <span className="text-destructive text-[10px] font-bold">(OBLIGATORIO *)</span>
                    </Label>
                    <Input 
                      className="h-14 bg-white border-2 border-primary/20 shadow-sm text-lg font-bold rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" 
                      value={header.customerName} 
                      onChange={e => setHeader({...header, customerName: e.target.value})} 
                      placeholder="Nombre completo del cliente" 
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> Teléfono
                      </Label>
                      <Input 
                        className="h-12 bg-white border-none shadow-sm font-bold" 
                        value={header.customerPhone} 
                        onChange={e => setHeader({...header, customerPhone: e.target.value})} 
                        placeholder="Número de contacto" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" /> Dirección de Entrega
                      </Label>
                      <Input 
                        className="h-12 bg-white border-none shadow-sm font-bold" 
                        value={header.customerAddress} 
                        onChange={e => setHeader({...header, customerAddress: e.target.value})} 
                        placeholder="Calle, número, colonia..." 
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Link className="w-3.5 h-3.5" /> Link de Google Maps (Opcional)</Label>
                  <Input className="h-11 bg-white border-none shadow-sm" value={header.googleMapsLink} onChange={e => setHeader({...header, googleMapsLink: e.target.value})} placeholder="https://maps.app.goo.gl/..." />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Mercancía Entregada</Label>
                <div className="rounded-2xl border bg-card shadow-sm overflow-x-auto">
                  <Table className="min-w-[480px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] h-10 uppercase font-black">Producto</TableHead>
                        <TableHead className="text-[10px] h-10 text-center uppercase font-black">Stock</TableHead>
                        <TableHead className="text-[10px] h-10 text-center uppercase font-black">Cant.</TableHead>
                        <TableHead className="text-[10px] h-10 text-right uppercase font-black pr-6">Precio Unit.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map(p => {
                        const stock = header.deliveryPersonId
                          ? (inventory.find(i => i.productId === p.id && i.deliveryPersonId === header.deliveryPersonId)?.quantity ?? 0)
                          : 0;
                        const itemData = batchItems[p.id] || { quantity: '', price: p.price.toString(), commission: p.defaultCommission.toString() };
                        const isSelected = parseInt(itemData.quantity) > 0;
                        
                        return (
                          <TableRow key={p.id} className={cn("h-14 transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/10")}>
                            <TableCell className="py-2 pl-6">
                              <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "")}>{p.name}</span>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge variant={stock < 5 ? "destructive" : "secondary"} className="text-[10px] font-bold h-5 rounded-md">
                                {stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min="0"
                                max={stock}
                                placeholder="0"
                                className={cn(
                                  "h-9 w-16 mx-auto text-center text-xs font-bold border-none bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary",
                                  stockErrors[p.id] && "ring-1 ring-destructive bg-destructive/5"
                                )}
                                value={itemData.quantity}
                                onChange={(e) => handleBatchUpdate(p.id, 'quantity', e.target.value)}
                                disabled={!header.deliveryPersonId || stock === 0}
                              />
                              {stockErrors[p.id] && (
                                <p className="text-[10px] text-destructive font-bold mt-0.5 text-center">
                                  Máx. {stockErrors[p.id].available}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="py-2 text-right pr-6">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  className="h-9 w-24 text-right text-xs font-bold border-none bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary"
                                  value={itemData.price}
                                  onChange={(e) => handleBatchUpdate(p.id, 'price', e.target.value)}
                                  disabled={!header.deliveryPersonId}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Foto de Comprobante / Mercancía (Opcional)</Label>
                <div className="flex items-center gap-6">
                  <Button type="button" variant="outline" className="gap-3 h-16 px-8 border-dashed border-2 bg-muted/10 hover:bg-primary/5 hover:border-primary/40 rounded-2xl transition-all" asChild>
                    <label>
                      <Camera className="w-6 h-6" /> <span className="font-black text-sm">{photoBase64 ? 'Cambiar Foto' : 'Subir Foto'}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </Button>
                  {photoBase64 && (
                    <div className="relative group">
                      <img src={photoBase64} alt="Preview" className="w-20 h-20 object-cover rounded-xl shadow-md border-2 border-primary/20" />
                      <button 
                        onClick={() => setPhotoBase64(undefined)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {totals.itemsToRegister.length > 0 && (
                <div className="bg-primary/5 p-8 rounded-3xl space-y-6 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3 bg-white p-5 rounded-2xl shadow-sm border border-primary/10">
                      <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Cobro al Cliente</Label>
                      <div className="flex items-center gap-2">
                         <div className="bg-primary/10 p-2 rounded-lg"><DollarSign className="w-4 h-4 text-primary" /></div>
                         <Input 
                           type="number" 
                           className="h-10 text-xl font-black border-none focus:ring-0"
                           value={manualTotalVenta === '' ? totals.calculatedVenta : manualTotalVenta}
                           onChange={(e) => setManualTotalVenta(e.target.value)}
                         />
                      </div>
                    </div>
                    <div className="space-y-3 bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
                      <Label className="text-[10px] text-blue-600 uppercase font-black tracking-widest">Comisión Repartidor</Label>
                      <div className="flex items-center gap-2">
                         <div className="bg-blue-100 p-2 rounded-lg"><Truck className="w-4 h-4 text-blue-600" /></div>
                         <Input
                           type="number"
                           className="h-10 text-xl font-black text-blue-600 border-none focus:ring-0"
                           value={manualTotalComision === '' ? totals.calculatedComision : manualTotalComision}
                           onChange={(e) => setManualTotalComision(e.target.value)}
                         />
                      </div>
                    </div>
                    <div className="space-y-3 bg-primary p-5 rounded-2xl shadow-lg flex flex-col justify-center">
                      <Label className="text-[10px] text-primary-foreground/70 uppercase font-black tracking-widest">A PAGAR AL ADMIN</Label>
                      <div className="flex items-center gap-3 text-primary-foreground">
                        <CheckCircle2 className="w-6 h-6" />
                        <p className="text-3xl font-black tracking-tighter">${totals.totalDeposito.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleRegister} className="w-full gap-3 h-16 text-xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.02]" disabled={totals.itemsToRegister.length === 0 || !header.sellerId || !header.deliveryPersonId || hasStockError}>
                <Send className="w-6 h-6" /> Registrar y Finalizar Venta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary border-l-8 border-l-primary-foreground/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-primary-foreground/70 uppercase flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Entregado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-primary-foreground tracking-tighter">
              ${salesInPeriod.filter(s => ['delivered','paid'].includes(s.status)).reduce((acc, s) => acc + s.totalVenta, 0).toLocaleString()}
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
              ${salesInPeriod.filter(s => ['assigned','accepted','contacting','scheduled','in_transit'].includes(s.status)).reduce((acc, s) => acc + s.totalVenta, 0).toLocaleString()}
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
              ${salesInPeriod.filter(s => ['delivered','paid'].includes(s.status)).reduce((acc, s) => acc + s.totalComision, 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">A pagar a repartidores</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filtros adicionales ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-9 w-44 bg-card border shadow-sm text-xs">
              <SelectValue placeholder="Todas las ciudades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {allCities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDelivery} onValueChange={setFilterDelivery}>
            <SelectTrigger className="h-9 w-44 bg-card border shadow-sm text-xs">
              <SelectValue placeholder="Todos los repartidores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los repartidores</SelectItem>
              {deliveryPersons.map(dp => (
                <SelectItem key={dp.id} value={dp.id}>{dp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatusGroup} onValueChange={setFilterStatusGroup}>
            <SelectTrigger className="h-9 w-40 bg-card border shadow-sm text-xs">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="en_ruta">En Ruta</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="liquidada">Liquidada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="fallida">Fallida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-muted-foreground">
            Mostrando{' '}
            <span className="font-black text-foreground">{filteredAdminSales.length}</span>
            {' '}de{' '}
            <span className="font-bold">{salesInPeriod.length}</span>
            {' '}ventas
          </span>
          {hasAdminFilters && (
            <Button variant="ghost" size="sm" onClick={clearAdminFilters}
              className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5">
              <X className="w-3 h-3" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white/50 dark:bg-card backdrop-blur-sm">
        <CardHeader className="bg-white border-b px-8 py-6">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-xl text-primary"><TrendingUp className="w-5 h-5" /></div>
             Cartera de Vendedores
          </CardTitle>
          <CardDescription>Seguimiento detallado de la logística y liquidación por equipo</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="multiple" className="w-full divide-y">
            {salesBySeller.map((group) => (
              <AccordionItem key={group.seller.id} value={group.seller.id} className="border-none px-8 hover:bg-white/40 dark:hover:bg-muted/20 transition-colors">
                <AccordionTrigger className="hover:no-underline py-6">
                  {(() => {
                    const enRutaCount = group.sales.filter(s => ['assigned','accepted','contacting','scheduled','in_transit'].includes(s.status)).length;
                    const entregadosCount = group.sales.filter(s => ['delivered','delivery_confirmed','paid'].includes(s.status)).length;
                    const fallidosCount = group.sales.filter(s => ['cancelled','delivery_failed'].includes(s.status)).length;
                    return (
                      <div className="flex items-center justify-between w-full pr-6">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground text-xl font-black">
                            {group.seller.name.charAt(0)}
                          </div>
                          <div className="text-left space-y-1">
                            <p className="font-black text-base text-foreground tracking-tight">{group.seller.name}</p>
                            <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0 h-5 bg-muted text-muted-foreground">
                              {group.sales.length} ventas
                            </Badge>
                          </div>
                        </div>
                        {isSeller ? (
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {enRutaCount > 0 && (
                              <Badge className="text-[10px] font-bold border-none bg-muted text-muted-foreground">
                                {enRutaCount} en ruta
                              </Badge>
                            )}
                            {entregadosCount > 0 && (
                              <Badge className="text-[10px] font-bold border-none bg-green-100 text-green-700">
                                {entregadosCount} entregados
                              </Badge>
                            )}
                            {fallidosCount > 0 && (
                              <Badge className="text-[10px] font-bold border-none bg-red-100 text-red-700">
                                {fallidosCount} fallidos
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {enRutaCount > 0 && (
                              <Badge className="text-[10px] font-bold border-none bg-muted text-muted-foreground">
                                {enRutaCount} en ruta
                              </Badge>
                            )}
                            {entregadosCount > 0 && (
                              <Badge className="text-[10px] font-bold border-none bg-green-100 text-green-700">
                                {entregadosCount} entregados
                              </Badge>
                            )}
                            {fallidosCount > 0 && (
                              <Badge className="text-[10px] font-bold border-none bg-red-100 text-red-700">
                                {fallidosCount} fallidos
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="overflow-hidden rounded-2xl border bg-white shadow-inner">
                      {isMobile ? (
                        <div className="divide-y">
                          {group.sales.slice().reverse().map((sale) => {
                            const isFailed = ['delivery_failed', 'pending_return'].includes(sale.status);
                            return (
                              <div key={sale.id} className={cn(
                                "p-4 space-y-3",
                                sale.status === 'pending_return' && "bg-red-50/60 border-l-4 border-l-red-500"
                              )}>
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-black uppercase tracking-tight truncate">{sale.status === 'assigned' ? '**********' : (sale.customerName || 'Cliente')}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                      <MapPin className="w-3 h-3" /> {sale.city} · {new Date(sale.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                  {SALE_STATUS_BADGE_CONFIG[sale.status] && (
                                    <Badge className={cn('text-[9px] font-black uppercase border-none shrink-0', SALE_STATUS_BADGE_CONFIG[sale.status].color)}>
                                      {SALE_STATUS_BADGE_CONFIG[sale.status].label}
                                    </Badge>
                                  )}
                                </div>

                                <div className="bg-muted/30 p-2.5 rounded-xl border border-muted-foreground/10 space-y-1">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[9px] text-muted-foreground italic font-medium">Cobrado:</span>
                                    <span className="text-[11px] font-bold">${sale.totalVenta.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline border-t border-dashed pt-1">
                                    <span className="text-[9px] text-primary font-black uppercase tracking-tighter">A LIQUIDAR:</span>
                                    <span className="text-sm font-black text-primary tracking-tighter">${sale.totalDeposito.toLocaleString()}</span>
                                  </div>
                                </div>

                                <div className="overflow-x-auto pb-1"><StatusTimeline status={sale.status} sale={sale} /></div>
                                {sale.deliveryDate && (
                                  <p className="text-[9px] font-bold text-orange-600 uppercase flex items-center gap-1">
                                    <CalendarDays className="w-2.5 h-2.5" /> {sale.deliveryDate}
                                  </p>
                                )}

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Repartidor</span>
                                  {sale.deliveryPersonId ? (
                                    <span className="text-xs font-medium">{deliveryPersons.find(dp => dp.id === sale.deliveryPersonId)?.name ?? '—'}</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">Sin asignar</span>
                                  )}
                                </div>

                                {isFailed && sale.failureReason && (
                                  <p className="text-[10px] text-red-500 italic">{sale.failureReason}</p>
                                )}

                                {!isFailed && (
                                  <div className="flex items-center gap-2">
                                    {deliveryPersons.length > 0 && !FINAL_STATUSES.includes(sale.status) && (
                                      <Dialog open={assigningDeliveryForSaleId === sale.id} onOpenChange={(open) => setAssigningDeliveryForSaleId(open ? sale.id : null)}>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="flex-1 text-[10px] h-9 px-3 font-bold border-2 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl gap-1">
                                            <Truck className="w-3 h-3" /> {sale.deliveryPersonId ? 'Reasignar' : 'Asignar Repartidor'}
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xs">
                                          <DialogHeader>
                                            <DialogTitle>Asignar Repartidor</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-2 py-2">
                                            {deliveryPersons.map(dp => {
                                              const isAssigned = sale.deliveryPersonId === dp.id;
                                              return (
                                                <button
                                                  key={dp.id}
                                                  className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                                                    isAssigned ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted/50"
                                                  )}
                                                  onClick={() => {
                                                    assignDeliveryPerson(sale.id, dp.id);
                                                    setAssigningDeliveryForSaleId(null);
                                                  }}
                                                >
                                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {dp.name.charAt(0)}
                                                  </div>
                                                  <div>
                                                    <p className="font-bold text-sm">{dp.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{dp.city}</p>
                                                  </div>
                                                  {isAssigned && <span className="ml-auto text-[10px] font-black text-primary">Asignado</span>}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                    {!sale.settlementId && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              {sale.status === 'delivered' ? '¿Eliminar esta venta entregada?' : '¿Eliminar esta venta?'}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              {sale.status === 'delivered'
                                                ? 'El pedido ya fue entregado. Esta acción no puede deshacerse.'
                                                : 'Esta acción no se puede deshacer. El stock se devolverá al inventario del vendedor automáticamente.'}
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteSale(sale.id)} className="bg-destructive text-destructive-foreground">
                                              Eliminar Definitivamente
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                      <Table>
                        <TableHeader className="bg-muted/50 dark:bg-background/60">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="text-[10px] font-black uppercase pl-6">Fecha</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Cuentas ($)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Rastreador Logístico</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Repartidor</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.sales.slice().reverse().map((sale) => (
                            <TableRow key={sale.id} className={cn(
                              "h-24 transition-colors",
                              sale.status === 'pending_return'
                                ? "bg-red-50/60 hover:bg-red-50 border-l-4 border-l-red-500"
                                : "hover:bg-muted/5"
                            )}>
                              <TableCell className="text-[10px] font-medium text-muted-foreground pl-6">
                                {new Date(sale.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-black uppercase tracking-tight">{(sale.status === 'assigned') ? '**********' : (sale.customerName || 'Cliente')}</span>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                                    <span className="text-[9px] font-bold text-muted-foreground">{sale.city}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="bg-muted/30 p-2.5 rounded-xl border border-muted-foreground/10 space-y-1 mx-auto max-w-[160px]">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[9px] text-muted-foreground italic font-medium">Cobrado:</span>
                                    <span className="text-[11px] font-bold">${sale.totalVenta.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline border-t border-dashed pt-1">
                                    <span className="text-[9px] text-primary font-black uppercase tracking-tighter">A LIQUIDAR:</span>
                                    <span className="text-sm font-black text-primary tracking-tighter underline underline-offset-2 decoration-primary/30">${sale.totalDeposito.toLocaleString()}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusTimeline status={sale.status} sale={sale} />
                                {sale.deliveryDate && (
                                  <p className="text-[9px] font-bold text-orange-600 mt-2 uppercase flex items-center gap-1">
                                    <CalendarDays className="w-2.5 h-2.5" /> {sale.deliveryDate}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                {sale.deliveryPersonId ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                      {deliveryPersons.find(dp => dp.id === sale.deliveryPersonId)?.name.charAt(0) ?? '?'}
                                    </div>
                                    <span className="text-xs font-medium">{deliveryPersons.find(dp => dp.id === sale.deliveryPersonId)?.name ?? '—'}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">Sin asignar</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                {['delivery_failed', 'pending_return'].includes(sale.status) ? (
                                  <div className="flex items-center justify-end gap-2">
                                    {SALE_STATUS_BADGE_CONFIG[sale.status] && (
                                      <Badge className={cn('text-[9px] font-black uppercase border-none', SALE_STATUS_BADGE_CONFIG[sale.status].color)}>
                                        {SALE_STATUS_BADGE_CONFIG[sale.status].label}
                                      </Badge>
                                    )}
                                    {sale.failureReason && (
                                      <span className="text-[9px] text-red-500 italic max-w-[120px] truncate">{sale.failureReason}</span>
                                    )}
                                  </div>
                                ) : (
                                <div className="flex items-center justify-end gap-2">
                                  {deliveryPersons.length > 0 && !FINAL_STATUSES.includes(sale.status) && (
                                    <Dialog open={assigningDeliveryForSaleId === sale.id} onOpenChange={(open) => setAssigningDeliveryForSaleId(open ? sale.id : null)}>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="text-[10px] h-8 px-3 font-bold border-2 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl gap-1">
                                          <Truck className="w-3 h-3" /> {sale.deliveryPersonId ? 'Reasignar' : 'Asignar Repartidor'}
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-xs">
                                        <DialogHeader>
                                          <DialogTitle>Asignar Repartidor</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-2 py-2">
                                          {deliveryPersons.map(dp => {
                                            const isAssigned = sale.deliveryPersonId === dp.id;
                                            return (
                                              <button
                                                key={dp.id}
                                                className={cn(
                                                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                                                  isAssigned ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted/50"
                                                )}
                                                onClick={() => {
                                                  assignDeliveryPerson(sale.id, dp.id);
                                                  setAssigningDeliveryForSaleId(null);
                                                }}
                                              >
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                  {dp.name.charAt(0)}
                                                </div>
                                                <div>
                                                  <p className="font-bold text-sm">{dp.name}</p>
                                                  <p className="text-[10px] text-muted-foreground">{dp.city}</p>
                                                </div>
                                                {isAssigned && <span className="ml-auto text-[10px] font-black text-primary">Asignado</span>}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                  {SALE_STATUS_BADGE_CONFIG[sale.status] && (
                                    <Badge className={cn('text-[9px] font-black uppercase border-none', SALE_STATUS_BADGE_CONFIG[sale.status].color)}>
                                      {SALE_STATUS_BADGE_CONFIG[sale.status].label}
                                    </Badge>
                                  )}
                                  {!sale.settlementId && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            {sale.status === 'delivered' ? '¿Eliminar esta venta entregada?' : '¿Eliminar esta venta?'}
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            {sale.status === 'delivered'
                                              ? 'El pedido ya fue entregado. Esta acción no puede deshacerse.'
                                              : 'Esta acción no se puede deshacer. El stock se devolverá al inventario del vendedor automáticamente.'}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteSale(sale.id)} className="bg-destructive text-destructive-foreground">
                                            Eliminar Definitivamente
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
            {salesBySeller.length === 0 && (
              <div className="text-center py-24 text-muted-foreground flex flex-col items-center gap-4 bg-white">
                <div className="bg-muted/30 p-6 rounded-full"><ShoppingCart className="w-12 h-12 opacity-10" /></div>
                <div className="space-y-1">
                   <p className="text-lg font-bold">Sin actividad de ventas</p>
                   <p className="text-sm italic">No hay registros pendientes de liquidación actualmente.</p>
                </div>
              </div>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
