// services/employeeService.js
const { sequelizeMySQL, sequelizeSQLServer } = require('../database/sequelizeConnection');
const Benefit_Plan = require('../models/Benefit_Plan');
const Employee = require('../models/Employee')(sequelizeMySQL, require('sequelize').DataTypes); // MySQL model
const Personal = require('../models/Personal')(sequelizeSQLServer, require('sequelize').DataTypes); // SQL Server model
const Human = require('../models/Human');

async function getHumanDataService(limit = 1000, lastId = 0) {
  try {
      // 1. Lấy dữ liệu từ MySQL với cursor-based pagination
      const employeeData = await Employee.findAll({
          where: {
              idEmployee: {
                  [sequelizeMySQL.Sequelize.Op.gt]: lastId
              }
          },
          limit,
          order: [['idEmployee', 'ASC']],
          raw: true
      });

      if (employeeData.length === 0) {
          return {
              data: [],
              nextLastId: lastId,
              hasMore: false
          };
      }

      // 2. Lấy dữ liệu từ SQL Server cho batch hiện tại
      const personalData = await Personal.findAll({
          where: {
              Employee_ID: {
                  [sequelizeSQLServer.Sequelize.Op.gt]: lastId,
                  [sequelizeSQLServer.Sequelize.Op.lte]: employeeData[employeeData.length - 1].idEmployee
              }
          },
          order: [['Employee_ID', 'ASC']],
          raw: true
      });

      // 3. Xử lý theo batch để tránh memory overflow
      const humans = [];
      let currentIdx = 0;
      const batchSize = 100;

      while (currentIdx < personalData.length) {
          const batch = personalData.slice(currentIdx, currentIdx + batchSize);
          
          for (const person of batch) {
              const employee = employeeData.find(emp => emp.idEmployee === person.Employee_ID);
              if (employee) {
                  humans.push(new Human({
                      Employee_Id: person.Employee_ID,
                      ShareHolder: person.Shareholder_Status,
                      Gender: person.Gender,
                      Ethnicity: person.Ethnicity,
                      Employment_Status: person.Employment_Status,
                      Department: person.Department,
                      Paid_To_Date: employee.Paid_To_Date || 0,
                      Paid_Last_Year: employee.Paid_Last_Year || 0,
                      Vacation_Days: employee.Vacation_Days || 0,
                      Benefit_Plan: person.Benefit_Plans
                  }));
              }
          }

          currentIdx += batchSize;
          // Cho GC có cơ hội thu hồi bộ nhớ
          if (currentIdx % (batchSize * 10) === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
          }
      }

      return {
          data: humans,
          nextLastId: employeeData[employeeData.length - 1].idEmployee,
          hasMore: employeeData.length === limit
      };
  } catch (error) {
      console.error('Error in getHumanDataService:', error);
      throw error;
  }
}

module.exports = {  getHumanDataService };
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
