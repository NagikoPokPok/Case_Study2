const { Sequelize, DataTypes } = require('sequelize');

// Định nghĩa kết nối với MySQL
const sequelizeMySQL = new Sequelize('mysql://root:Nghiaprovn123@localhost:3306/payroll');

// Định nghĩa kết nối với SQL Server
const sequelizeSQLServer = new Sequelize({
    dialect: 'mssql',
    host: 'localhost',
    username: 'sa', 
    password: 'a123456*',
    database: 'HR',
    port: 49853,
    dialectOptions: {
        encrypt: false, // Cần phải bật 'false' nếu không dùng SSL
      }
});

// Export model
module.exports = { sequelizeMySQL, sequelizeSQLServer };