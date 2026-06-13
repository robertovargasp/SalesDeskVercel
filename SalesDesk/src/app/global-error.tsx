"use client"

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-body antialiased">
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="flex flex-col items-center text-center max-w-md gap-6">
            <div className="bg-destructive/10 text-destructive p-6 rounded-full">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-headline text-primary">La aplicación falló</h1>
              <p className="text-sm text-muted-foreground">
                Ocurrió un error crítico. Intenta recargar la página o vuelve más tarde.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button onClick={reset} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Recargar página
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href="/dashboard">
                  <Home className="w-4 h-4" /> Volver al inicio
                </a>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
