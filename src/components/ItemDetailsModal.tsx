import { Modal } from './Modal'
import { formatCurrency } from '../utils/currency'
import { getStockStatus } from '../utils/export'
import type { Product } from '../types'

interface Props {
  product: Product | null
  currency: string
  threshold: number
  onClose: () => void
}

export function ItemDetailsModal({ product, currency, threshold, onClose }: Props) {
  const field = (label: string, value: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-white/60 text-xs">{label}</span>
      <div className="bg-sidebar border border-white/10 rounded-app px-3 py-2 text-accent text-sm font-medium">
        {value || '—'}
      </div>
    </div>
  )

  return (
    <Modal isOpen={!!product} onClose={onClose}>
      <div className="flex flex-col">
        <div className="bg-sidebar rounded-t-app px-5 py-3 text-center">
          <h2 className="text-accent font-bold text-lg">Product Information</h2>
        </div>
        {product && (
          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {field('Product Name', product.name)}
              {field('Category', product.category)}
            </div>
            {field('Description', product.description)}
            <div className="grid grid-cols-3 gap-4">
              {field('Price', formatCurrency(product.price, currency))}
              {field('Stock Quantity', `${product.stock} pcs`)}
              {field('Date Added', new Date(product.created_at).toLocaleDateString())}
            </div>
            <div className="flex items-center justify-between bg-table-row rounded-app px-4 py-2">
              <span className="text-white/60 text-xs">Status</span>
              <span className="text-accent font-semibold text-sm">
                {getStockStatus(product.stock, threshold)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="self-center bg-[#b3c1e6] text-sidebar px-8 py-2 rounded-app text-sm font-bold hover:brightness-105 cursor-pointer mt-1"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
