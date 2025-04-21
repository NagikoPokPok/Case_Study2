const db = require('./models'); // Sequelize (MySQL)
const { connectSqlServer } = require('./database/sqlServerConnection');

async function startApp() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ MySQL connected');

    await connectSqlServer(); // SQL Server
  } catch (err) {
    console.error('🚨 Connection error:', err);
  }
}

startApp();
