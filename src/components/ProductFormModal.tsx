import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import type { Product } from '../types'

const CATEGORIES = ['Food', 'Treats', 'Toys', 'Grooming', 'Medicine', 'Accessories']

export interface ProductFormData {
  name: string
  category: string
  description: string
  cost: number
  price: number
  stock: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Existing product for edit, or null/undefined for a new product. */
  product?: Product | null
  title: string
  submitLabel: string
  onSubmit: (data: ProductFormData) => Promise<void> | void
}

const empty: ProductFormData = { name: '', category: 'Food', description: '', cost: 0, price: 0, stock: 0 }

export function ProductFormModal({ isOpen, onClose, product, title, submitLabel, onSubmit }: Props) {
  const [form, setForm] = useState<ProductFormData>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(
      product
        ? {
            name: product.name,
            category: product.category,
            description: product.description ?? '',
            cost: product.cost,
            price: product.price,
            stock: product.stock,
          }
        : empty
    )
    setErrors({})
  }, [isOpen, product])

  const MAX_MONEY = 99999.99
  const MAX_STOCK = 9999

  const set = (k: keyof ProductFormData, v: string) => {
    setForm((f) => {
      if (k === 'cost' || k === 'price') {
        const n = parseFloat(v)
        return { ...f, [k]: isNaN(n) ? 0 : Math.min(Math.max(n, 0), MAX_MONEY) }
      }
      if (k === 'stock') {
        const n = parseInt(v, 10)
        return { ...f, [k]: isNaN(n) ? 0 : Math.min(Math.max(n, 0), MAX_STOCK) }
      }
      return { ...f, [k]: v }
    })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.price <= 0) e.price = 'Price must be greater than 0'
    if (form.price > MAX_MONEY) e.price = `Price cannot exceed ₱${MAX_MONEY.toLocaleString()}`
    if (form.cost < 0) e.cost = 'Cost cannot be negative'
    if (form.cost > MAX_MONEY) e.cost = `Cost cannot exceed ₱${MAX_MONEY.toLocaleString()}`
    if (form.stock < 0) e.stock = 'Stock cannot be negative'
    if (form.stock > MAX_STOCK) e.stock = `Stock cannot exceed ${MAX_STOCK.toLocaleString()}`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full bg-sidebar border border-white/10 rounded-app px-3 py-2 text-accent text-sm outline-none focus:border-accent'
  const labelCls = 'block text-xs font-medium text-white/60 mb-1'

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-accent font-bold text-xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#b3c1e6] text-sidebar text-xs font-bold px-3 py-1.5 rounded-md hover:brightness-105 cursor-pointer"
          >
            Cancel Edits
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-auto">
          {/* Product Information */}
          <div className="rounded-app overflow-hidden border border-white/10">
            <div className="bg-sidebar px-4 py-2">
              <span className="text-accent text-sm font-semibold">Product Information</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 bg-card-dark">
              <div>
                <label className={labelCls}>Product Name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="rounded-app overflow-hidden border border-white/10">
            <div className="bg-sidebar px-4 py-2">
              <span className="text-accent text-sm font-semibold">Pricing &amp; Stock</span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4 bg-card-dark">
              <div>
                <label className={labelCls}>Cost</label>
                <input
                  type="number" min={0} step={0.01}
                  value={form.cost === 0 ? '' : form.cost}
                  onChange={(e) => set('cost', e.target.value)}
                  onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault() }}
                  placeholder="0.00"
                  className={inputCls}
                />
                {errors.cost && <p className="text-red-400 text-xs mt-1">{errors.cost}</p>}
              </div>
              <div>
                <label className={labelCls}>Selling Price</label>
                <input
                  type="number" min={0} step={0.01}
                  value={form.price === 0 ? '' : form.price}
                  onChange={(e) => set('price', e.target.value)}
                  onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault() }}
                  placeholder="0.00"
                  className={inputCls}
                />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className={labelCls}>Stock Quantity</label>
                <input
                  type="number" min={0} step={1}
                  value={form.stock === 0 ? '' : form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  onKeyDown={(e) => { if (['-', 'e', 'E', '+', '.'].includes(e.key)) e.preventDefault() }}
                  placeholder="0"
                  className={inputCls}
                />
                {errors.stock && <p className="text-red-400 text-xs mt-1">{errors.stock}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent text-sidebar px-5 py-2 rounded-app text-sm font-bold hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
