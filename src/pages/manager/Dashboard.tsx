import { useEffect, useMemo, useState } from 'react'
import { Eye, PhilippinePeso, ShoppingBag, TriangleAlert } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { useProductStore } from '../../store/productStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getDb } from '../../db/database'
import { formatCurrency } from '../../utils/currency'
import type { SaleWithUser, SaleItem } from '../../types'

export default function ManagerDashboard() {
  const { products, fetchProducts } = useProductStore()
  const { fetchSettings, getCurrency, getThreshold } = useSettingsStore()
  const [sales, setSales] = useState<SaleWithUser[]>([])
  const [totalSales, setTotalSales] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedSale, setSelectedSale] = useState<SaleWithUser | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])

  useEffect(() => {
    fetchProducts()
    fetchSettings()
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    const db = await getDb()
    const recentSales = await db.select<SaleWithUser[]>(`
      SELECT s.*, COALESCE(u.username, 'Unknown') as username
      FROM sales s LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.datetime DESC LIMIT 50
    `)
    setSales(recentSales)

    const [{ total }] = await db.select<[{ total: number }]>(
      'SELECT COALESCE(SUM(total), 0) as total FROM sales'
    )
    setTotalSales(total)

    const [{ items }] = await db.select<[{ items: number }]>(
      'SELECT COALESCE(SUM(item_count), 0) as items FROM sales'
    )
    setTotalItems(items)
  }

  const viewSaleDetails = async (sale: SaleWithUser) => {
    const db = await getDb()
    const items = await db.select<SaleItem[]>(
      'SELECT * FROM sale_items WHERE sale_id = $1',
      [sale.id]
    )
    setSaleItems(items)
    setSelectedSale(sale)
  }

  const currency = getCurrency()
  const threshold = getThreshold()
  const lowStockCount = products.filter((p) => p.stock <= threshold).length

  // Month-over-month change for the stat-card subtitles (uses all sales loaded)
  const mom = useMemo(() => {
    const now = new Date()
    const cm = now.getMonth()
    const cy = now.getFullYear()
    const pm = new Date(cy, cm - 1, 1).getMonth()
    const py = new Date(cy, cm - 1, 1).getFullYear()
    let cs = 0, ci = 0, ps = 0, pi = 0
    for (const s of sales) {
      const d = new Date(s.datetime)
      if (d.getMonth() === cm && d.getFullYear() === cy) { cs += s.total; ci += s.item_count }
      else if (d.getMonth() === pm && d.getFullYear() === py) { ps += s.total; pi += s.item_count }
    }
    const pct = (cur: number, prv: number) => (prv > 0 ? ((cur - prv) / prv) * 100 : null)
    return { salesPct: pct(cs, ps), itemsPct: pct(ci, pi) }
  }, [sales])

  const fmtPct = (p: number | null) =>
    p === null ? 'vs last month' : `${p >= 0 ? '+' : ''}${p.toFixed(0)}% from last month`

  const columns = [
    { key: 'ticket_code', header: 'Transaction ID' },
    {
      key: 'datetime',
      header: 'Date & Time',
      render: (row: SaleWithUser) =>
        new Date(row.datetime).toLocaleString('en-US', {
          month: 'short', day: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
    },
    { key: 'username', header: 'Cashier' },
    { key: 'item_count', header: 'Items' },
    {
      key: 'total',
      header: 'Total',
      render: (row: SaleWithUser) => formatCurrency(row.total, currency),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: SaleWithUser) => (
        <button
          onClick={() => viewSaleDetails(row)}
          className="bg-accent text-sidebar px-3 py-1 rounded-md text-xs font-bold hover:bg-cream-dark transition-colors cursor-pointer flex items-center gap-1"
        >
          <Eye size={14} /> View
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Sales"
          value={formatCurrency(totalSales, currency)}
          subtitle={fmtPct(mom.salesPct)}
          icon={PhilippinePeso}
        />
        <StatCard
          title="Items Sold"
          value={totalItems.toLocaleString()}
          subtitle={fmtPct(mom.itemsPct)}
          icon={ShoppingBag}
        />
        <StatCard
          title="Low Stock Items"
          value={String(lowStockCount)}
          subtitle="Needs attention"
          icon={TriangleAlert}
        />
      </div>

      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-navy font-bold text-lg">Recent Sales</h2>
          <span className="text-navy/50 text-xs">Last 50 transactions</span>
        </div>
        <DataTable
          columns={columns}
          data={sales}
          keyField="id"
          emptyMessage="No sales yet — complete a transaction to see it here"
          maxHeight="360px"
        />
      </div>

      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)}>
        <Modal.Header
          title={`Sale ${selectedSale?.ticket_code}`}
          onClose={() => setSelectedSale(null)}
        />
        <Modal.Body>
          {selectedSale && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-white/60 text-sm">
                <span>{new Date(selectedSale.datetime).toLocaleString()}</span>
                <span>Cashier: <strong className="text-accent">{selectedSale.username}</strong></span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/60 border-b border-white/10">
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item) => (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="py-2 text-white/80">{item.name_snapshot}</td>
                      <td className="py-2 text-right text-white/80">{item.qty}</td>
                      <td className="py-2 text-right text-white/80">{formatCurrency(item.unit_price, currency)}</td>
                      <td className="py-2 text-right text-accent font-semibold">{formatCurrency(item.line_total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-white/10 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Tax</span>
                  <span>{formatCurrency(selectedSale.tax, currency)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-white/60">
                    <span>Discount</span>
                    <span>− {formatCurrency(selectedSale.discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-accent font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(selectedSale.total, currency)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-1 space-y-1.5">
                  <div className="flex justify-between text-white/60">
                    <span>Amount Paid</span>
                    <span className="text-white/80">{formatCurrency(selectedSale.amount_paid, currency)}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Change</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(selectedSale.change_given, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
}
