// services/employeeService.js
const { sequelizeMySQL, sequelizeSQLServer } = require('../database/sequelizeConnection');
const Employee = require('../models/Employee')(sequelizeMySQL, require('sequelize').DataTypes); // MySQL model
const Personal = require('../models/Personal')(sequelizeSQLServer, require('sequelize').DataTypes); // SQL Server model

// Lấy dữ liệu từ MySQL
async function getEmployeesFromMySQLService() {
  await sequelizeMySQL.authenticate();
  return await Employee.findAll();
}

// Lấy dữ liệu từ SQL Server
async function getEmployeesFromSQLServerService() {
  await sequelizeSQLServer.authenticate();
  return await Employee.findAll({ sequelize: sequelizeSQLServer });
}

// Lấy dữ liệu từ SQL Server (cho Personal)
async function getPersonalFromSQLServerService(limit, offset) {
  await sequelizeSQLServer.authenticate();
  return await Personal.findAll({ 
    limit: limit,
    offset: offset,
    sequelize: sequelizeSQLServer 
  });
}

module.exports = { getEmployeesFromMySQLService, getEmployeesFromSQLServerService, getPersonalFromSQLServerService };
