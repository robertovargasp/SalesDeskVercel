"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

// AI Sales Insights — módulo pausado (futura implementación).
// El flujo de IA vive en src/ai/ y queda intacto para retomarlo más adelante.
export default function InsightsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
          <Sparkles className="text-accent" /> AI Sales Insights
        </h1>
        <p className="text-muted-foreground text-sm">Análisis estratégico basado en tus datos de ventas</p>
      </div>

      <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 bg-muted/20">
        <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Próximamente</h2>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Este módulo está en desarrollo y se habilitará en una futura actualización.
        </p>
      </Card>
    </div>
  );
}
