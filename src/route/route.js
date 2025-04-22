// routes/employeeRoute.js
const express = require('express');
const { getEmployeesFromMySQL, getEmployeesFromSQLServer, getPersonalFromSQLServer } = require('../controller/controller');
const router = express.Router();

// API lấy dữ liệu employee từ MySQL
router.get('/mysql', getEmployeesFromMySQL);

// API lấy dữ liệu employee từ SQL Server
router.get('/sqlserver', getEmployeesFromSQLServer);

// Route cho SQL Server (Personal)
router.get('/personal/sqlserver', getPersonalFromSQLServer);

module.exports = router;
