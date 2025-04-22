// services/employeeService.js
const { sequelizeMySQL, sequelizeSQLServer } = require('../database/sequelizeConnection');
const Benefit_Plan = require('../models/Benefit_Plan');
const Employee = require('../models/Employee')(sequelizeMySQL, require('sequelize').DataTypes); // MySQL model
const Personal = require('../models/Personal')(sequelizeSQLServer, require('sequelize').DataTypes); // SQL Server model
const PayRate = require('../models/Pay_Rate')(sequelizeMySQL, require('sequelize').DataTypes); // MySQL model
const BenefitPlan = require('../models/Benefit_Plan')(sequelizeSQLServer, require('sequelize').DataTypes); // SQL Server model
const Employment = require('../models/Employment')(sequelizeSQLServer, require('sequelize').DataTypes); // SQL Server model
const JobHistory = require('../models/Job_History')(sequelizeSQLServer, require('sequelize').DataTypes); // SQL Server model

// Lấy dữ liệu từ MySQL
async function getEmployeesFromMySQLService() {
  await sequelizeMySQL.authenticate();
  return await Employee.findAll({
    limit: 100,
    offset: 0,
  });
}

// Lấy dữ liệu từ SQL Server
async function getEmployeesFromSQLServerService() {
  await sequelizeSQLServer.authenticate();
  return await Employee.findAll({ 
    limit: 100,
    offset: 0,
    sequelize: sequelizeSQLServer 
  });
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

async function getPayRateById(id) {
  return await PayRate.findOne({ where: { idPay_Rates: id } });
}

async function getBenefitPlanById(id) {
  return await BenefitPlan.findOne({ where: { Benefit_Plan_ID: id } });
}

async function getJobHistoryById(id) {
  return await JobHistory.findOne({ where: { Employee_ID: id } });
}

async function getEmploymentById(id) {
  return await Employment.findOne({ where: { Employee_ID: id } });
}

module.exports = { 
  getEmployeesFromMySQLService, 
  getEmployeesFromSQLServerService, 
  getPersonalFromSQLServerService,
  getBenefitPlanById,
  getPayRateById,
  getJobHistoryById,
  getEmploymentById 
};
