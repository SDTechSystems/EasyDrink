import type { Debt, Expense, Transaction } from '@/lib/db';

/**
 * Reparto de ganancias entre un inversionista y el operador del negocio.
 *
 * Ganancia neta = ganancia de las ventas (precio − costo) desde la fecha de
 * inicio. Si `collectedOnly` está activo, de cada venta fiada solo cuenta la
 * parte ya cobrada. Si `deductExpenses` está activo, se restan los gastos.
 * El inversionista recibe `investorPercent` de la ganancia neta y el operador
 * el resto. El capital del inversionista = capital inicial + aportes
 * + su rendimiento − retiros.
 */

export interface InvestorMovement {
  id: string;
  date: string; // ISO
  type: 'contribution' | 'withdrawal';
  amount: number;
  note?: string;
}

export interface InvestorConfig {
  investorName: string;
  operatorName: string;
  initialCapital: number;
  investorPercent: number; // 0–100
  startDate: string; // ISO (inicio del día)
  collectedOnly: boolean;
  deductExpenses: boolean;
  movements: InvestorMovement[];
}

export const DEFAULT_INVESTOR_CONFIG: InvestorConfig = {
  investorName: 'Kevin',
  operatorName: 'Juan',
  initialCapital: 100000,
  investorPercent: 30,
  startDate: '2026-08-31T00:00:00.000-05:00',
  collectedOnly: true,
  deductExpenses: false,
  movements: [],
};

export interface InvestorPeriod {
  month: string; // AAAA-MM
  salesProfit: number;
  pendingProfit: number;
  expenses: number;
  netProfit: number;
  investorShare: number;
  operatorShare: number;
  contributions: number;
  withdrawals: number;
}

export interface InvestorSummary {
  salesProfit: number;
  pendingProfit: number;
  expenses: number;
  netProfit: number;
  investorShare: number;
  operatorShare: number;
  contributions: number;
  withdrawals: number;
  capitalBase: number;
  investorCapital: number;
  roi: number; // rendimiento / (capital inicial + aportes)
  periods: InvestorPeriod[];
}

const monthKey = (d: Date) => {
  // Mes en hora de Colombia (UTC−5).
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 7);
};

export function computeInvestorSummary(
  config: InvestorConfig,
  transactions: Transaction[],
  debts: Debt[],
  expenses: Expense[],
): InvestorSummary {
  const start = new Date(config.startDate).getTime();
  const pct = Math.min(100, Math.max(0, config.investorPercent)) / 100;
  const remainingByTx = new Map<number, number>();
  for (const d of debts) remainingByTx.set(d.transactionId, (remainingByTx.get(d.transactionId) ?? 0) + d.remainingAmount);

  const periods = new Map<string, InvestorPeriod>();
  const period = (key: string) => {
    let p = periods.get(key);
    if (!p) {
      p = { month: key, salesProfit: 0, pendingProfit: 0, expenses: 0, netProfit: 0, investorShare: 0, operatorShare: 0, contributions: 0, withdrawals: 0 };
      periods.set(key, p);
    }
    return p;
  };

  for (const tx of transactions) {
    if (tx.status !== 'completed') continue;
    const date = new Date(tx.date);
    if (date.getTime() < start) continue;
    const profit = tx.profit || 0;
    const remaining = tx.id != null ? remainingByTx.get(tx.id) ?? 0 : 0;
    const collectedRatio = tx.total > 0 ? Math.min(1, Math.max(0, (tx.total - remaining) / tx.total)) : 1;
    const counted = config.collectedOnly ? profit * collectedRatio : profit;
    const p = period(monthKey(date));
    p.salesProfit += counted;
    p.pendingProfit += profit - profit * collectedRatio;
  }

  if (config.deductExpenses) {
    for (const e of expenses) {
      if (e.isDeleted) continue;
      const date = new Date(e.date);
      if (date.getTime() < start) continue;
      period(monthKey(date)).expenses += e.amount;
    }
  }

  for (const m of config.movements) {
    const p = period(monthKey(new Date(m.date)));
    if (m.type === 'contribution') p.contributions += m.amount;
    else p.withdrawals += m.amount;
  }

  const list = [...periods.values()].sort((a, b) => a.month.localeCompare(b.month));
  for (const p of list) {
    p.netProfit = p.salesProfit - p.expenses;
    p.investorShare = p.netProfit * pct;
    p.operatorShare = p.netProfit - p.investorShare;
  }

  const sum = (f: (p: InvestorPeriod) => number) => list.reduce((s, p) => s + f(p), 0);
  const salesProfit = sum((p) => p.salesProfit);
  const expensesTotal = sum((p) => p.expenses);
  const netProfit = salesProfit - expensesTotal;
  const investorShare = netProfit * pct;
  const contributions = sum((p) => p.contributions);
  const withdrawals = sum((p) => p.withdrawals);
  const capitalBase = config.initialCapital + contributions;

  return {
    salesProfit,
    pendingProfit: sum((p) => p.pendingProfit),
    expenses: expensesTotal,
    netProfit,
    investorShare,
    operatorShare: netProfit - investorShare,
    contributions,
    withdrawals,
    capitalBase,
    investorCapital: capitalBase + investorShare - withdrawals,
    roi: capitalBase > 0 ? investorShare / capitalBase : 0,
    periods: list.reverse(),
  };
}
