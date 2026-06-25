import Database from '@tauri-apps/plugin-sql'
import { HOTKEY_CONFIGS } from '../types'

let instance: Database | null = null

export async function getDb(): Promise<Database> {
  if (instance) return instance
  try {
    instance = await Database.load('sqlite:bubbles.db')
    await runMigrations(instance)
    return instance
  } catch (err) {
    instance = null
    throw err
  }
}

async function runMigrations(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK(role IN ('manager','staff')),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      category      TEXT    NOT NULL,
      cost          REAL    NOT NULL DEFAULT 0,
      price         REAL    NOT NULL DEFAULT 0,
      stock         INTEGER NOT NULL DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code   TEXT    NOT NULL UNIQUE,
      datetime      DATETIME DEFAULT CURRENT_TIMESTAMP,
      subtotal      REAL    NOT NULL,
      tax           REAL    NOT NULL DEFAULT 0,
      discount      REAL    NOT NULL DEFAULT 0,
      total         REAL    NOT NULL,
      profit        REAL    NOT NULL DEFAULT 0,
      item_count    INTEGER NOT NULL,
      user_id       INTEGER REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id         INTEGER NOT NULL REFERENCES sales(id),
      product_id      INTEGER REFERENCES products(id),
      name_snapshot   TEXT    NOT NULL,
      qty             INTEGER NOT NULL,
      unit_price      REAL    NOT NULL,
      unit_cost       REAL    NOT NULL,
      line_total      REAL    NOT NULL,
      line_profit     REAL    NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  // Add product description (idempotent — ignored if the column already exists)
  try {
    await db.execute("ALTER TABLE products ADD COLUMN description TEXT NOT NULL DEFAULT ''")
  } catch {
    /* column already exists */
  }

  // Add payment tracking columns (idempotent)
  try { await db.execute('ALTER TABLE sales ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0') } catch { /* exists */ }
  try { await db.execute('ALTER TABLE sales ADD COLUMN change_given REAL NOT NULL DEFAULT 0') } catch { /* exists */ }

  // Staff → manager review queue
  await db.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      kind           TEXT    NOT NULL,            -- 'new' | 'edit'
      product_id     INTEGER,                     -- target product for edits
      name           TEXT    NOT NULL,
      category       TEXT    NOT NULL,
      description    TEXT    DEFAULT '',
      cost           REAL    NOT NULL DEFAULT 0,
      price          REAL    NOT NULL DEFAULT 0,
      stock          INTEGER NOT NULL DEFAULT 0,
      submitted_by   INTEGER,
      submitter_name TEXT,
      submitted_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      status         TEXT    NOT NULL DEFAULT 'pending'
    )
  `)

  await seedIfEmpty(db)
  await seedHotkeyDefaults(db)
}


async function seedHotkeyDefaults(db: Database) {
  for (const cfg of HOTKEY_CONFIGS) {
    await db.execute(
      'INSERT OR IGNORE INTO settings (key, value) VALUES ($1, $2)',
      [`hotkey_${cfg.action}`, cfg.defaultBinding]
    )
  }
}

async function seedIfEmpty(db: Database) {
  const [{ c }] = await db.select<[{ c: number }]>(
    'SELECT COUNT(*) as c FROM users'
  )
  if (c > 0) return

  // Seed manager account (password: "admin123")
  const hash = await hashPassword('admin123')
  await db.execute(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
    ['admin', hash, 'manager']
  )

  // Seed settings
  const settings = [
    ['tax_rate', '8.5'],
    ['business_name', "Bubbles 'n Frens"],
    ['currency', '₱'],
    ['low_stock_threshold', '10'],
  ]
  for (const [key, value] of settings) {
    await db.execute(
      'INSERT INTO settings (key, value) VALUES ($1, $2)',
      [key, value]
    )
  }
}



export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'bubbles-n-frens-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
