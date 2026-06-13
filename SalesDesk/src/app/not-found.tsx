"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass, RotateCcw, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="flex flex-col items-center text-center max-w-md gap-6">
        <div className="bg-primary/10 text-primary p-6 rounded-full">
          <Compass className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black font-headline text-primary">404</h1>
          <h2 className="text-xl font-bold">Página no encontrada</h2>
          <p className="text-sm text-muted-foreground">
            La página que buscas no existe o fue movida. Intenta recargar o vuelve al inicio.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Recargar página
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" /> Volver al inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
