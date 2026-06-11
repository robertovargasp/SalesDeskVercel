"use client"

import { useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Package, DollarSign, Wallet, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { toast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    defaultCommission: '200',
    minStock: '4',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'El nombre es requerido', description: 'Ingresa el nombre del producto.' });
      return;
    }

    const price = parseFloat(formData.price);
    const comm = parseFloat(formData.defaultCommission);

    if (isNaN(price) || price <= 0) {
      toast({ variant: 'destructive', title: 'Precio inválido', description: 'El precio debe ser mayor a 0.' });
      return;
    }
    if (!isNaN(comm) && comm < 0) {
      toast({ variant: 'destructive', title: 'Comisión inválida', description: 'La comisión no puede ser negativa.' });
      return;
    }

    const minStockVal = parseInt(formData.minStock);
    if (!isNaN(minStockVal) && minStockVal < 0) {
      toast({ variant: 'destructive', title: 'Stock mínimo inválido', description: 'El stock mínimo no puede ser negativo.' });
      return;
    }
    const data = {
      name: formData.name,
      price: price,
      defaultCommission: isNaN(comm) ? 0 : comm,
      minStock: isNaN(minStockVal) ? 4 : minStockVal,
      description: formData.description || ''
    };

    if (editingProduct) {
      updateProduct({ ...data, id: editingProduct.id });
    } else {
      addProduct(data);
    }

    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', defaultCommission: '200', minStock: '4', description: '' });
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Productos</h1>
          <p className="text-muted-foreground text-sm">Administra el catálogo de mercancía</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ingrese nombre del producto..." 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio ($)</Label>
                  <Input
                    type="text"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comisión Base ($)</Label>
                  <Input
                    type="text"
                    value={formData.defaultCommission}
                    onChange={e => setFormData({...formData, defaultCommission: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Mínimo (alerta)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={e => setFormData({...formData, minStock: e.target.value})}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción (opcional)</Label>
                  <Input
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Especificaciones..."
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {products.map((p) => (
              <AccordionItem key={p.id} value={p.id} className="border rounded-xl px-4 bg-card hover:bg-muted/5 transition-colors">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{p.name}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2 border-t mt-2">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 w-full md:w-auto">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Precio de Venta</p>
                        <p className="font-extrabold text-lg flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" /> {p.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Comisión Base</p>
                        <p className="font-extrabold text-lg flex items-center gap-1">
                          <Wallet className="w-4 h-4 text-orange-600" /> {p.defaultCommission.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Stock Mínimo</p>
                        <p className="font-extrabold text-lg flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" /> {p.minStock ?? 4} uds
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Button variant="outline" size="sm" className="flex-1 md:flex-none gap-2" onClick={() => {
                        setEditingProduct(p);
                        setFormData({ name: p.name, price: p.price.toString(), defaultCommission: p.defaultCommission.toString(), minStock: (p.minStock ?? 4).toString(), description: p.description || '' });
                        setIsOpen(true);
                      }}>
                        <Pencil className="w-4 h-4" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 md:flex-none gap-2 text-destructive hover:bg-destructive/10" onClick={() => deleteProduct(p.id)}>
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
            {products.length === 0 && (
              <div className="text-center py-12 text-muted-foreground italic text-sm">
                No hay productos en el catálogo
              </div>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
