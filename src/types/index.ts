export interface User {
  id: number
  username: string
  password_hash: string
  role: 'manager' | 'staff'
  created_at: string
}

export interface UserSession {
  id: number
  username: string
  role: 'manager' | 'staff'
}

export interface Product {
  id: number
  name: string
  category: string
  description: string
  cost: number
  price: number
  stock: number
  created_at: string
  updated_at: string
}

export interface Submission {
  id: number
  kind: 'new' | 'edit'
  product_id: number | null
  name: string
  category: string
  description: string
  cost: number
  price: number
  stock: number
  submitted_by: number
  submitter_name: string
  submitted_at: string
  status: 'pending' | 'approved' | 'declined'
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

export interface Sale {
  id: number
  ticket_code: string
  datetime: string
  subtotal: number
  tax: number
  discount: number
  total: number
  profit: number
  item_count: number
  user_id: number
  amount_paid: number
  change_given: number
}

export interface SaleItem {
  id: number
  sale_id: number
  product_id: number
  name_snapshot: string
  qty: number
  unit_price: number
  unit_cost: number
  line_total: number
  line_profit: number
}

export interface CartItem {
  product_id: number
  name: string
  price: number
  cost: number
  qty: number
  max_stock: number
}

export interface SaleWithUser extends Sale {
  username: string
}

export interface TopProduct {
  rank: number
  name: string
  units_sold: number
  revenue: number
  profit: number
  margin: number
}

export type HotkeyAction =
  | 'nav_dashboard'
  | 'nav_inventory'
  | 'nav_reports'
  | 'nav_accounts'
  | 'sales_focus_search'
  | 'sales_process_payment'
  | 'sales_clear_cart'
  | 'sales_remove_last'

export interface HotkeyConfig {
  action: HotkeyAction
  label: string
  description: string
  defaultBinding: string
  scope: 'global' | 'sales'
}

export const HOTKEY_CONFIGS: HotkeyConfig[] = [
  { action: 'nav_dashboard',         label: 'Go to Dashboard',    description: 'Navigate to the Dashboard page',          defaultBinding: 'Alt+1',   scope: 'global' },
  { action: 'nav_inventory',         label: 'Go to Inventory',    description: 'Navigate to the Inventory page',          defaultBinding: 'Alt+2',   scope: 'global' },
  { action: 'nav_reports',           label: 'Go to Reports',      description: 'Navigate to Reports / Recent Sales',      defaultBinding: 'Alt+3',   scope: 'global' },
  { action: 'nav_accounts',          label: 'Go to Accounts',     description: 'Navigate to Accounts (manager only)',     defaultBinding: 'Alt+4',   scope: 'global' },
  { action: 'sales_focus_search',    label: 'Focus Search',       description: 'Move cursor to the product search bar',   defaultBinding: 'Ctrl+F',  scope: 'sales'  },
  { action: 'sales_process_payment', label: 'Process Payment',    description: 'Trigger the Process Payment action',      defaultBinding: 'F10',     scope: 'sales'  },
  { action: 'sales_clear_cart',      label: 'Clear Cart',         description: 'Clear all items from the cart',          defaultBinding: 'Escape',  scope: 'sales'  },
  { action: 'sales_remove_last',     label: 'Remove Last Item',   description: 'Remove the last added item from the cart', defaultBinding: 'Delete', scope: 'sales'  },
]
