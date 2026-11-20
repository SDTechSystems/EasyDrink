import { CURRENCY_SYMBOL, NUMBER_LOCALE } from '@/lib/currency';

/** Estado de cuenta de un cliente: líneas y texto para WhatsApp. */

export interface StatementLine {
  date: Date;
  items: { name: string; quantity: number; subtotal: number }[];
  original: number;
  paid: number;
  remaining: number;
}

export const rp = (n: number) => `${CURRENCY_SYMBOL} ${Math.round(n).toLocaleString(NUMBER_LOCALE)}`;
export const shortDate = (d: Date) => d.toLocaleDateString(NUMBER_LOCALE, { day: 'numeric', month: 'short' });

export function buildStatementText(p: { storeName: string; customerName: string; lines: StatementLine[]; credit: number }, labels: {
  greeting: string; total: string; credit: string; net: string; paid: string; missing: string; thanks: string; title: string;
}): string {
  const total = p.lines.reduce((s, l) => s + l.remaining, 0);
  const rows = p.lines.map((l) => {
    const items = l.items.map((i) => `${i.quantity} ${i.name}`).join(', ');
    const partial = l.paid > 0 ? ` (${labels.paid} ${rp(l.paid)}, ${labels.missing} ${rp(l.remaining)})` : '';
    return `• ${shortDate(l.date)}: ${items} — ${rp(l.original)}${partial}`;
  });
  const out = [`*${p.storeName}* — ${labels.title}`, labels.greeting, '', ...rows, '', `*${labels.total}: ${rp(total)}*`];
  if (p.credit > 0) out.push(`${labels.credit}: ${rp(p.credit)}`, `*${labels.net}: ${rp(Math.max(0, total - p.credit))}*`);
  out.push('', labels.thanks);
  return out.join('\n');
}

