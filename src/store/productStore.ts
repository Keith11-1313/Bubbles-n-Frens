import { create } from 'zustand'
import { getDb } from '../db/database'
import type { Product } from '../types'

interface ProductStore {
  products: Product[]
  loading: boolean
  error: string | null
  fetchProducts: () => Promise<void>
  addProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateProduct: (id: number, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: number) => Promise<void>
}

export const useProductStore = create<ProductStore>()((set) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null })
    try {
      const db = await getDb()
      const products = await db.select<Product[]>(
        'SELECT * FROM products ORDER BY name'
      )
      set({ products, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  addProduct: async (data) => {
    const db = await getDb()
    const res = await db.execute(
      'INSERT INTO products (name, category, description, cost, price, stock) VALUES ($1, $2, $3, $4, $5, $6)',
      [data.name, data.category, data.description ?? '', data.cost, data.price, data.stock]
    )
    const [product] = await db.select<Product[]>(
      'SELECT * FROM products WHERE id = $1',
      [res.lastInsertId]
    )
    set((s) => ({ products: [...s.products, product] }))
  },

  updateProduct: async (id, data) => {
    const db = await getDb()
    const fields: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name) }
    if (data.category !== undefined) { fields.push(`category = $${idx++}`); values.push(data.category) }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description) }
    if (data.cost !== undefined) { fields.push(`cost = $${idx++}`); values.push(data.cost) }
    if (data.price !== undefined) { fields.push(`price = $${idx++}`); values.push(data.price) }
    if (data.stock !== undefined) { fields.push(`stock = $${idx++}`); values.push(data.stock) }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    await db.execute(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    )

    const [updated] = await db.select<Product[]>(
      'SELECT * FROM products WHERE id = $1',
      [id]
    )
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? updated : p)),
    }))
  },

  deleteProduct: async (id) => {
    const db = await getDb()
    await db.execute('DELETE FROM products WHERE id = $1', [id])
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
  },
}))
