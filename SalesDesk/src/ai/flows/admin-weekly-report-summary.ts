'use server';
/**
 * @fileOverview This file implements a Genkit flow that generates a weekly sales report summary for administrators.
 *
 * - getAdminWeeklyReportSummary - A function that requests an AI-generated summary of weekly sales data.
 * - AdminWeeklyReportSummaryInput - The input type for the getAdminWeeklyReportSummary function.
 * - AdminWeeklyReportSummaryOutput - The return type for the getAdminWeeklyReportSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdminWeeklyReportSummaryInputSchema = z.object({
  startDate: z.string().describe('The start date of the weekly report period (e.g., YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the weekly report period (e.g., YYYY-MM-DD).'),
  totalSalesValue: z.number().describe('The total monetary value of all sales for the week.').min(0),
  totalCommissionValue: z.number().describe('The total commission generated for the week.').min(0),
  totalDepositValue: z.number().describe('The total amount to be deposited to the owner for the week.').min(0),
  sellerReports: z.array(
    z.object({
      sellerName: z.string().describe("The name of the seller."),
      totalSalesValue: z.number().describe("The total sales value for this seller.").min(0),
      totalCommissionEarned: z.number().describe("The total commission earned by this seller.").min(0),
      totalDepositDue: z.number().describe("The total amount this seller needs to deposit.").min(0),
      salesCount: z.number().int().describe("The number of sales made by this seller.").min(0),
    })
  ).describe('A list of reports for individual sellers.'),
  salesByCity: z.array(
    z.object({
      city: z.string().describe("The name of the city."),
      totalSalesValue: z.number().describe("The total sales value from this city.").min(0),
    })
  ).describe('A list of sales breakdown by city.'),
  salesStatusDistribution: z.array(
    z.object({
      status: z.enum(['assigned', 'delivered', 'paid']).describe("The status of the sales."),
      count: z.number().int().describe("The number of sales with this status.").min(0),
    })
  ).describe('A distribution of sales by their current status.'),
});
export type AdminWeeklyReportSummaryInput = z.infer<typeof AdminWeeklyReportSummaryInputSchema>;

const AdminWeeklyReportSummaryOutputSchema = z.object({
  summary: z.string().describe('A comprehensive summary of the weekly sales report, highlighting key metrics, top-performing sellers, and areas needing attention.'),
});
export type AdminWeeklyReportSummaryOutput = z.infer<typeof AdminWeeklyReportSummaryOutputSchema>;

export async function getAdminWeeklyReportSummary(input: AdminWeeklyReportSummaryInput): Promise<AdminWeeklyReportSummaryOutput> {
  return adminWeeklyReportSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminWeeklyReportSummaryPrompt',
  input: {schema: AdminWeeklyReportSummaryInputSchema},
  output: {schema: AdminWeeklyReportSummaryOutputSchema},
  prompt: `You are an expert business analyst for a sales company, tasked with summarizing a weekly sales report.

Your summary should:
- Highlight overall key metrics for the week, including total sales value, total commission, and total deposit.
- Identify and comment on top-performing sellers, detailing their sales and commission.
- Point out any sellers who might be underperforming or require attention.
- Analyze sales distribution by city.
- Comment on the sales status distribution (assigned, delivered, paid) and suggest any areas for operational improvement.
- Provide insights into general trends and areas for strategic focus to enhance performance and revenue.

The report covers the period from {{{startDate}}} to {{{endDate}}}.

--- Weekly Sales Report Data ---

Overall Metrics:
Total Sales Value: {{{totalSalesValue}}}
Total Commission Value: {{{totalCommissionValue}}}
Total Deposit Value: {{{totalDepositValue}}}

Seller Performance:
{{#each sellerReports}}
- Seller: {{{sellerName}}}
  Sales Value: {{{totalSalesValue}}}
  Commission Earned: {{{totalCommissionEarned}}}
  Deposit Due: {{{totalDepositDue}}}
  Sales Count: {{{salesCount}}}
{{/each}}

Sales by City:
{{#each salesByCity}}
- City: {{{city}}}
  Sales Value: {{{totalSalesValue}}}
{{/each}}

Sales Status Distribution:
{{#each salesStatusDistribution}}
- Status: {{{status}}}
  Count: {{{count}}}
{{/each}}

--- End of Report Data ---

Please provide a concise and insightful summary based on the data above. Focus on actionable insights and clear communication. The summary should be a narrative description, not just a list of facts.
`,
});

const adminWeeklyReportSummaryFlow = ai.defineFlow(
  {
    name: 'adminWeeklyReportSummaryFlow',
    inputSchema: AdminWeeklyReportSummaryInputSchema,
    outputSchema: AdminWeeklyReportSummaryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
