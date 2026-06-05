
"use client"

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Mail, Phone, Lock, Save, MapPin, ShieldCheck, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { currentUser, updateUser } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    password: ''
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        city: currentUser.city || '',
        password: ''
      });
    }
  }, [currentUser]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const { password: _pw, ...profileData } = formData;
    updateUser({
      ...currentUser,
      ...profileData
    });
    
    toast({
      title: "Cambios guardados",
      description: "Tu información de perfil ha sido actualizada correctamente.",
    });
  };

  const isSeller = currentUser?.role === 'seller';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-headline">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm">Gestiona tu información personal y seguridad</p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" /> Datos de Perfil
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? "Como administrador, puedes modificar todos tus datos de identidad."
              : "Esta información ayuda al administrador a coordinar el flujo de ventas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre Completo</Label>
                <div className="relative">
                   <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    disabled={isSeller}
                    className={isSeller ? "bg-muted/50 font-medium" : "font-medium focus:ring-primary"}
                  />
                  {isSeller && <ShieldCheck className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground opacity-50" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Ciudad Principal</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    className={isSeller ? "pl-9 bg-muted/50 font-medium" : "pl-9 font-medium focus:ring-primary"}
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                    disabled={isSeller}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                </Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="ejemplo@correo.com"
                  className="focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> Teléfono Celular
                </Label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="664..."
                  className="focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <Lock className="w-3.5 h-3.5" /> Contraseña de Acceso
              </Label>
              <Input 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="font-mono"
              />
            </div>

            <Button type="submit" className="w-full h-12 gap-2 font-bold shadow-lg text-base">
              <Save className="w-4 h-4" /> Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Solo mostrar advertencia si es vendedor */}
      {isSeller && (
        <div className="p-6 bg-primary/5 rounded-2xl border border-dashed border-primary/20 flex gap-4 items-start">
          <div className="bg-primary/10 p-2 rounded-full">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold">Gestión de Identidad</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tus datos oficiales (Nombre y Ciudad) están vinculados a tu contrato. 
              Si necesitas corregirlos, por favor solicita un ajuste al administrador para que el historial de ventas no se pierda.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
