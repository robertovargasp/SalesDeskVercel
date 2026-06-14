"use client"

import { useStore } from '@/hooks/use-store';
import { useUser } from '@/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, TrendingUp, AlertTriangle } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, logout, isProfileLoading } = useStore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full">
        <div className="w-64 border-r p-6 space-y-6 hidden md:block">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full flex-col gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground animate-pulse">Cargando perfil...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen w-full flex-col gap-6 p-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-bold">Error de Perfil</h2>
          <p className="text-muted-foreground text-sm">
            Tu cuenta de acceso es válida, pero no encontramos tu perfil de usuario en la base de datos.
          </p>
        </div>
        <Button onClick={() => { logout(); router.push('/'); }}>
          Cerrar Sesión y Reintentar
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary w-6 h-6" />
          <span className="font-bold text-lg">SalesDesk</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarNav role={currentUser.role} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <aside className="w-64 hidden md:block flex-shrink-0">
        <SidebarNav role={currentUser.role} onLogout={handleLogout} />
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
