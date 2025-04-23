const express = require('express');
const cors = require('cors');
const db = require('./models'); // Sequelize (MySQL)
const { connectSqlServer } = require('./database/sqlServerConnection');
const { getHumanData } = require('./controller/controller');  // Import controller

//route
const route = require('./route/route');

//Human merge
let Humans;

const app = express();
app.use(cors()); // Cho phép truy cập từ FE

//use route
app.use('/api/route', route);


// Định nghĩa API trả về dữ liệu này
app.get('/api/humanList', (req, res) => {
  res.json(Humans); // Trả về mảng dữ liệu dưới dạng JSON
});

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

// Hàm gọi API tính toán khi server chạy lần đầu
async function calculateOnServerStart() {
  try {
    // Lấy dữ liệu tóm tắt nhân viên và tính toán ngay khi server khởi động
    Humans = await getHumanData({ query: { limit: 5000, offset: 0 } }, { json: console.log });  // Trả về kết quả tính toán ngay
  } catch (err) {
    console.error('🚨 Error while calculating data on server start:', err);
  }
}

async function startApp() {
  try {
    await db.sequelize.authenticate(); // MySql
    console.log('✅ MySQL connected');

    await connectSqlServer(); // SQL Server

    // Gọi hàm tính toán khi server khởi động
    await calculateOnServerStart();  // Tính toán ngay khi server bắt đầu chạy

    console.log(Humans);

    app.listen(3000, () => {
      console.log('✅ Server đang chạy tại http://localhost:3000');
    });
  } catch (err) {
    console.error('🚨 Connection error:', err);
  }
}

startApp();
