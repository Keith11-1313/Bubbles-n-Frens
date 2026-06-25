import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getDb } from '../../db/database'
import { formatCurrency } from '../../utils/currency'
import type { Sale, SaleItem } from '../../types'

export default function StaffRecentSales() {
  const user = useAuthStore((s) => s.user)
  const { fetchSettings, getCurrency } = useSettingsStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])

  useEffect(() => {
    fetchSettings()
    loadSales()
  }, [])

  const loadSales = async () => {
    if (!user) return
    const db = await getDb()
    const rows = await db.select<Sale[]>(
      'SELECT * FROM sales WHERE user_id = $1 ORDER BY datetime DESC LIMIT 50',
      [user.id]
    )
    setSales(rows)
  }

  const viewSaleDetails = async (sale: Sale) => {
    const db = await getDb()
    const items = await db.select<SaleItem[]>(
      'SELECT * FROM sale_items WHERE sale_id = $1',
      [sale.id]
    )
    setSaleItems(items)
    setSelectedSale(sale)
  }

  const currency = getCurrency()

  const columns = [
    { key: 'ticket_code', header: 'Transaction ID' },
    {
      key: 'datetime',
      header: 'Date & Time',
      render: (row: Sale) =>
        new Date(row.datetime).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    { key: 'item_count', header: 'Items' },
    {
      key: 'total',
      header: 'Total',
      render: (row: Sale) => formatCurrency(row.total, currency),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Sale) => (
        <button
          onClick={() => viewSaleDetails(row)}
          className="bg-accent text-sidebar px-3 py-1 rounded-app text-xs font-bold hover:bg-cream-dark transition-colors cursor-pointer flex items-center gap-1"
        >
          <Eye size={14} /> View
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-navy font-bold text-xl">Recent Sales</h2>
          <span className="text-navy/50 text-xs">Your last 50 transactions</span>
        </div>
        <DataTable
          columns={columns}
          data={sales}
          keyField="id"
          emptyMessage="No sales yet — complete a transaction to see it here"
          maxHeight="calc(100vh - 300px)"
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
              <p className="text-white/60 text-sm">
                {new Date(selectedSale.datetime).toLocaleString()}
              </p>
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
                      <td className="py-2 text-right text-white/80">
                        {formatCurrency(item.unit_price, currency)}
                      </td>
                      <td className="py-2 text-right text-accent font-semibold">
                        {formatCurrency(item.line_total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-white/10 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-accent font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(selectedSale.total, currency)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 space-y-1.5">
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
