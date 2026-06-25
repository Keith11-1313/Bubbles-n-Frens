import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { SquaresFour, Rows } from '@phosphor-icons/react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'
import toast from 'react-hot-toast'
import { ProductCard } from '../../components/ProductCard'
import { MaskIcon } from '../../components/MaskIcon'
import pawIcon from '../../assets/brand/paw.png'
import { Modal } from '../../components/Modal'
import { useProductStore } from '../../store/productStore'
import { useCartStore } from '../../store/cartStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/currency'
import { useDebounce } from '../../hooks/useDebounce'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { KbdHint } from '../../components/KbdHint'

export default function ManagerSales() {
  const { products, fetchProducts } = useProductStore()
  const { fetchSettings, getTaxRate, getCurrency } = useSettingsStore()
  const user = useAuthStore((s) => s.user)
  const {
    items,
    discount,
    addItem,
    updateQty,
    removeItem,
    setDiscount,
    clearCart,
    processPayment,
    getSubtotal,
    getTax,
    getTotal,
  } = useCartStore()

  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const debouncedSearch = useDebounce(search)
  const searchRef = useRef<HTMLInputElement>(null)

  const taxRate = getTaxRate()
  const currency = getCurrency()
  const subtotal = getSubtotal()
  const tax = getTax(taxRate)
  const total = getTotal(taxRate)
  const received = parseFloat(cashReceived) || 0
  const change = received - total

  useKeyboardShortcuts({
    onFocusSearch: () => searchRef.current?.focus(),
    onProcessPayment: () => { if (items.length > 0 && !processing) setShowPayment(true) },
    onClearCart: () => { if (items.length > 0) clearCart() },
    onRemoveLast: () => {
      if (items.length > 0) removeItem(items[items.length - 1].product_id)
    },
    isModalOpen: showPayment,
  })

  useEffect(() => {
    fetchProducts()
    fetchSettings()
  }, [])

  const filteredProducts = debouncedSearch
    ? products.filter((p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : products

  const handleConfirmPayment = async () => {
    if (items.length === 0 || !user) return
    if (received < total) {
      toast.error('Cash received is less than the total amount')
      return
    }
    setProcessing(true)
    try {
      const ticketCode = await processPayment(user.id, taxRate, received)
      await fetchProducts()
      setShowPayment(false)
      setCashReceived('')
      toast.success(`Sale ${ticketCode} recorded! Change: ${formatCurrency(change, currency)}`)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex gap-6 h-full animate-fadeIn">
      {/* Products panel */}
      <div className="flex-1 bg-card border-2 border-navy rounded-app shadow-card-lg p-5 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-navy font-bold text-2xl flex-1">Products</h2>
          <div className="relative w-[220px]">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length > 0 && filteredProducts[0].stock > 0) {
                  addItem(filteredProducts[0])
                }
              }}
              className="w-full bg-table-row border border-white/10 rounded-app px-3 py-2 pr-14 text-sm text-white/80 outline-none focus:border-accent"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <KbdHint action="sales_focus_search" />
            </div>
          </div>
          <div className="flex border border-white/20 rounded-app overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-2 flex items-center transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-accent text-sidebar' : 'bg-sidebar text-white/50 hover:text-white'}`}
              title="Grid view"
            >
              <SquaresFour size={18} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-2 flex items-center transition-colors cursor-pointer border-l border-white/20 ${viewMode === 'list' ? 'bg-accent text-sidebar' : 'bg-sidebar text-white/50 hover:text-white'}`}
              title="List view"
            >
              <Rows size={18} weight={viewMode === 'list' ? 'fill' : 'regular'} />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] content-start">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addItem}
                currency={currency}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] flex flex-col gap-1.5">
            {filteredProducts.map((product) => {
              const outOfStock = product.stock <= 0
              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && addItem(product)}
                  disabled={outOfStock}
                  className={`w-full flex items-center gap-3 bg-sidebar rounded-app px-4 py-2.5 text-left transition-colors ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'}`}
                >
                  <MaskIcon src={pawIcon} className="w-7 h-7 text-accent/60 shrink-0" />
                  <span className="flex-1 text-accent text-sm font-semibold truncate">{product.name}</span>
                  <span className="text-accent/60 text-xs shrink-0">{formatCurrency(product.price, currency)}</span>
                  {outOfStock
                    ? <span className="text-red-400 text-[10px] font-bold shrink-0">OUT OF STOCK</span>
                    : <span className="text-accent/40 text-xs shrink-0">Stock: {product.stock}</span>
                  }
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart panel */}
      <div className="w-[340px] bg-card border-2 border-navy rounded-app shadow-card-lg p-5 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-navy font-bold text-2xl">Shopping Cart</h2>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="bg-accent text-sidebar rounded-md text-xs font-bold px-3 py-1 hover:brightness-105 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Clear all
              <KbdHint action="sales_clear_cart" variant="dark" />
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] flex flex-col gap-2 mb-4">
          {items.length === 0 ? (
            <p className="text-navy/50 text-sm text-center py-8">
              Click a product to add it
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.product_id}
                className="bg-table-row rounded-app p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-accent text-sm font-medium truncate">
                    {item.name}
                  </p>
                  <p className="text-accent/70 text-xs">
                    {formatCurrency(item.price, currency)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQty(item.product_id, item.qty - 1)}
                    className="w-6 h-6 rounded-full bg-navy/40 flex items-center justify-center text-accent/70 hover:bg-accent hover:text-sidebar transition-colors cursor-pointer"
                  >
                    <CaretDown size={10} weight="bold" />
                  </button>
                  <span className="text-accent text-sm font-bold w-6 text-center tabular-nums">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.product_id, item.qty + 1)}
                    disabled={item.qty >= item.max_stock}
                    className="w-6 h-6 rounded-full bg-navy/40 flex items-center justify-center text-accent/70 hover:bg-accent hover:text-sidebar transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CaretUp size={10} weight="bold" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product_id)}
                  className="text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t-2 border-navy/20 pt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-navy font-semibold">
            <span>Products:</span>
            <span>Quantity:</span>
          </div>
          <div className="flex justify-between text-navy">
            <span>Subtotal</span>
            <span className="font-bold">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-navy">
            <span>Tax ({taxRate}%)</span>
            <span className="font-bold">{formatCurrency(tax, currency)}</span>
          </div>
          <div className="flex justify-between items-center text-navy">
            <span>Discount</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={discount || ''}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-[100px] bg-table-row border border-white/10 rounded px-2 py-1 text-right text-white/80 text-sm outline-none"
            />
          </div>
          <div className="flex justify-between text-navy font-bold text-lg pt-2 border-t-2 border-navy/20">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <button
          onClick={() => setShowPayment(true)}
          disabled={items.length === 0 || processing}
          className="mt-4 bg-accent text-sidebar font-bold py-3 rounded-app hover:brightness-105 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Process Payment
          <KbdHint action="sales_process_payment" variant="dark" />
        </button>
      </div>

      {/* Payment modal */}
      <Modal isOpen={showPayment} onClose={() => { setShowPayment(false); setCashReceived('') }}>
        <Modal.Header title="Payment" onClose={() => { setShowPayment(false); setCashReceived('') }} />
        <Modal.Body>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-white/80 text-sm">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-white/80 text-sm">
              <span>Tax ({taxRate}%)</span>
              <span className="font-medium">{formatCurrency(tax, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center text-white/80 text-sm">
                <span>Discount</span>
                <span className="font-medium text-red-400">− {formatCurrency(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-accent font-bold text-xl border-t border-white/10 pt-3">
              <span>Total Due</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <label className="text-white/60 text-sm">Cash Received</label>
              <input
                autoFocus
                type="number"
                min={0}
                max={999999}
                step={0.01}
                value={cashReceived}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || (parseFloat(val) <= 999999 && val.length <= 10)) {
                    setCashReceived(val)
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && received >= total) handleConfirmPayment() }}
                placeholder="Enter amount..."
                className="w-full bg-table-row border border-white/10 rounded-app px-3 py-2 text-accent text-lg font-bold outline-none focus:border-accent"
              />
            </div>

            {cashReceived !== '' && (
              <div className={`flex justify-between items-center font-bold text-lg rounded-app px-4 py-3 ${change >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                <span className="shrink-0">{change >= 0 ? 'Change' : 'Short by'}</span>
                <span className="truncate text-right ml-4">{formatCurrency(Math.abs(change), currency)}</span>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => { setShowPayment(false); setCashReceived('') }}
            className="px-4 py-2 text-white/60 hover:text-white text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmPayment}
            disabled={processing || received < total || cashReceived === ''}
            className="bg-accent text-sidebar px-6 py-2 rounded-app text-sm font-bold hover:brightness-105 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Confirm Payment'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
