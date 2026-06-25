import { formatCurrency } from '../utils/currency'
import { MaskIcon } from './MaskIcon'
import pawIcon from '../assets/brand/paw.png'
import clsx from 'clsx'
import type { Product } from '../types'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  currency: string
}

export function ProductCard({ product, onAdd, currency }: ProductCardProps) {
  const outOfStock = product.stock <= 0

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={clsx(
        'bg-sidebar rounded-lg p-3 flex flex-col items-center gap-2 aspect-[160/185] transition-all text-center cursor-pointer',
        outOfStock
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:brightness-110 hover:shadow-card-lg'
      )}
    >
      <div className="w-full flex-1 min-h-0 bg-accent/75 rounded-app overflow-hidden flex items-center justify-center">
        <MaskIcon src={pawIcon} className="w-14 h-14 text-sidebar" />
      </div>
      <span className="text-accent text-xs font-bold leading-tight line-clamp-2">
        {product.name}
      </span>
      <span className="text-accent text-[10px] font-medium">
        {formatCurrency(product.price, currency)}
      </span>
      {outOfStock && (
        <span className="text-red-400 text-[10px] font-bold">OUT OF STOCK</span>
      )}
    </button>
  )
}
