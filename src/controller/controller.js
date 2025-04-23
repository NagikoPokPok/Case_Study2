// controllers/employeeController.js
const { 
  getEmployeesFromMySQLService, 
  getEmployeesFromSQLServerService, 
  getPersonalFromSQLServerService,
  getBenefitPlanById,
  getPayRateById,
  getEmploymentById,
  getJobHistoryById
} = require('../service/service');


async function getHumanData(req, res) {
  const limit = parseInt(req.query.limit) || 1000;  // Số dòng mỗi trang
  const lastId = parseInt(req.query.lastId) || 0;

  try {
      const humans = await getHumanDataService(limit, lastId);
      res.json(humans);
  } catch (error) {
      console.error('Human Data Error:', error);
      res.status(500).send('Lỗi khi truy vấn dữ liệu Human');
  }
}

async function getEmployeeSummary(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const personalData = await getPersonalFromSQLServerService(limit, offset);
    const employeeData = await getEmployeesFromMySQLService();

    const result = [];

    for (const personal of personalData) {
      const employee = employeeData.find(emp => emp.idEmployee === personal.Employee_ID);
      if (employee) {
        const payRate = await getPayRateById(employee.PayRates_id);
        const benefitPlan = await getBenefitPlanById(personal.Benefit_Plans);
        const jobHistory = await getJobHistoryById(personal.Employee_ID);
        const employment = await getEmploymentById(personal.Employee_ID);

        const earnings = payRate ? payRate.Pay_Amount * (payRate.Tax_Percentage / 100) : 0;
        const vacationDays = employee.Vacation_Days || 0;
        const benefit = benefitPlan ? benefitPlan.Deductable * (benefitPlan.Percentage_CoPay / 100) : 0;

        let Human = {
          Employee_ID: personal.Employee_ID,
          ShareHolder: personal.Shareholder_Status,
          Gender: personal.Gender,
          Ethnicity: personal.Ethnicity,
          Employment_Status: employment.Employment_Status,
          Department: jobHistory.Department,
          Total_Earnings: earnings,
          Total_Vacation_Days: vacationDays,
          Average_Benefit: benefit,
          Pay_Amount: payRate?.Pay_Amount,
          Tax_Percentage: payRate?.Tax_Percentage,
          Deductible: benefitPlan?.Deductable,
          Percentage_CoPay: benefitPlan?.Percentage_CoPay
        }

        result.push({
          Employee_ID: personal.Employee_ID,
          First_Name: personal.First_Name,
          ShareHolder: personal.Shareholder_Status,
          Gender: personal.Gender,
          Ethnicity: personal.Ethnicity,
          Employment_Status: employment.Employment_Status,
          Department: jobHistory.Department,
          Total_Earnings: earnings,
          Total_Vacation_Days: vacationDays,
          Average_Benefit: benefit,
          Pay_Amount: payRate?.Pay_Amount,
          Tax_Percentage: payRate?.Tax_Percentage,
          Deductible: benefitPlan?.Deductable,
          Percentage_CoPay: benefitPlan?.Percentage_CoPay
        });
        console.log(result);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi tính toán:', error);
    res.status(500).send('Lỗi khi tính toán dữ liệu');
  }
}

module.exports = { getEmployeesFromMySQL, getEmployeesFromSQLServer, getPersonalFromSQLServer, getEmployeeSummary };
