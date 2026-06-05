'use server';
/**
 * @fileOverview An AI-powered sales insight tool for administrators.
 *
 * - analyzeSalesData - A function that analyzes sales data and provides strategic recommendations.
 * - AdminSalesInsightInput - The input type for the analyzeSalesData function.
 * - AdminSalesInsightOutput - The return type for the analyzeSalesData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductSalesDetailSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  quantitySold: z.number().int().positive().describe('Total quantity of this product sold.'),
  currentPrice: z.number().positive().describe('The current price of the product.'),
  currentCommission: z.number().describe('The current commission per unit for this product.'),
});

const CitySalesDetailSchema = z.object({
  city: z.string().describe('The city where sales occurred.'),
  totalSalesValueInCity: z.number().positive().describe('Total sales value in this city.'),
});

const WeeklySellerSalesSchema = z.object({
  sellerName: z.string().describe('The name of the seller.'),
  totalSalesValue: z.number().positive().describe('Total sales value for this seller in the week.'),
  totalCommissionEarned: z.number().positive().describe('Total commission earned by this seller in the week.'),
  totalDeposited: z.number().describe('Total amount deposited by this seller to the owner in the week.'),
  productsSold: z.array(ProductSalesDetailSchema).describe('Details of products sold by this seller.'),
  salesByCity: z.array(CitySalesDetailSchema).describe('Sales breakdown by city for this seller.'),
});

const AdminSalesInsightInputSchema = z.object({
  weeklySalesReports: z.array(WeeklySellerSalesSchema).describe('An array of weekly sales reports for each seller.'),
  timePeriod: z.string().describe('The time period for which the sales data is provided (e.g., "last week", "past month").'),
});
export type AdminSalesInsightInput = z.infer<typeof AdminSalesInsightInputSchema>;

const CommissionSuggestionSchema = z.object({
  productName: z.string().optional().describe('The name of the product for which commission is suggested.'),
  sellerName: z.string().optional().describe('The name of the seller for whom commission is suggested.'),
  suggestedCommissionRate: z.number().describe('The suggested new commission rate.'),
  reason: z.string().describe('The reason for the suggested commission adjustment.'),
});

const PricingSuggestionSchema = z.object({
  productName: z.string().describe('The name of the product for which pricing is suggested.'),
  suggestedPrice: z.number().positive().describe('The suggested new selling price.'),
  reason: z.string().describe('The reason for the suggested pricing adjustment.'),
});

const AdminSalesInsightOutputSchema = z.object({
  trends: z.array(z.string()).describe('Identified sales trends and patterns.'),
  commissionSuggestions: z.array(CommissionSuggestionSchema).describe('Actionable suggestions for commission rate adjustments.'),
  pricingSuggestions: z.array(PricingSuggestionSchema).describe('Actionable suggestions for product pricing strategies.'),
  overallStrategyRecommendations: z.string().describe('Overall strategic recommendations to optimize sales and revenue.'),
});
export type AdminSalesInsightOutput = z.infer<typeof AdminSalesInsightOutputSchema>;

export async function analyzeSalesData(input: AdminSalesInsightInput): Promise<AdminSalesInsightOutput> {
  return adminSalesInsightFlow(input);
}

const salesInsightPrompt = ai.definePrompt({
  name: 'salesInsightPrompt',
  input: { schema: AdminSalesInsightInputSchema },
  output: { schema: AdminSalesInsightOutputSchema },
  prompt: `You are an expert sales analyst for a business selling chairs and tables, managing multiple sellers.
Your goal is to analyze the provided sales data for the {{{timePeriod}}} and offer actionable insights and strategic recommendations to optimize sales and revenue.

Here is the sales data:

{{#each weeklySalesReports}}
Seller: {{{sellerName}}}
  Total Sales Value: $ {{{totalSalesValue}}}
  Total Commission Earned: $ {{{totalCommissionEarned}}}
  Total Deposited to Owner: $ {{{totalDeposited}}}
  Products Sold:
  {{#each productsSold}}
    - {{{productName}}}: {{{quantitySold}}} units @ $ {{{currentPrice}}} each (Commission: $ {{{currentCommission}}} per unit)
  {{/each}}
  Sales by City:
  {{#each salesByCity}}
    - {{{city}}}: $ {{{totalSalesValueInCity}}}
  {{/each}}

{{/each}}

Based on this data, please provide:
1. Identified sales trends and patterns (e.g., top-performing products, underperforming sellers, geographic strengths/weaknesses).
2. Specific, actionable suggestions for commission rate adjustments for products or sellers, including the suggested rate and the reason.
3. Specific, actionable suggestions for product pricing strategies, including the suggested price and the reason.
4. Overall strategic recommendations to optimize sales strategies and improve overall revenue.

Ensure your output strictly adheres to the provided JSON schema for AdminSalesInsightOutput.`,
});

const adminSalesInsightFlow = ai.defineFlow(
  {
    name: 'adminSalesInsightFlow',
    inputSchema: AdminSalesInsightInputSchema,
    outputSchema: AdminSalesInsightOutputSchema,
  },
  async (input) => {
    const { output } = await salesInsightPrompt(input);
    return output!;
  }
);
