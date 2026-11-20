import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2, Home } from 'lucide-react';
import { db, type Product } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  product: Product | null;
  onClose: () => void;
}

/**
 * Mueve unidades entre la oficina y la casa. `stock` sigue siendo el total;
 * solo cambia cuántas de esas unidades están en casa (`stockHome`).
 */
export default function HomeStockDialog({ product, onClose }: Props) {
  const { t } = useTranslation('products');
  const [direction, setDirection] = useState<'toHome' | 'toOffice'>('toHome');
  const [qty, setQty] = useState('');

  useEffect(() => {
    setDirection('toHome');
    setQty('');
  }, [product?.id]);

  if (!product) return null;
  const home = Math.min(product.stockHome ?? 0, product.stock);
  const office = product.stock - home;
  const max = direction === 'toHome' ? office : home;
  const amount = Math.floor(Number(qty) || 0);

  const save = async () => {
    if (amount <= 0 || amount > max) {
      toast.error(t('homeStock.invalid', { max }));
      return;
    }
    const newHome = direction === 'toHome' ? home + amount : home - amount;
    await db.products.update(product.id!, { stockHome: newHome, updatedAt: new Date() });
    toast.success(t('homeStock.saved'));
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle>{t('homeStock.title', { name: product.name })}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-3">
            <Building2 className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-1">{t('homeStock.office')}</p>
            <p className="text-lg font-bold">{office}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <Home className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-1">{t('homeStock.home')}</p>
            <p className="text-lg font-bold">{home}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['toHome', 'toOffice'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={cn(
                'p-2 rounded-lg text-xs font-semibold border-2',
                direction === d ? 'border-primary bg-primary/5 text-primary' : 'border-muted text-muted-foreground',
              )}
            >
              {t(`homeStock.${d}`)}
            </button>
          ))}
        </div>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder={t('homeStock.qtyPlaceholder', { max })}
          className="h-11"
        />
        <Button className="w-full h-11" onClick={save} disabled={amount <= 0 || amount > max}>
          {t('homeStock.save')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
