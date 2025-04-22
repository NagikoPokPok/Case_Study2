// services/employeeService.js
const { sequelizeMySQL, sequelizeSQLServer } = require('../database/sequelizeConnection');
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
