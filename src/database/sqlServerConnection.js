const sql = require('mssql');

const sqlConfig = {
  user: 'sa',
  password: 'a123456*',
  database: 'HR',
  server: 'localhost',
  port: 1434,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: false, // True nếu bạn dùng Azure hoặc SSL
    trustServerCertificate: true
  }
};

async function connectSqlServer() {
  try {
    await sql.connect(sqlConfig);
    console.log("✅ SQL Server connected");
  } catch (err) {
    console.error("❌ SQL Server connection failed: ", err);
  }
}

module.exports = { sql, connectSqlServer };
