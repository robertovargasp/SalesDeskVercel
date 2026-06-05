
"use client"

import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, Pencil, KeyRound, Clock, Phone, Mail, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile, SettlementFrequency, UserRole } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const DAYS = [
  { label: 'Domingo', value: '0' },
  { label: 'Lunes', value: '1' },
  { label: 'Martes', value: '2' },
  { label: 'Miércoles', value: '3' },
  { label: 'Jueves', value: '4' },
  { label: 'Viernes', value: '5' },
  { label: 'Sábado', value: '6' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  seller: 'Vendedor',
  delivery: 'Repartidor',
};

const defaultForm = {
  name: '',
  username: '',
  email: '',
  city: '',
  phone: '',
  whatsapp: '',
  password: '',
  confirmPassword: '',
  role: 'seller' as UserRole,
  settlementFrequency: 'weekly' as SettlementFrequency,
  settlementStartDay: '1'
};

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  const sellers = users.filter(u => u.role === 'seller' && (filterCity === '' || u.city.toLowerCase().includes(filterCity.toLowerCase())));
  const deliveryUsers = users.filter(u => u.role === 'delivery' && (filterCity === '' || u.city.toLowerCase().includes(filterCity.toLowerCase())));

  const passwordChecks = useMemo(() => [
    { label: 'Mínimo 8 caracteres',            ok: formData.password.length >= 8 },
    { label: 'Una letra mayúscula',             ok: /[A-Z]/.test(formData.password) },
    { label: 'Una letra minúscula',             ok: /[a-z]/.test(formData.password) },
    { label: 'Un número',                       ok: /[0-9]/.test(formData.password) },
    { label: 'Un carácter especial (!@#$%&*)', ok: /[!@#$%&*]/.test(formData.password) },
  ], [formData.password]);

  const passwordStrong = passwordChecks.every(c => c.ok);
  const passwordsMatch = formData.password === formData.confirmPassword;

  const handleOpenDialog = (u: UserProfile | null = null) => {
    if (u) {
      setEditingUser(u);
      setFormData({
        name: u.name,
        username: u.username,
        email: u.email || '',
        city: u.city,
        phone: u.phone || '',
        whatsapp: u.whatsapp || '',
        password: '',
        confirmPassword: '',
        role: u.role,
        settlementFrequency: u.settlementFrequency || 'weekly',
        settlementStartDay: (u.settlementStartDay ?? 1).toString()
      });
    } else {
      setEditingUser(null);
      setFormData(defaultForm);
    }
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city) return;

    if (!editingUser && (!passwordStrong || !passwordsMatch)) return;

    const userData = {
      name: formData.name,
      username: formData.username,
      email: formData.email,
      city: formData.city,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      role: formData.role,
      password: formData.password,
      settlementFrequency: formData.settlementFrequency,
      settlementStartDay: parseInt(formData.settlementStartDay),
    };

    if (editingUser) {
      updateUser({ ...editingUser, ...userData });
    } else {
      addUser(userData);
    }

    setIsOpen(false);
    setEditingUser(null);
  };

  const UserCard = ({ u }: { u: UserProfile }) => (
    <AccordionItem key={u.id} value={u.id} className="border rounded-xl px-4 overflow-hidden bg-card hover:bg-muted/10 transition-colors">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {u.name.charAt(0)}
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">{u.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{u.city}</p>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                {ROLE_LABELS[u.role]}
              </Badge>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2 border-t mt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm w-full md:w-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Contacto</p>
              <div className="flex flex-col gap-1">
                {u.phone && <p className="font-medium text-[11px] flex items-center gap-1"><Phone className="w-3 h-3"/> {u.phone}</p>}
                {u.email && <p className="font-medium text-[11px] flex items-center gap-1"><Mail className="w-3 h-3"/> {u.email}</p>}
                {u.whatsapp && <p className="font-medium text-[11px] flex items-center gap-1"><Truck className="w-3 h-3 text-green-600"/> {u.whatsapp}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Usuario</p>
              <p className="font-medium">@{u.username}</p>
            </div>
            {u.role === 'seller' && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Frecuencia</p>
                  <p className="font-medium">{u.settlementFrequency === 'weekly' ? 'Semanal' : 'Quincenal'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Corte</p>
                  <p className="font-medium">{DAYS.find(d => d.value === (u.settlementStartDay ?? 1).toString())?.label}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" className="flex-1 md:flex-none gap-2" onClick={() => handleOpenDialog(u)}>
              <Pencil className="w-4 h-4" /> Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive flex-1 md:flex-none gap-2 hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                  <AlertDialogDescription>Eliminará a <strong>{u.name}</strong> del sistema.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteUser(u.id)} className="bg-destructive text-destructive-foreground">Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline">Usuarios / Equipo</h1>
          <p className="text-muted-foreground text-sm">Vendedores y repartidores del sistema</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por ciudad..."
              className="pl-9 w-48"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            />
          </div>
          <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) setEditingUser(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4" /> Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar Usuario' : 'Registrar Usuario'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={formData.role} onValueChange={(val: UserRole) => setFormData({...formData, role: val})} disabled={!!editingUser}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">Vendedor</SelectItem>
                      <SelectItem value="delivery">Repartidor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Juan Perez" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="juanp" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ej: CDMX" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> Teléfono</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="664..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
                    <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Truck className="w-4 h-4 text-green-600" /> WhatsApp (para notificaciones)</Label>
                  <Input value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="+52 664..." />
                </div>

                {formData.role === 'seller' && (
                  <div className="bg-primary/5 p-4 rounded-xl border space-y-4">
                    <h3 className="text-xs font-bold uppercase flex items-center gap-2 text-primary">
                      <Clock className="w-3.5 h-3.5" /> Configuración de Pagos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Frecuencia</Label>
                        <Select value={formData.settlementFrequency} onValueChange={(val: SettlementFrequency) => setFormData({...formData, settlementFrequency: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="biweekly">Quincenal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Día de Corte</Label>
                        <Select value={formData.settlementStartDay} onValueChange={(val) => setFormData({...formData, settlementStartDay: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DAYS.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    {editingUser ? 'Nueva Contraseña (vacío = sin cambio)' : 'Contraseña'}
                  </Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                    placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
                  />
                  {/* Indicador visual de fortaleza — solo al crear usuario */}
                  {!editingUser && formData.password.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {passwordChecks.map(check => (
                        <div key={check.label} className="flex items-center gap-2">
                          {check.ok
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          }
                          <span className={`text-[11px] font-medium transition-colors ${check.ok ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campo confirmar contraseña — solo al crear */}
                {!editingUser && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4" /> Confirmar Contraseña
                    </Label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      required
                      placeholder="Repetir contraseña"
                    />
                    {formData.confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="text-[11px] text-red-500 font-medium">Las contraseñas no coinciden</p>
                    )}
                    {formData.confirmPassword.length > 0 && passwordsMatch && (
                      <p className="text-[11px] text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Las contraseñas coinciden
                      </p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={!editingUser && (!passwordStrong || !passwordsMatch)}
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Cuenta'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="sellers">
        <TabsList className="mb-4">
          <TabsTrigger value="sellers">Vendedores ({sellers.length})</TabsTrigger>
          <TabsTrigger value="delivery">Repartidores ({deliveryUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sellers">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {sellers.map(u => <UserCard key={u.id} u={u} />)}
                {sellers.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground italic text-sm">No hay vendedores registrados</p>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {deliveryUsers.map(u => <UserCard key={u.id} u={u} />)}
                {deliveryUsers.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground italic text-sm">No hay repartidores registrados</p>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
