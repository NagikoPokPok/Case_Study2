const express = require('express');
const cors = require('cors');
const db = require('./models'); // Sequelize (MySQL)
const { connectSqlServer } = require('./database/sqlServerConnection');

//route
const employeeRoute = require('./route/route');

const app = express();
app.use(cors()); // Cho phép truy cập từ FE

//use route
app.use('/api/employee', employeeRoute);

// API lấy dữ liệu employee
app.get('/api/employee', async (req, res) => {
  try {
      await sql.connect(config);
      const result = await sql.query('SELECT * FROM employee');
      res.json(result.recordset);
  } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi khi truy vấn dữ liệu');
  }
});



async function startApp() {
  try {
    await db.sequelize.authenticate(); // MySql
    console.log('✅ MySQL connected');

    await connectSqlServer(); // SQL Server

    app.listen(3000, () => {
      console.log('✅ Server đang chạy tại http://localhost:3000');
    });
  } catch (err) {
    console.error('🚨 Connection error:', err);
  }
}

startApp();
