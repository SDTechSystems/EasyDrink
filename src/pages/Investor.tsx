import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronLeft, HandCoins, Plus, Settings2, Trash2, TrendingUp } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CURRENCY_SYMBOL, NUMBER_LOCALE } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  computeInvestorSummary,
  DEFAULT_INVESTOR_CONFIG,
  type InvestorConfig,
  type InvestorMovement,
} from '@/lib/investor';

const todayInput = () => {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export default function InvestorPage() {
  const { can } = useAuth();
  const { t } = useTranslation('settings');
  const settings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());

  const [configOpen, setConfigOpen] = useState(false);
  const [draft, setDraft] = useState<InvestorConfig>(DEFAULT_INVESTOR_CONFIG);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movement, setMovement] = useState({ type: 'withdrawal' as InvestorMovement['type'], amount: '', date: todayInput(), note: '' });

  const config: InvestorConfig = { ...DEFAULT_INVESTOR_CONFIG, ...(settings?.investor ?? {}) };
  const summary = useMemo(
    () => computeInvestorSummary(config, transactions ?? [], debts ?? [], expenses ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings?.investor, transactions, debts, expenses],
  );

  if (!can('view_reports')) {
    return <LockedPage title={t('investor.title')} permissionLabel={t('investor.permission')} />;
  }

  const rp = (n: number) => `${CURRENCY_SYMBOL} ${Math.round(n).toLocaleString(NUMBER_LOCALE)}`;
  const pct = config.investorPercent;

  const saveConfig = async (next: InvestorConfig) => {
    if (!settings?.id) return;
    await db.storeSettings.update(settings.id, { investor: next });
  };

  const openConfig = () => {
    setDraft(config);
    setConfigOpen(true);
  };

  const submitConfig = async () => {
    if (draft.investorPercent < 0 || draft.investorPercent > 100) {
      toast.error(t('investor.config.percentError'));
      return;
    }
    await saveConfig(draft);
    setConfigOpen(false);
    toast.success(t('investor.config.saved'));
  };

  const submitMovement = async () => {
    const amount = Math.round(Number(movement.amount) || 0);
    if (amount <= 0) {
      toast.error(t('investor.movement.amountError'));
      return;
    }
    const entry: InvestorMovement = {
      id: crypto.randomUUID(),
      type: movement.type,
      amount,
      date: new Date(`${movement.date}T12:00:00-05:00`).toISOString(),
      note: movement.note.trim() || undefined,
    };
    await saveConfig({ ...config, movements: [...config.movements, entry] });
    setMovementOpen(false);
    toast.success(t('investor.movement.saved'));
  };

  const removeMovement = async (id: string) => {
    await saveConfig({ ...config, movements: config.movements.filter((m) => m.id !== id) });
  };

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(NUMBER_LOCALE, { month: 'long', year: 'numeric' });
  };

  const movements = [...config.movements].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2 truncate">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('investor.title')}
          </h1>
        </div>
        <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={openConfig}>
          <Settings2 className="w-4 h-4" /> {t('investor.configure')}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('investor.explanation', {
          investor: config.investorName,
          operator: config.operatorName,
          investorPct: pct,
          operatorPct: 100 - pct,
        })}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-0 shadow-sm col-span-2">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t('investor.netProfit')}</p>
            <p className="text-2xl font-bold">{rp(summary.netProfit)}</p>
            {config.collectedOnly && summary.pendingProfit > 0 && (
              <p className="text-[11px] text-warning mt-0.5">{t('investor.pendingProfit', { amount: rp(summary.pendingProfit) })}</p>
            )}
            {config.deductExpenses && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('investor.expensesDeducted', { amount: rp(summary.expenses) })}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t('investor.shareOf', { name: config.investorName, pct })}</p>
            <p className="text-lg font-bold text-primary">{rp(summary.investorShare)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t('investor.shareOf', { name: config.operatorName, pct: 100 - pct })}</p>
            <p className="text-lg font-bold text-success">{rp(summary.operatorShare)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{t('investor.capitalOf', { name: config.investorName })}</p>
            <p className="text-xl font-bold">{rp(summary.investorCapital)}</p>
            <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-x-2">
              <span>{t('investor.initialCapital')}: {rp(config.initialCapital)}</span>
              <span>{t('investor.contributions')}: {rp(summary.contributions)}</span>
              <span>{t('investor.withdrawals')}: {rp(summary.withdrawals)}</span>
              <span>{t('investor.roi')}: {(summary.roi * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{t('investor.byMonth')}</h2>
        {summary.periods.length === 0 && <p className="text-xs text-muted-foreground">{t('investor.noData')}</p>}
        {summary.periods.map((p) => (
          <Card key={p.month} className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold capitalize">{monthLabel(p.month)}</p>
                <p className="text-sm font-bold">{rp(p.netProfit)}</p>
              </div>
              <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-x-2 mt-1">
                <span>{config.investorName}: {rp(p.investorShare)}</span>
                <span>{config.operatorName}: {rp(p.operatorShare)}</span>
                {p.withdrawals > 0 && <span>{t('investor.withdrawals')}: {rp(p.withdrawals)}</span>}
                {p.contributions > 0 && <span>{t('investor.contributions')}: {rp(p.contributions)}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('investor.movementsTitle', { name: config.investorName })}</h2>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => {
              setMovement({ type: 'withdrawal', amount: '', date: todayInput(), note: '' });
              setMovementOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" /> {t('investor.addMovement')}
          </Button>
        </div>
        {movements.length === 0 && <p className="text-xs text-muted-foreground">{t('investor.noMovements')}</p>}
        {movements.map((m) => (
          <Card key={m.id} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.type === 'withdrawal' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                <HandCoins className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {t(`investor.movement.${m.type}`)} · {rp(m.amount)}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {new Date(m.date).toLocaleDateString(NUMBER_LOCALE)}{m.note ? ` · ${m.note}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMovement(m.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('investor.config.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>{t('investor.config.investorName')}</Label>
                <Input value={draft.investorName} onChange={(e) => setDraft({ ...draft, investorName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t('investor.config.operatorName')}</Label>
                <Input value={draft.operatorName} onChange={(e) => setDraft({ ...draft, operatorName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>{t('investor.config.initialCapital')}</Label>
                <Input type="number" inputMode="numeric" value={draft.initialCapital} onChange={(e) => setDraft({ ...draft, initialCapital: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>{t('investor.config.percent', { name: draft.investorName })}</Label>
                <Input type="number" inputMode="numeric" value={draft.investorPercent} onChange={(e) => setDraft({ ...draft, investorPercent: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('investor.config.startDate')}</Label>
              <Input
                type="date"
                value={new Date(new Date(draft.startDate).getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                onChange={(e) => e.target.value && setDraft({ ...draft, startDate: new Date(`${e.target.value}T00:00:00-05:00`).toISOString() })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-semibold">{t('investor.config.collectedOnly')}</p>
                <p className="text-[10px] text-muted-foreground">{t('investor.config.collectedOnlyDesc')}</p>
              </div>
              <Switch checked={draft.collectedOnly} onCheckedChange={(v) => setDraft({ ...draft, collectedOnly: v })} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-semibold">{t('investor.config.deductExpenses')}</p>
                <p className="text-[10px] text-muted-foreground">{t('investor.config.deductExpensesDesc')}</p>
              </div>
              <Switch checked={draft.deductExpenses} onCheckedChange={(v) => setDraft({ ...draft, deductExpenses: v })} />
            </div>
            <Button className="w-full h-11" onClick={submitConfig}>{t('investor.config.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>{t('investor.addMovement')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(['withdrawal', 'contribution'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMovement({ ...movement, type })}
                  className={cn('p-2 rounded-lg text-xs font-semibold border-2', movement.type === type ? 'border-primary bg-primary/5 text-primary' : 'border-muted text-muted-foreground')}
                >
                  {t(`investor.movement.${type}`)}
                </button>
              ))}
            </div>
            <Input type="number" inputMode="numeric" placeholder={t('investor.movement.amount')} value={movement.amount} onChange={(e) => setMovement({ ...movement, amount: e.target.value })} className="h-11" />
            <Input type="date" value={movement.date} onChange={(e) => setMovement({ ...movement, date: e.target.value })} className="h-11" />
            <Input placeholder={t('investor.movement.note')} value={movement.note} onChange={(e) => setMovement({ ...movement, note: e.target.value })} className="h-11" />
            <Button className="w-full h-11" onClick={submitMovement}>{t('investor.movement.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
