import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  Download, PackageX, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, BarChart2, Boxes, TriangleAlert, Eye, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CalendarPicker } from '../../components/CalendarPicker'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { useSettingsStore } from '../../store/settingsStore'
import { useProductStore } from '../../store/productStore'
import { getDb } from '../../db/database'
import { formatCurrency } from '../../utils/currency'
import { exportToCsv } from '../../utils/export'
import type { TopProduct, SaleWithUser, SaleItem } from '../../types'

const DONUT_COLORS = ['#ec5f8f', '#5ec98a', '#b07cd6', '#5b8def', '#4dd0e1']
const BAR_COLORS = ['#fdf5aa', '#ec8fb5', '#7ed99f', '#b07cd6', '#fca5a5']
const AXIS = '#fffacf'

interface RawSale {
  datetime: string
  total: number
}

export default function ManagerReports() {
  const { fetchSettings, getCurrency, getThreshold } = useSettingsStore()
  const { products, fetchProducts } = useProductStore()
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [allSales, setAllSales] = useState<RawSale[]>([])
  const [allSalesHistory, setAllSalesHistory] = useState<SaleWithUser[]>([])
  const [catMargins, setCatMargins] = useState<{ name: string; margin: number }[]>([])
  const [totals, setTotals] = useState({ revenue: 0, profit: 0 })
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'day'>('month')
  const [filterDate, setFilterDate] = useState(() => new Date())
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [selectedSale, setSelectedSale] = useState<SaleWithUser | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const HISTORY_PAGE_SIZE = 20

  useEffect(() => {
    fetchSettings()
    fetchProducts()
    loadReports()
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const loadReports = async () => {
    const db = await getDb()
    const top = await db.select<{
      name: string
      units_sold: number
      revenue: number
      profit: number
    }[]>(`
      SELECT
        si.name_snapshot as name,
        SUM(si.qty) as units_sold,
        SUM(si.line_total) as revenue,
        SUM(si.line_profit) as profit
      FROM sale_items si
      GROUP BY si.name_snapshot
      ORDER BY units_sold DESC
      LIMIT 10
    `)
    setTopProducts(
      top.map((t, i) => ({
        rank: i + 1,
        name: t.name,
        units_sold: t.units_sold,
        revenue: t.revenue,
        profit: t.profit,
        margin: t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0,
      }))
    )

    const sales = await db.select<RawSale[]>('SELECT datetime, total FROM sales')
    setAllSales(sales)

    const cats = await db.select<{ name: string; profit: number; revenue: number }[]>(`
      SELECT p.category as name, SUM(si.line_profit) as profit, SUM(si.line_total) as revenue
      FROM sale_items si JOIN products p ON si.product_id = p.id
      GROUP BY p.category
      ORDER BY p.category
    `)
    setCatMargins(
      cats.map((c) => ({ name: c.name, margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0 }))
    )

    const [t] = await db.select<[{ revenue: number; profit: number }]>(`
      SELECT COALESCE(SUM(total),0) as revenue, COALESCE(SUM(profit),0) as profit FROM sales
    `)
    setTotals({ revenue: t.revenue, profit: t.profit })

    const history = await db.select<SaleWithUser[]>(`
      SELECT s.*, COALESCE(u.username, 'Unknown') as username
      FROM sales s LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.datetime DESC
    `)
    setAllSalesHistory(history)
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

  const donutData = topProducts.slice(0, 5).map((t) => ({ name: t.name, value: t.units_sold }))
  const leader = topProducts[0]
  const lowStock = products.filter((p) => p.stock <= threshold).sort((a, b) => a.stock - b.stock)
  const grossMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  // Sales Overview — daily totals for the selected month
  const overview = useMemo(() => {
    const y = monthDate.getFullYear()
    const m = monthDate.getMonth()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const points = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: 0 }))
    let monthTotal = 0
    let prevTotal = 0
    for (const s of allSales) {
      const d = new Date(s.datetime)
      if (d.getFullYear() === y && d.getMonth() === m) {
        points[d.getDate() - 1].total += s.total
        monthTotal += s.total
      } else if (
        (m === 0 && d.getFullYear() === y - 1 && d.getMonth() === 11) ||
        (d.getFullYear() === y && d.getMonth() === m - 1)
      ) {
        prevTotal += s.total
      }
    }
    const pct = prevTotal > 0 && monthTotal > 0 ? ((monthTotal - prevTotal) / prevTotal) * 100 : null
    return { points, monthTotal, pct, hasData: monthTotal > 0, daysInMonth }
  }, [allSales, monthDate])

  const startOfWeek = (d: Date) => { const s = new Date(d); s.setDate(d.getDate() - d.getDay() + 1); s.setHours(0, 0, 0, 0); return s }
  const endOfWeek   = (d: Date) => { const e = new Date(d); e.setDate(d.getDate() - d.getDay() + 7); e.setHours(23, 59, 59, 999); return e }

  const filteredHistory = useMemo(() => {
    return allSalesHistory.filter((s) => {
      const d = new Date(s.datetime)
      if (filterMode === 'month') return d.getMonth() === filterDate.getMonth() && d.getFullYear() === filterDate.getFullYear()
      if (filterMode === 'week')  return d >= startOfWeek(filterDate) && d <= endOfWeek(filterDate)
      return d.getFullYear() === filterDate.getFullYear() && d.getMonth() === filterDate.getMonth() && d.getDate() === filterDate.getDate()
    })
  }, [allSalesHistory, filterMode, filterDate])

  const filterLabel = filterMode === 'month'
    ? filterDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : filterMode === 'week'
    ? `${startOfWeek(filterDate).toLocaleString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek(filterDate).toLocaleString('en-US', { month: 'short', day: 'numeric' })}`
    : filterDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const shiftFilter = (delta: number) => {
    setFilterDate((d) => {
      if (filterMode === 'month') return new Date(d.getFullYear(), d.getMonth() + delta, 1)
      if (filterMode === 'week')  return new Date(d.getTime() + delta * 7 * 86400000)
      return new Date(d.getTime() + delta * 86400000)
    })
    setHistoryPage(1)
  }

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE))
  const pagedHistory = filteredHistory.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE)

  const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const rangeLabel = `${monthDate.toLocaleString('en-US', { month: 'short' })} 1 – ${overview.daysInMonth}`
  const shiftMonth = (delta: number) =>
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))

  const handleExport = async () => {
    if (topProducts.length === 0) {
      toast.error('No data to export')
      return
    }
    const headers = ['Rank', 'Product', 'Units Sold', 'Revenue', 'Profit', 'Margin %']
    const rows = topProducts.map((t) => [
      t.rank, t.name, t.units_sold, t.revenue.toFixed(2), t.profit.toFixed(2), t.margin.toFixed(1),
    ])
    const ok = await exportToCsv(headers, rows, 'sales-report.csv')
    if (ok) toast.success('Report exported!')
  }

  const handleExportHistory = async () => {
    if (filteredHistory.length === 0) { toast.error('No sales to export'); return }
    const pad2 = (n: number) => String(n).padStart(2, '0')
    const headers = ['Transaction ID', 'Date & Time', 'Cashier', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total', 'Amount Paid', 'Change']
    const rows = filteredHistory.map((s) => {
      const d = new Date(s.datetime)
      const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
      return [s.ticket_code, dateStr, s.username, s.item_count, s.subtotal.toFixed(2), s.tax.toFixed(2), s.discount.toFixed(2), s.total.toFixed(2), s.amount_paid.toFixed(2), s.change_given.toFixed(2)]
    })
    const label = filterMode === 'month'
      ? `${filterDate.getFullYear()}-${pad2(filterDate.getMonth() + 1)}`
      : filterMode === 'week' ? `week-${filterDate.toISOString().slice(0, 10)}`
      : filterDate.toISOString().slice(0, 10)
    const ok = await exportToCsv(headers, rows, `sales-${label}.csv`)
    if (ok) toast.success('Sales history exported!')
  }

  const topColumns = [
    { key: 'rank', header: 'Rank' },
    { key: 'name', header: 'Product Name' },
    { key: 'units_sold', header: 'Unit Sold' },
    { key: 'revenue', header: 'Revenue', render: (r: TopProduct) => formatCurrency(r.revenue, currency) },
    { key: 'margin', header: 'Margin', render: (r: TopProduct) => `${r.margin.toFixed(1)}%` },
  ]

  const tooltipStyle = {
    background: '#0f2235',
    border: '1px solid #749bc2',
    borderRadius: '8px',
    color: '#fff',
  }
  const tooltipLabel = { color: '#fffacf', fontWeight: 600 }
  const tooltipItem = { color: '#ffffff' }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Top row: Top Selling Products (donut) + Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-3 flex flex-col gap-3 min-w-0">
          <div className="bg-sidebar rounded-app px-4 py-3 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Top Selling Products</span>
            <div className="bg-card-icon rounded-app size-[42px] flex items-center justify-center shrink-0">
              <Boxes size={22} className="text-accent" />
            </div>
          </div>
          <div className="bg-table-row rounded-app px-4 py-4 flex-1">
            {donutData.length > 0 ? (
              <>
                <p className="text-accent font-extrabold text-2xl leading-tight">{donutData.length} Products</p>
                <p className="text-card-subtitle text-xs mb-1">Leading revenue generator</p>
                {leader && (
                  <p className="text-white/90 text-sm mb-2">
                    {leader.name}: {leader.units_sold} units sold
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-[150px] h-[150px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={2} stroke="none">
                          {donutData.map((_, i) => (
                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabel} itemStyle={tooltipItem} formatter={(v) => [`${Number(v)} units`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex flex-col gap-1.5 min-w-0">
                    {donutData.map((d, i) => (
                      <li key={d.name} className="flex items-center gap-2 text-white text-xs">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="truncate">{d.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center text-center gap-2">
                <PackageX size={40} className="text-accent/40" />
                <p className="text-white/60 text-sm">No sales recorded yet</p>
                <p className="text-white/40 text-xs">Top sellers appear here after your first sale</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-3 flex flex-col gap-3 min-w-0">
          <div className="bg-sidebar rounded-app px-4 py-3 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Low Stock Items</span>
            <div className="bg-card-icon rounded-app size-[42px] flex items-center justify-center shrink-0">
              <TriangleAlert size={22} className="text-accent" />
            </div>
          </div>
          <div className="bg-table-row rounded-app px-4 py-4 flex-1 flex flex-col">
            <p className="text-accent font-extrabold text-2xl leading-tight">{products.length === 0 ? '—' : lowStock.length}</p>
            <p className="text-card-subtitle text-xs mb-3">{products.length === 0 ? 'No inventory yet' : 'Needs attention'}</p>
            {products.length === 0 ? (
              <div className="h-[120px] flex flex-col items-center justify-center text-center gap-1">
                <p className="text-white/60 text-sm font-semibold">No products added yet</p>
                <p className="text-white/40 text-xs">Add inventory to start tracking stock</p>
              </div>
            ) : lowStock.length > 0 ? (
              <div className="flex-1 flex items-center gap-3 overflow-x-auto pb-1">
                {lowStock.map((p) => (
                  <div key={p.id} className="w-[128px] shrink-0 bg-table-row-alt border border-navy/30 rounded-app p-3 text-center flex flex-col gap-1">
                    <p className="text-accent text-sm font-bold leading-tight line-clamp-2 min-h-[34px]">{p.name}</p>
                    <p className="text-card-subtitle text-[10px]">Current Stock</p>
                    <p className={p.stock <= 0 ? 'text-red-400 font-extrabold text-lg' : 'text-accent font-extrabold text-lg'}>{p.stock}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[120px] flex flex-col items-center justify-center text-center gap-1">
                <p className="text-green-300 text-sm font-semibold">All items are well stocked</p>
                <p className="text-white/40 text-xs">Nothing below the low-stock threshold</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Product table */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-sidebar text-white font-semibold rounded-app px-4 py-2 inline-block">Top Selling Product</span>
          <button onClick={handleExport} className="bg-accent text-sidebar px-3 py-2 rounded-app text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all cursor-pointer">
            <Download size={14} /> Export CSV
          </button>
        </div>
        <DataTable columns={topColumns} data={topProducts} keyField="rank" emptyMessage="No sales data yet — make a sale to see your top products" />
      </div>

      {/* Sales Overview (line chart) */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5 min-w-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="bg-sidebar text-white font-semibold rounded-app px-4 py-2 inline-block mb-3">Sales Overview</span>
            <p className="text-navy font-extrabold text-2xl leading-tight">{formatCurrency(overview.monthTotal, currency)}</p>
            <p className="text-navy/70 text-xs">Total Sales ({rangeLabel})</p>
            {overview.pct !== null && (
              <p className={`flex items-center gap-1 text-sm font-semibold ${overview.pct >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {overview.pct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(overview.pct).toFixed(1)}% vs last month
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-navy font-semibold text-sm min-w-[110px] text-center">{monthLabel}</span>
            <button onClick={() => shiftMonth(-1)} className="bg-[#b3c1e6] text-sidebar border border-navy rounded-md w-8 h-8 flex items-center justify-center hover:brightness-105 cursor-pointer" aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => shiftMonth(1)} className="bg-[#b3c1e6] text-sidebar border border-navy rounded-md w-8 h-8 flex items-center justify-center hover:brightness-105 cursor-pointer" aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="bg-table-row rounded-app p-3 h-[240px]">
          {overview.hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,250,207,0.12)" />
                <XAxis dataKey="day" interval="preserveStartEnd" minTickGap={16} stroke={AXIS} tick={{ fontSize: 10, fill: AXIS }} />
                <YAxis stroke={AXIS} tick={{ fontSize: 10, fill: AXIS }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabel} itemStyle={tooltipItem} labelFormatter={(d) => `Day ${d}`} formatter={(v) => [formatCurrency(Number(v), currency), 'Sales']} />
                <Line type="monotone" dataKey="total" stroke="#fdf5aa" strokeWidth={2} dot={{ r: 3, fill: '#fdf5aa' }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <PackageX size={36} className="text-accent/30" />
              <p className="text-white/60 text-sm font-medium">No sales in {monthLabel}</p>
              <p className="text-white/40 text-xs">Use the arrows to view another month</p>
            </div>
          )}
        </div>
      </div>

      {/* Profit Analysis (margin by category) */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5 min-w-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="bg-sidebar text-white font-semibold rounded-app px-4 py-2 inline-block mb-3">Profit Analysis</span>
            <p className="text-navy font-extrabold text-2xl leading-tight">{formatCurrency(totals.profit, currency)}</p>
            <p className="text-navy/70 text-xs">Gross Profit</p>
            <p className="text-navy/70 text-xs">Gross Margin: {grossMargin.toFixed(1)}%</p>
          </div>
          <div className="bg-sidebar rounded-app size-[42px] flex items-center justify-center shrink-0">
            <BarChart2 size={20} className="text-accent" />
          </div>
        </div>
        <div className="bg-table-row rounded-app p-3 h-[260px]">
          {catMargins.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catMargins} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,250,207,0.12)" vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} tick={{ fontSize: 12, fill: AXIS }} />
                <YAxis stroke={AXIS} tick={{ fontSize: 10, fill: AXIS }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip cursor={{ fill: 'rgba(255,250,207,0.06)' }} contentStyle={tooltipStyle} labelStyle={tooltipLabel} itemStyle={tooltipItem} formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Margin']} />
                <Bar dataKey="margin" radius={[4, 4, 0, 0]} maxBarSize={70}>
                  {catMargins.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <PackageX size={36} className="text-accent/30" />
              <p className="text-white/60 text-sm font-medium">No profit data yet</p>
              <p className="text-white/40 text-xs">Margins by category appear after sales</p>
            </div>
          )}
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-navy font-bold text-xl">Sales History</h2>
          <div className="flex items-center gap-3">
            {/* Export CSV */}
            <button
              onClick={handleExportHistory}
              className="bg-accent text-sidebar px-3 py-1.5 rounded-app text-xs font-bold flex items-center gap-1.5 hover:brightness-105 transition-all cursor-pointer"
            >
              <Download size={13} /> Export CSV
            </button>

            {/* Filter badge + popover */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="bg-[#b3c1e6] text-sidebar border border-navy text-sm font-semibold rounded-md px-4 py-1.5 flex items-center gap-2 hover:brightness-105 cursor-pointer min-w-[150px] justify-between"
              >
                <span>{filterLabel}</span>
                <ChevronDown size={14} className={filterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-card-dark border border-navy/60 rounded-app shadow-card p-3 w-[240px] flex flex-col gap-3">
                  {/* Mode tabs */}
                  <div className="flex rounded-md overflow-hidden border border-navy/40">
                    {(['month', 'week', 'day'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setFilterMode(m); setHistoryPage(1) }}
                        className={`flex-1 py-1 text-xs font-semibold capitalize cursor-pointer transition-colors ${filterMode === m ? 'bg-accent text-sidebar' : 'bg-sidebar text-white/60 hover:text-white'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* ← label → navigation */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => shiftFilter(-1)}
                      className="bg-sidebar border border-navy/40 text-white/70 rounded w-7 h-7 flex items-center justify-center hover:border-accent hover:text-accent cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-accent text-xs font-semibold text-center flex-1">{filterLabel}</span>
                    <button
                      onClick={() => shiftFilter(1)}
                      className="bg-sidebar border border-navy/40 text-white/70 rounded w-7 h-7 flex items-center justify-center hover:border-accent hover:text-accent cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Day mode: custom calendar */}
                  {filterMode === 'day' && (
                    <CalendarPicker
                      value={filterDate}
                      onChange={(d) => { setFilterDate(d); setHistoryPage(1) }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <DataTable
          columns={[
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
            { key: 'total', header: 'Total', render: (row: SaleWithUser) => formatCurrency(row.total, currency) },
            {
              key: 'actions',
              header: 'Actions',
              render: (row: SaleWithUser) => (
                <button
                  onClick={() => viewSaleDetails(row)}
                  className="bg-accent text-sidebar px-3 py-1 rounded-app text-xs font-bold hover:brightness-105 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Eye size={14} /> View
                </button>
              ),
            },
          ]}
          data={pagedHistory}
          keyField="id"
          emptyMessage={`No sales for ${filterLabel}`}
        />
        {/* Pagination */}
        {totalHistoryPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
            <span className="text-white/40 text-xs">
              {filteredHistory.length} transactions · Page {historyPage} of {totalHistoryPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="bg-sidebar border border-white/20 text-white/70 px-3 py-1.5 rounded text-xs hover:border-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={12} /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalHistoryPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalHistoryPages - 4, historyPage - 2)) + i
                if (p < 1 || p > totalHistoryPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setHistoryPage(p)}
                    className={`w-8 h-7 rounded text-xs cursor-pointer transition-colors ${p === historyPage ? 'bg-accent text-sidebar font-bold' : 'bg-sidebar border border-white/20 text-white/70 hover:border-accent hover:text-accent'}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
                className="bg-sidebar border border-white/20 text-white/70 px-3 py-1.5 rounded text-xs hover:border-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale detail modal */}
      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)}>
        <Modal.Header title={`Sale ${selectedSale?.ticket_code}`} onClose={() => setSelectedSale(null)} />
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
