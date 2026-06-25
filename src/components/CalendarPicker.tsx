import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface CalendarPickerProps {
  value: Date
  onChange: (date: Date) => void
}

export function CalendarPicker({ value, onChange }: CalendarPickerProps) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1))

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const isSelected = (d: number) =>
    d === value.getDate() && month === value.getMonth() && year === value.getFullYear()

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="text-white/50 hover:text-accent w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 cursor-pointer"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-accent text-[11px] font-semibold">
          {view.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="text-white/50 hover:text-accent w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 cursor-pointer"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_HEADERS.map((d) => (
          <span key={d} className="text-center text-white/30 text-[10px] font-semibold py-0.5">
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) =>
          d == null ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              onClick={() => onChange(new Date(year, month, d))}
              className={`h-7 w-full rounded text-[11px] font-medium cursor-pointer transition-colors leading-none
                ${isSelected(d)
                  ? 'bg-accent text-sidebar font-bold'
                  : isToday(d)
                  ? 'ring-1 ring-accent/70 text-accent'
                  : 'text-white/70 hover:bg-white/10'
                }`}
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  )
}
