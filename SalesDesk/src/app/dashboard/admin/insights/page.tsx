
"use client"

import { useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, TrendingUp, Lightbulb, BarChart3, Loader2, DollarSign, Users, Wallet } from 'lucide-react';
import { analyzeSalesData, AdminSalesInsightOutput } from '@/ai/flows/admin-sales-insight-tool';

export default function InsightsPage() {
  const { sales, users, products } = useStore();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AdminSalesInsightOutput | null>(null);

  const handleGenerateInsights = async () => {
    setLoading(true);
    try {
      // Prepare data for the AI flow
      const sellers = users.filter(u => u.role === 'seller');
      const weeklySalesReports = sellers.map(seller => {
        const sellerSales = sales.filter(s => s.sellerId === seller.id);
        const productsSold = products.map(p => {
          const productSales = sellerSales.filter(s => s.productId === p.id);
          return {
            productName: p.name,
            quantitySold: productSales.reduce((acc, s) => acc + s.quantity, 0),
            currentPrice: p.price,
            currentCommission: p.defaultCommission
          };
        }).filter(ps => ps.quantitySold > 0);

        const cities = Array.from(new Set(sellerSales.map(s => s.city)));
        const salesByCity = cities.map(city => ({
          city,
          totalSalesValueInCity: sellerSales.filter(s => s.city === city).reduce((acc, s) => acc + s.totalVenta, 0)
        }));

        return {
          sellerName: seller.name,
          totalSalesValue: sellerSales.reduce((acc, s) => acc + s.totalVenta, 0),
          totalCommissionEarned: sellerSales.reduce((acc, s) => acc + s.totalComision, 0),
          totalDeposited: sellerSales.reduce((acc, s) => acc + s.totalDeposito, 0),
          productsSold,
          salesByCity
        };
      }).filter(r => r.totalSalesValue > 0);

      const result = await analyzeSalesData({
        weeklySalesReports,
        timePeriod: 'esta semana'
      });
      setInsights(result);
    } catch (error) {
      console.error("AI Insight Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
            <Sparkles className="text-accent" /> AI Sales Insights
          </h1>
          <p className="text-muted-foreground text-sm">Análisis estratégico basado en tus datos de ventas reales</p>
        </div>
        <Button onClick={handleGenerateInsights} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Generar Análisis
        </Button>
      </div>

      {!insights && !loading && (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 bg-muted/20">
          <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Listo para potenciar tu negocio</h2>
          <p className="text-muted-foreground text-sm max-w-sm text-center">
            Haz clic en "Generar Análisis" para obtener recomendaciones personalizadas sobre precios, comisiones y tendencias.
          </p>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted rounded-xl" />)}
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Tendencias Identificadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insights.trends.map((t, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary font-bold">•</span> {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" /> Sugerencias de Precios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.pricingSuggestions.map((s, i) => (
                  <div key={i} className="border-l-4 border-green-600 pl-4 py-1">
                    <p className="font-bold text-sm">{s.productName}: <span className="text-green-600">${s.suggestedPrice}</span></p>
                    <p className="text-xs text-muted-foreground">{s.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-600" /> Ajustes de Comisión ($)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.commissionSuggestions.map((s, i) => (
                  <div key={i} className="border-l-4 border-orange-600 pl-4 py-1">
                    <p className="font-bold text-sm">
                      {s.productName || s.sellerName}: <span className="text-orange-600">${s.suggestedCommissionRate}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{s.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lightbulb className="w-5 h-5" /> Recomendación Estratégica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed opacity-90">
                {insights.overallStrategyRecommendations}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
