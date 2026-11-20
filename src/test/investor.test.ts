import { describe, it, expect } from 'vitest';
import { computeInvestorSummary, DEFAULT_INVESTOR_CONFIG, type InvestorConfig } from '@/lib/investor';
import type { Debt, Expense, Transaction } from '@/lib/db';

const tx = (id: number, date: string, total: number, profit: number, status: 'completed' | 'open' = 'completed'): Transaction => ({
  id, date: new Date(date), total, profit, status,
  subtotal: total, discountType: null, discountValue: 0, discountAmount: 0,
  paymentMethodId: 1, paymentAmount: total, change: 0, receiptNumber: `TX${id}`,
});

const config: InvestorConfig = { ...DEFAULT_INVESTOR_CONFIG, startDate: '2026-09-01T00:00:00-05:00', movements: [] };

describe('computeInvestorSummary', () => {
  it('splits net profit 30/70 and grows the investor capital', () => {
    const s = computeInvestorSummary(config, [tx(1, '2026-09-10T12:00:00-05:00', 10000, 4000), tx(2, '2026-10-02T12:00:00-05:00', 5000, 2000)], [], []);
    expect(s.netProfit).toBe(6000);
    expect(s.investorShare).toBeCloseTo(1800);
    expect(s.operatorShare).toBeCloseTo(4200);
    expect(s.investorCapital).toBeCloseTo(101800);
    expect(s.roi).toBeCloseTo(0.018);
    expect(s.periods.map((p) => p.month)).toEqual(['2026-10', '2026-09']);
  });

  it('counts only the collected part of a sale on credit', () => {
    const debts: Debt[] = [{ id: 1, transactionId: 1, customerId: 1, customerName: 'A', originalAmount: 10000, remainingAmount: 5000, status: 'partial', createdAt: new Date(), settledAt: null }];
    const s = computeInvestorSummary(config, [tx(1, '2026-09-10T12:00:00-05:00', 10000, 4000)], debts, []);
    expect(s.salesProfit).toBeCloseTo(2000);
    expect(s.pendingProfit).toBeCloseTo(2000);
    const all = computeInvestorSummary({ ...config, collectedOnly: false }, [tx(1, '2026-09-10T12:00:00-05:00', 10000, 4000)], debts, []);
    expect(all.salesProfit).toBe(4000);
  });

  it('ignores open bills and sales before the start date, and applies movements and expenses', () => {
    const expenses: Expense[] = [{ id: 1, title: 'Hielo', categoryId: 1, amount: 1000, paymentMethodId: 1, date: new Date('2026-09-12T12:00:00-05:00'), createdAt: new Date(), isDeleted: 0, deletedAt: null }];
    const s = computeInvestorSummary(
      {
        ...config,
        deductExpenses: true,
        movements: [
          { id: 'a', date: '2026-09-20T12:00:00-05:00', type: 'withdrawal', amount: 500 },
          { id: 'b', date: '2026-09-21T12:00:00-05:00', type: 'contribution', amount: 50000 },
        ],
      },
      [tx(1, '2026-08-20T12:00:00-05:00', 9999, 9999), tx(2, '2026-09-10T12:00:00-05:00', 10000, 4000), tx(3, '2026-09-11T12:00:00-05:00', 10000, 4000, 'open')],
      [],
      expenses,
    );
    expect(s.netProfit).toBe(3000);
    expect(s.capitalBase).toBe(150000);
    expect(s.investorCapital).toBeCloseTo(150000 + 900 - 500);
  });
});
