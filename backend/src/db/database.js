const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enquetes',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

async function runMigrations() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await conn.execute('SELECT filename FROM migrations ORDER BY filename');
    const applied = new Set(rows.map((r) => r.filename));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`[migration] Application : ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const statements = sql
        .replace(/--[^\n]*/g, '')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const stmt of statements) {
        await conn.execute(stmt);
      }
      await conn.execute('INSERT INTO migrations (filename) VALUES (?)', [file]);
      console.log(`[migration] Appliquée : ${file}`);
    }
  } finally {
    conn.release();
  }
}

module.exports = { pool, runMigrations };
