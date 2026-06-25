import { useEffect, useState } from 'react'
import { Plus, Pencil, Info, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { ProductFormModal, type ProductFormData } from '../../components/ProductFormModal'
import { ItemDetailsModal } from '../../components/ItemDetailsModal'
import { useProductStore } from '../../store/productStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getDb } from '../../db/database'
import { formatCurrency } from '../../utils/currency'
import { getStockStatus } from '../../utils/export'
import type { Product, Submission } from '../../types'

export default function ManagerInventory() {
  const { products, loading, fetchProducts, addProduct, updateProduct } = useProductStore()
  const { fetchSettings, getCurrency, getThreshold } = useSettingsStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [infoProduct, setInfoProduct] = useState<Product | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [review, setReview] = useState<Submission | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchSettings()
    loadSubmissions()
  }, [])

  const currency = getCurrency()
  const threshold = getThreshold()

  const loadSubmissions = async () => {
    const db = await getDb()
    const rows = await db.select<Submission[]>(
      "SELECT * FROM submissions WHERE status = 'pending' ORDER BY submitted_at DESC"
    )
    setSubmissions(rows)
  }

  const openAdd = () => {
    setEditing(null)
    setShowForm(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setShowForm(true)
  }

  const handleSaveProduct = async (data: ProductFormData) => {
    if (editing) {
      await updateProduct(editing.id, data)
      toast.success('Product updated')
    } else {
      await addProduct(data)
      toast.success('Product added')
    }
  }

  const acceptSubmission = async (s: Submission) => {
    const db = await getDb()
    try {
      if (s.kind === 'new') {
        await addProduct({
          name: s.name,
          category: s.category,
          description: s.description,
          cost: s.cost,
          price: s.price,
          stock: s.stock,
        })
      } else if (s.product_id) {
        await updateProduct(s.product_id, {
          name: s.name,
          category: s.category,
          description: s.description,
          cost: s.cost,
          price: s.price,
          stock: s.stock,
        })
      }
      await db.execute("UPDATE submissions SET status = 'approved' WHERE id = $1", [s.id])
      toast.success('Submission accepted')
      setReview(null)
      loadSubmissions()
      fetchProducts()
    } catch (e) {
      toast.error(String(e))
    }
  }

  const declineSubmission = async (s: Submission) => {
    const db = await getDb()
    await db.execute("UPDATE submissions SET status = 'declined' WHERE id = $1", [s.id])
    toast('Submission declined', { icon: '🚫' })
    setReview(null)
    loadSubmissions()
  }

  const currentForReview = review?.product_id
    ? products.find((p) => p.id === review.product_id)
    : null

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
          <button onClick={() => openEdit(r)} className="bg-accent text-sidebar rounded-md w-8 h-8 flex items-center justify-center hover:brightness-105 cursor-pointer" aria-label="Edit">
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative bg-[#b3c1e6] text-sidebar border border-navy rounded-app w-10 h-10 flex items-center justify-center hover:brightness-105 transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {submissions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {submissions.length}
              </span>
            )}
          </button>
          <button
            onClick={openAdd}
            className="bg-[#b3c1e6] text-sidebar border border-navy px-4 py-2 rounded-app text-sm font-bold flex items-center gap-2 hover:brightness-105 transition-all cursor-pointer"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
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

      {/* Add / Edit product */}
      <ProductFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        product={editing}
        title={editing ? 'Edit Product' : 'New Product'}
        submitLabel={editing ? 'Save Changes' : 'Add Product'}
        onSubmit={handleSaveProduct}
      />

      {/* Item details */}
      <ItemDetailsModal product={infoProduct} currency={currency} threshold={threshold} onClose={() => setInfoProduct(null)} />

      {/* Notifications */}
      <Modal isOpen={showNotifications} onClose={() => setShowNotifications(false)}>
        <Modal.Header title="Notifications" onClose={() => setShowNotifications(false)} />
        <Modal.Body>
          {submissions.length === 0 ? (
            <p className="text-white/60 text-sm text-center py-6">No pending submissions.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {submissions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setShowNotifications(false)
                    setReview(s)
                  }}
                  className="text-left bg-table-row hover:bg-table-row-alt rounded-app px-4 py-3 text-sm text-accent transition-colors cursor-pointer"
                >
                  {s.submitter_name || 'Staff'} has submitted{' '}
                  {s.kind === 'new' ? 'a new product addition' : 'an inventory edit'} for review
                </button>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Review (Item Review / Additional Item Review) */}
      <Modal isOpen={!!review} onClose={() => setReview(null)}>
        <div className="bg-sidebar rounded-t-app px-5 py-3 text-center">
          <h2 className="text-accent font-bold text-lg">
            {review?.kind === 'new' ? 'Additional Item Review' : 'Item Review'}
          </h2>
        </div>
        {review && (
          <>
            <Modal.Body>
              <div className="flex flex-col gap-3 text-sm">
                {review.kind === 'edit' && currentForReview ? (
                  <>
                    <ReviewChange label="Product Name" from={currentForReview.name} to={review.name} />
                    <ReviewChange label="Category" from={currentForReview.category} to={review.category} />
                    <ReviewChange label="Description" from={currentForReview.description} to={review.description} />
                    <ReviewChange label="Price" from={formatCurrency(currentForReview.price, currency)} to={formatCurrency(review.price, currency)} />
                    <ReviewChange label="Stock" from={String(currentForReview.stock)} to={String(review.stock)} />
                  </>
                ) : (
                  <>
                    <ReviewLine label="Product Name" value={review.name} />
                    <ReviewLine label="Category" value={review.category} />
                    <ReviewLine label="Description" value={review.description} />
                    <ReviewLine label="Price" value={formatCurrency(review.price, currency)} />
                    <ReviewLine label="Stock" value={String(review.stock)} />
                    <ReviewLine label="Date" value={new Date(review.submitted_at).toLocaleDateString()} />
                    <ReviewLine label="Time" value={new Date(review.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                  </>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button onClick={() => declineSubmission(review)} className="px-4 py-2 bg-red-500 text-white rounded-app text-sm font-bold hover:bg-red-600 cursor-pointer">
                Decline
              </button>
              <button onClick={() => acceptSubmission(review)} className="px-4 py-2 bg-accent text-sidebar rounded-app text-sm font-bold hover:brightness-105 cursor-pointer">
                Accept
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/60">{label}:</span>
      <span className="text-accent font-semibold text-right">{value || '—'}</span>
    </div>
  )
}

function ReviewChange({ label, from, to }: { label: string; from: string; to: string }) {
  const changed = from !== to
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/60">{label}:</span>
      <span className="text-right">
        {changed && <span className="text-white/40 line-through mr-2">{from || '—'}</span>}
        <span className={changed ? 'text-accent font-semibold' : 'text-white/80'}>{to || '—'}</span>
      </span>
    </div>
  )
}
