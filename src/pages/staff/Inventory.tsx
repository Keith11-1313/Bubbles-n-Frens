import { useEffect, useState } from 'react'
import { Plus, Pencil, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { DataTable } from '../../components/DataTable'
import { ProductFormModal, type ProductFormData } from '../../components/ProductFormModal'
import { ItemDetailsModal } from '../../components/ItemDetailsModal'
import { useProductStore } from '../../store/productStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { getDb } from '../../db/database'
import { formatCurrency } from '../../utils/currency'
import { getStockStatus } from '../../utils/export'
import type { Product } from '../../types'

export default function StaffInventory() {
  const { products, loading, fetchProducts } = useProductStore()
  const { fetchSettings, getCurrency, getThreshold } = useSettingsStore()
  const user = useAuthStore((s) => s.user)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [infoProduct, setInfoProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchSettings()
  }, [])

  const currency = getCurrency()
  const threshold = getThreshold()

  const submitForReview = async (data: ProductFormData) => {
    const db = await getDb()
    await db.execute(
      `INSERT INTO submissions
        (kind, product_id, name, category, description, cost, price, stock, submitted_by, submitter_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        editing ? 'edit' : 'new',
        editing?.id ?? null,
        data.name,
        data.category,
        data.description,
        data.cost,
        data.price,
        data.stock,
        user?.id ?? null,
        user?.username ?? 'Staff',
      ]
    )
    toast.success('Submitted for manager review')
  }

  const columns = [
    { key: 'name', header: 'Product' },
    { key: 'category', header: 'Category' },
    { key: 'price', header: 'Price', render: (r: Product) => formatCurrency(r.price, currency) },
    { key: 'stock', header: 'Stocks' },
    {
      key: 'status',
      header: 'Status',
      render: (r: Product) => {
        const s = getStockStatus(r.stock, threshold)
        return (
          <span
            className={clsx(
              'text-sm font-semibold',
              s === 'In Stock' && 'text-green-300',
              s === 'Low Stock' && 'text-yellow-300',
              s === 'Out of Stock' && 'text-red-400'
            )}
          >
            {s}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: Product) => (
        <div className="flex gap-2">
          <button onClick={() => { setEditing(r); setShowForm(true) }} className="bg-accent text-sidebar rounded-md w-8 h-8 flex items-center justify-center hover:brightness-105 cursor-pointer" aria-label="Edit">
            <Pencil size={15} />
          </button>
          <button onClick={() => setInfoProduct(r)} className="bg-accent text-sidebar rounded-md w-8 h-8 flex items-center justify-center hover:brightness-105 cursor-pointer" aria-label="Details">
            <Info size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-sidebar font-bold text-xl">Inventory Management</h2>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-[#b3c1e6] text-sidebar border border-navy px-4 py-2 rounded-app text-sm font-bold flex items-center gap-2 hover:brightness-105 transition-all cursor-pointer"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <DataTable
          columns={columns}
          data={products}
          keyField="id"
          emptyMessage={loading ? 'Loading...' : 'No products found'}
          maxHeight="calc(100vh - 300px)"
        />
      </div>

      <ProductFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        product={editing}
        title={editing ? 'Edit Product' : 'New Product'}
        submitLabel="Submit For Manager Review"
        onSubmit={submitForReview}
      />

      <ItemDetailsModal product={infoProduct} currency={currency} threshold={threshold} onClose={() => setInfoProduct(null)} />
    </div>
  )
}
