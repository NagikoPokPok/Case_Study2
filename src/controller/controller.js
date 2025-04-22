// controllers/employeeController.js
const { getEmployeesFromMySQLService, getEmployeesFromSQLServerService, getPersonalFromSQLServerService} = require('../service/service');

// Lấy dữ liệu từ MySQL
async function getEmployeesFromMySQL(req, res) {
  try {
    const employees = await getEmployeesFromMySQLService();
    res.json(employees);
  } catch (error) {
    console.error('Lỗi MySQL:', error);
    res.status(500).send('Lỗi khi truy vấn dữ liệu MySQL');
  }
}

// Lấy dữ liệu từ SQL Server
async function getEmployeesFromSQLServer(req, res) {
  try {
    const employees = await getEmployeesFromSQLServerService();
    res.json(employees);
  } catch (error) {
    console.error('Lỗi SQL Server:', error);
    res.status(500).send('Lỗi khi truy vấn dữ liệu SQL Server');
  }
}

// Lấy dữ liệu từ SQL Server (Personal)
async function getPersonalFromSQLServer(req, res) {

  const limit = parseInt(req.query.limit) || 1000;  // Số dòng mỗi trang
  const offset = parseInt(req.query.offset) || 0;  // Vị trí bắt đầu

  try {
    const personalData = await getPersonalFromSQLServerService(limit, offset);
    res.json(personalData);
  } catch (error) {
    console.error('Lỗi SQL Server:', error);
    res.status(500).send('Lỗi khi truy vấn dữ liệu Personal từ SQL Server');
  }
}

module.exports = { getEmployeesFromMySQL, getEmployeesFromSQLServer, getPersonalFromSQLServer };
