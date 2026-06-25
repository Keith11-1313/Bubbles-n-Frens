use serde::Deserialize;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;
use std::time::Duration;
use tauri::Manager;

#[derive(Deserialize)]
struct SaleItemInput {
    product_id: i64,
    name: String,
    qty: i64,
    unit_price: f64,
    unit_cost: f64,
}

#[derive(Deserialize)]
struct SaleInput {
    ticket_code: String,
    subtotal: f64,
    tax: f64,
    discount: f64,
    total: f64,
    profit: f64,
    item_count: i64,
    user_id: i64,
    amount_paid: f64,
    change_given: f64,
    items: Vec<SaleItemInput>,
}

/// Records a sale + its line items and decrements stock inside a single SQLite
/// transaction, so a checkout can never half-record. Writes to the same
/// `bubbles.db` the SQL plugin uses (WAL mode → safe alongside the plugin).
#[tauri::command]
async fn process_sale(app: tauri::AppHandle, sale: SaleInput) -> Result<i64, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let db_path = dir.join("bubbles.db");
    let opts = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path.to_string_lossy()))
        .map_err(|e| e.to_string())?
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(opts)
        .await
        .map_err(|e| e.to_string())?;

    // The transaction rolls back automatically if any step errors (tx dropped
    // without commit), guaranteeing all-or-nothing.
    let result: Result<i64, sqlx::Error> = async {
        let mut tx = pool.begin().await?;

        let res = sqlx::query(
            "INSERT INTO sales (ticket_code, datetime, subtotal, tax, discount, total, profit, item_count, user_id, amount_paid, change_given) \
             VALUES (?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&sale.ticket_code)
        .bind(sale.subtotal)
        .bind(sale.tax)
        .bind(sale.discount)
        .bind(sale.total)
        .bind(sale.profit)
        .bind(sale.item_count)
        .bind(sale.user_id)
        .bind(sale.amount_paid)
        .bind(sale.change_given)
        .execute(&mut *tx)
        .await?;
        let sale_id = res.last_insert_rowid();

        for it in &sale.items {
            let line_total = it.unit_price * it.qty as f64;
            let line_profit = (it.unit_price - it.unit_cost) * it.qty as f64;
            sqlx::query(
                "INSERT INTO sale_items (sale_id, product_id, name_snapshot, qty, unit_price, unit_cost, line_total, line_profit) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(sale_id)
            .bind(it.product_id)
            .bind(&it.name)
            .bind(it.qty)
            .bind(it.unit_price)
            .bind(it.unit_cost)
            .bind(line_total)
            .bind(line_profit)
            .execute(&mut *tx)
            .await?;

            sqlx::query("UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(it.qty)
                .bind(it.product_id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;
        Ok(sale_id)
    }
    .await;

    pool.close().await;
    result.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![process_sale])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
