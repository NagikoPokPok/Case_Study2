// routes/employeeRoute.js
const express = require('express');
const { 
    getHumanData 
} = require('../controller/controller');
const router = express.Router();

// // API lấy dữ liệu employee từ MySQL
// router.get('/mysql', getEmployeesFromMySQL);

// // API lấy dữ liệu employee từ SQL Server
// router.get('/sqlserver', getEmployeesFromSQLServer);

router.get('/human', getHumanData);

// Route cho SQL Server (Personal)
// router.get('/personal/sqlserver', getPersonalFromSQLServer);

module.exports = router;
