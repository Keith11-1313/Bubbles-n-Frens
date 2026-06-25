import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { generateTicketCode } from '../utils/ticketCode'
import type { CartItem, Product } from '../types'

interface CartStore {
  items: CartItem[]
  discount: number
  addItem: (product: Product) => void
  updateQty: (productId: number, qty: number) => void
  removeItem: (productId: number) => void
  setDiscount: (amount: number) => void
  clearCart: () => void
  processPayment: (userId: number, taxRate: number, amountPaid: number) => Promise<string>
  getSubtotal: () => number
  getTax: (taxRate: number) => number
  getTotal: (taxRate: number) => number
  getProfit: () => number
}

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  discount: 0,

  addItem: (product: Product) => {
    set((s) => {
      const existing = s.items.find((i) => i.product_id === product.id)
      if (existing) {
        if (existing.qty >= product.stock) return s
        return {
          items: s.items.map((i) =>
            i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i
          ),
        }
      }
      if (product.stock <= 0) return s
      return {
        items: [
          ...s.items,
          {
            product_id: product.id,
            name: product.name,
            price: product.price,
            cost: product.cost,
            qty: 1,
            max_stock: product.stock,
          },
        ],
      }
    })
  },

  updateQty: (productId: number, qty: number) => {
    set((s) => {
      if (qty <= 0) return { items: s.items.filter((i) => i.product_id !== productId) }
      return {
        items: s.items.map((i) =>
          i.product_id === productId
            ? { ...i, qty: Math.min(qty, i.max_stock) }
            : i
        ),
      }
    })
  },

  removeItem: (productId: number) => {
    set((s) => ({ items: s.items.filter((i) => i.product_id !== productId) }))
  },

  setDiscount: (amount: number) => set({ discount: Math.max(0, amount) }),

  clearCart: () => set({ items: [], discount: 0 }),

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.qty, 0)
  },

  getTax: (taxRate: number) => {
    const subtotal = get().getSubtotal()
    return subtotal * (taxRate / 100)
  },

  getTotal: (taxRate: number) => {
    const subtotal = get().getSubtotal()
    const tax = get().getTax(taxRate)
    const discount = get().discount
    return subtotal + tax - discount
  },

  getProfit: () => {
    return get().items.reduce((sum, i) => sum + (i.price - i.cost) * i.qty, 0)
  },

  processPayment: async (userId: number, taxRate: number, amountPaid: number) => {
    const { items, discount } = get()
    if (items.length === 0) throw new Error('Cart is empty')

    const ticketCode = await generateTicketCode()
    const subtotal = get().getSubtotal()
    const tax = get().getTax(taxRate)
    const total = get().getTotal(taxRate)
    const profit = get().getProfit()
    const itemCount = items.reduce((sum, i) => sum + i.qty, 0)
    const changeGiven = Math.max(0, amountPaid - total)

    // Record the whole sale atomically via the Rust `process_sale` command —
    // sale + line items + stock decrements all commit together or not at all.
    await invoke('process_sale', {
      sale: {
        ticket_code: ticketCode,
        subtotal,
        tax,
        discount,
        total,
        profit,
        item_count: itemCount,
        user_id: userId,
        amount_paid: amountPaid,
        change_given: changeGiven,
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          qty: i.qty,
          unit_price: i.price,
          unit_cost: i.cost,
        })),
      },
    })

    set({ items: [], discount: 0 })
    return ticketCode
  },
}))
