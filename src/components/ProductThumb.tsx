import { useState } from 'react';
import { Package as PackageIcon } from 'lucide-react';
import type { Product } from '@/lib/db';
import { cn } from '@/lib/utils';

/**
 * Foto del producto. Si el producto no tiene foto propia, usa la foto de
 * catálogo publicada en /product-photos/<SKU>.webp (si existe).
 */
export default function ProductThumb({ product, iconClassName, className }: {
  product: Pick<Product, 'photo' | 'sku' | 'name'>;
  iconClassName?: string;
  className?: string;
}) {
  const catalogSrc = product.sku ? `/product-photos/${encodeURIComponent(product.sku)}.webp` : null;
  const [failed, setFailed] = useState(false);
  const src = product.photo || (!failed ? catalogSrc : null);

  if (!src) return <PackageIcon className={cn('text-muted-foreground/30', iconClassName)} />;
  return (
    <img
      src={src}
      alt={product.name}
      loading="lazy"
      className={cn('w-full h-full object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
}
