import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

export async function exportToCsv(
  headers: string[],
  rows: (string | number)[][],
  defaultFilename: string
) {
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ]
  const csvContent = csvLines.join('\n')

  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })

  if (filePath) {
    await writeTextFile(filePath, csvContent)
    return true
  }
  return false
}

export function getStockStatus(
  stock: number,
  threshold: number
): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (stock <= 0) return 'Out of Stock'
  if (stock <= threshold) return 'Low Stock'
  return 'In Stock'
}
