// lib/db.ts
// MySQL bağlantı havuzu — tüm API route'ları bu modülü import eder.
// mysql2/promise kullanılır; Prisma veya Sequelize kullanılmaz.

import mysql from "mysql2/promise";

// Global singleton — Next.js hot-reload sırasında havuzun çoğalmasını önler
declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host:             process.env.DB_HOST     ?? "localhost",
    port:             Number(process.env.DB_PORT ?? 3306),
    user:             process.env.DB_USER     ?? "root",
    password:         process.env.DB_PASSWORD ?? "",
    database:         process.env.DB_NAME     ?? "diet_assistant",
    waitForConnections: true,
    connectionLimit:  10,
    queueLimit:       0,
    timezone:         "+00:00",
  });
}

// Development'ta modül yeniden yüklenince aynı pool'u kullan
const pool: mysql.Pool = global._mysqlPool ?? createPool();
if (process.env.NODE_ENV !== "production") global._mysqlPool = pool;

export default pool;
