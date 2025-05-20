const { sequelizeMySQL, sequelizeSQLServer } = require('../database/sequelizeConnection');
const Employee = require('../models/Employee')(sequelizeMySQL, require('sequelize').DataTypes);
const Personal = require('../models/Personal')(sequelizeSQLServer, require('sequelize').DataTypes);
const BenefitPlans = require('../models/Benefit_Plan')(sequelizeSQLServer, require('sequelize').DataTypes);
const PayRate = require('../models/Pay_Rate')(sequelizeMySQL, require('sequelize').DataTypes);
const Human = require('../models/Human');
const Employment = require('../models/Employment')(sequelizeSQLServer, require('sequelize').DataTypes);
const JobHistory = require('../models/Job_History')(sequelizeSQLServer, require('sequelize').DataTypes);

// Setup associations
Employee.associate({ Pay_Rate: PayRate });

const sqlServerModels = {
    Benefit_Plans: BenefitPlans,
    Employment: Employment,
    Job_History: JobHistory
};

// Setup associations cho Personal
Personal.associate(sqlServerModels);

async function getHumanDataService(limit = 50000, lastId = 0) {
  const startTime = Date.now();
    try {
        // 1. Lấy dữ liệu employee từ MySQL
        const [employeeData] = await Promise.all([
          Employee.findAll({
              where: {
                  idEmployee: {
                      [sequelizeMySQL.Sequelize.Op.gt]: lastId
                  }
              },
              include: [{
                  model: PayRate,
                  attributes: ['Pay_Amount', 'Tax_Percentage']
              }],
              limit,
              order: [['idEmployee', 'ASC']],
              raw: true,
              nest: true
          })
      ]);

        if (employeeData.length === 0) {
            return {
                data: [],
                nextLastId: lastId,
                hasMore: false
            };
        }

        

        // 2. Lấy personal data và benefit plans từ SQL Server
        const personalData = await Personal.findAll({
            where: {
                Employee_ID: {
                    [sequelizeSQLServer.Sequelize.Op.gt]: lastId,
                    [sequelizeSQLServer.Sequelize.Op.lte]: employeeData[employeeData.length - 1].idEmployee
                }
            },
            include: [{
                model: BenefitPlans,
                as: 'BenefitPlan',
                attributes: ['Benefit_Plan_ID', 'Deductable', 'Percentage_CoPay'],
                required: false
            }, {
                model: Employment,
                attributes: ['Employment_status'],
                required: false
            }, {
                model: JobHistory,
                as: 'JobHistory',  // Thêm alias
                attributes: ['Department'],
                required: false,
                order: [['id', 'DESC']], 
                limit: 1,
                separate: false  // Đổi thành false
            }],
            order: [['Employee_ID', 'ASC']],
            raw: true,
            nest: true,
        });

        // 3. Xử lý data
        const humans = [];
        let currentIdx = 0;
        const batchSize = 5000;

        while (currentIdx < personalData.length) {
          const batch = personalData.slice(currentIdx, currentIdx + batchSize);
          
          for (const person of batch) {
            const employee = employeeData.find(emp => emp.idEmployee === person.Employee_ID);
            const employees = employeeData.find(emp => emp.idEmployee) | null;
            const persons = personalData.find(emp => emp.Employee_ID) | null;

            if (employees && persons) {
                if (employees.idEmployee ===  persons.Employee_ID) {
                    // Sử dụng BenefitPlan thay vì Benefit_Plans
                    const avgBenefit = person.BenefitPlan && 
                        typeof person.BenefitPlan.Deductable === 'number' && 
                        typeof person.BenefitPlan.Percentage_CoPay === 'number' ? 
                        (person.BenefitPlan.Deductable * (100 - person.BenefitPlan.Percentage_CoPay)) / 100 : 0;
            

                    humans.push(new Human({
                        Employee_Id: person.Employee_ID,
                        ShareHolder: person.Shareholder_Status,
                        Gender: person.Gender,
                        Ethnicity: person.Ethnicity,
                        Employment_Status: person.Employment?.Employment_status || 'Not Specified',
                        Department: person.JobHistory?.Department || 'Not Specified',
                        Paid_To_Date: employees.Paid_To_Date || 0,
                        Paid_Last_Year: employees.Paid_Last_Year || 0,
                        Vacation_Days: employees.Vacation_Days || 0,
                        Benefit_Plan: person.BenefitPlan?.Benefit_Plan_ID,
                        Average_Plan_Benefit: avgBenefit,
                        Pay_Amount: employees.Pay_Rate?.Pay_Amount || 0,
                        Tax_Percentage: employees.Pay_Rate?.Tax_Percentage || 0
                    }));
                }
                
            }
            else if (person) {
                // Sử dụng BenefitPlan thay vì Benefit_Plans
                const avgBenefit = person.BenefitPlan && 
                    typeof person.BenefitPlan.Deductable === 'number' && 
                    typeof person.BenefitPlan.Percentage_CoPay === 'number' ? 
                    (person.BenefitPlan.Deductable * (100 - person.BenefitPlan.Percentage_CoPay)) / 100 : 0;
                
                humans.push(new Human({
                      Employee_Id: person.Employee_ID,
                      ShareHolder: person.Shareholder_Status,
                      Gender: person.Gender,
                      Ethnicity: person.Ethnicity,
                      Employment_Status: person.Employment?.Employment_status || 'Not Specified',
                      Department: person.JobHistory?.Department || 'Not Specified',
                      Benefit_Plan: person.BenefitPlan?.Benefit_Plan_ID,
                      Average_Plan_Benefit: avgBenefit,
                }));
            }

            

            // if (employee) {
            //     // Sử dụng BenefitPlan thay vì Benefit_Plans
            //     const avgBenefit = person.BenefitPlan && 
            //         typeof person.BenefitPlan.Deductable === 'number' && 
            //         typeof person.BenefitPlan.Percentage_CoPay === 'number' ? 
            //         (person.BenefitPlan.Deductable * (100 - person.BenefitPlan.Percentage_CoPay)) / 100 : 0;
        

            //       humans.push(new Human({
            //           Employee_Id: person.Employee_ID,
            //           ShareHolder: person.Shareholder_Status,
            //           Gender: person.Gender,
            //           Ethnicity: person.Ethnicity,
            //           Employment_Status: person.Employment?.Employment_status || 'Not Specified',
            //           Department: person.JobHistory?.Department || 'Not Specified',
            //           Paid_To_Date: employee.Paid_To_Date || 0,
            //           Paid_Last_Year: employee.Paid_Last_Year || 0,
            //           Vacation_Days: employee.Vacation_Days || 0,
            //           Benefit_Plan: person.BenefitPlan?.Benefit_Plan_ID,
            //           Average_Plan_Benefit: avgBenefit,
            //           Pay_Amount: employee.Pay_Rate?.Pay_Amount || 0,
            //           Tax_Percentage: employee.Pay_Rate?.Tax_Percentage || 0
            //       }));
            //   }
            
          }

        //   // 2. Thêm các Employee không có Personal
        //     for (const emp of employeeData) {
        //         if (!matchedIds.has(emp.idEmployee)) {
        //             humans.push(new Human({
        //             Employee_Id: emp.idEmployee,
        //             Paid_To_Date: emp.Paid_To_Date || 0,
        //             Paid_Last_Year: emp.Paid_Last_Year || 0,
        //             Vacation_Days: emp.Vacation_Days || 0,
        //             Pay_Amount: emp.Pay_Rate?.Pay_Amount || 0,
        //             Tax_Percentage: emp.Pay_Rate?.Tax_Percentage || 0
        //             }));
        //         }
        
        // === Thêm employee không tồn tại trong Personal ===
            const personalIds = new Set(personalData.map(p => p.Employee_ID));

            for (const emp of employeeData) {
            if (!personalIds.has(emp.idEmployee)) {
                humans.push(new Human({
                Employee_Id: emp.idEmployee,
                Paid_To_Date: emp.Paid_To_Date || 0,
                Paid_Last_Year: emp.Paid_Last_Year || 0,
                Vacation_Days: emp.Vacation_Days || 0,
                Pay_Amount: emp.Pay_Rate?.Pay_Amount || 0,
                Tax_Percentage: emp.Pay_Rate?.Tax_Percentage || 0
                }));
            }
            }

            currentIdx += batchSize;
            if (currentIdx % (batchSize * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return {
            data: humans,
            nextLastId: employeeData[employeeData.length - 1].idEmployee,
            hasMore: employeeData.length === limit,
            stats: {
                queryTime: Date.now() - startTime,
                recordCount: humans.length
            }
        };
    } catch (error) {
        console.error('Error in getHumanDataService:', error);
        throw error;
    }
}
module.exports = {  getHumanDataService };
