import { AlertTriangle } from 'lucide-react'
import type { Product } from '../types'

interface Props {
  products: Product[]
  threshold: number
}

export function LowStockBanner({ products, threshold }: Props) {
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= threshold)
  const outOfStock = products.filter((p) => p.stock <= 0)

  if (lowStock.length === 0 && outOfStock.length === 0) return null

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-app p-4 flex items-start gap-3 animate-fadeIn">
      <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
      <div className="text-sm">
        {outOfStock.length > 0 && (
          <p className="text-red-400 font-semibold">
            {outOfStock.length} item{outOfStock.length > 1 ? 's' : ''} out of stock
          </p>
        )}
        {lowStock.length > 0 && (
          <p className="text-yellow-300">
            {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low:{' '}
            {lowStock.map((p) => p.name).join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
