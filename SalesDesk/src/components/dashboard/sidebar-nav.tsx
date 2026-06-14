
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Users, Package, TrendingUp,
  LogOut, Receipt, Truck, Sun, Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import { useTheme } from '@/providers/ThemeProvider';

interface SidebarNavProps {
  role: UserRole;
  onLogout: () => void;
  onNavigate?: () => void;
}

const adminLinks = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Productos', href: '/dashboard/admin/products', icon: Package },
  { label: 'Usuarios', href: '/dashboard/admin/sellers', icon: Users },
  { label: 'Inventario', href: '/dashboard/admin/inventory', icon: ShoppingBag },
  { label: 'Ventas', href: '/dashboard/admin/sales', icon: TrendingUp },
  { label: 'Paquetería', href: '/dashboard/admin/delivery', icon: Truck },
  { label: 'Liquidaciones', href: '/dashboard/admin/settlements', icon: Receipt },
];

const sellerLinks = [
  { label: 'Mi Panel',          href: '/dashboard',                    icon: LayoutDashboard },
  { label: 'Mi Inventario',     href: '/dashboard/seller/inventory',   icon: Package },
  { label: 'Ventas',            href: '/dashboard/seller/sales',       icon: TrendingUp },
  { label: 'Paquetería',        href: '/dashboard/seller/delivery',    icon: Truck },
  { label: 'Mis Reportes', href: '/dashboard/seller/settlements', icon: Receipt },
];

const deliveryLinks = [
  { label: 'Mis Entregas',  href: '/dashboard/delivery',           icon: Truck },
  { label: 'Mi Inventario', href: '/dashboard/delivery/inventory', icon: Package },
];

const linksByRole: Record<UserRole, typeof adminLinks> = {
  admin: adminLinks,
  seller: sellerLinks,
  delivery: deliveryLinks,
};

export function SidebarNav({ role, onLogout, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const links = linksByRole[role] ?? sellerLinks;
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <TrendingUp className="text-accent" />
          SalesDesk
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
              pathname === link.href
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
