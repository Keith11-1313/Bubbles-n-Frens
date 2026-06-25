import clsx from 'clsx'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  emptyMessage?: string
  /** When set, the table scrolls vertically inside this height (with a sticky header). */
  maxHeight?: string
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = 'No data found',
  maxHeight,
}: DataTableProps<T>) {
  return (
    <div
      className="overflow-auto rounded-app"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key}
                className={clsx(
                  'text-left px-4 py-3 text-sm font-semibold bg-sidebar text-white',
                  maxHeight && 'sticky top-0 z-10',
                  idx === 0 && 'rounded-l-app',
                  idx === columns.length - 1 && 'rounded-r-app',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-8 text-white/50 text-sm bg-table-row rounded-app"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={String(row[keyField])}>
                {columns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-4 py-3 text-sm text-white font-medium border-y-[3px] border-card',
                      i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt',
                      idx === 0 && 'border-l-[3px] rounded-l-app',
                      idx === columns.length - 1 && 'border-r-[3px] rounded-r-app',
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
