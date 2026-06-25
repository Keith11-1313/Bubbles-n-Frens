import { getDb } from '../db/database'

export async function generateTicketCode(): Promise<string> {
  const db = await getDb()
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const [{ c }] = await db.select<[{ c: number }]>(
    "SELECT COUNT(*) as c FROM sales WHERE date(datetime) = date('now', 'localtime')"
  )
  const seq = String(Number(c) + 1).padStart(6, '0')
  return `${dd}${mm}${yy}-${seq}`
}
