// service/employeeStatsService.js

const { Human } = require("../models");

// Hàm tính tổng department và phân loại theo tên department
function calculateTotalDepartments(humans) {
    const departmentCount = {
      'Sell Department': 0,
      'Marketing': 0,
      'HR': 0,
      'Payroll': 0,
      'Accounting': 0
    };
  
    humans.forEach(human => {
      if (departmentCount[human.Department] !== undefined) {
        departmentCount[human.Department] += human.Total_Earning;  // Tăng số lượng cho department
      }
    });
  
    return departmentCount;  // Trả về đối tượng đếm tổng cho từng department
  }
  
  // Hàm tính tổng gender
  function calculateTotalGender(humans) {
    const totalGender = { male: 0, female: 0 };
    
    humans.forEach(human => {
     
      
      if (human.Gender === true) totalGender.male += human.Total_Earning;
      if (human.Gender === false) totalGender.female += human.Total_Earning;
    });
    
    return totalGender;
  }
  
  // Hàm tính tổng shareholder
  function calculateTotalShareholder(humans) {
    const totalShareholder = { yes: 0, no: 0 };
    humans.forEach(employee => {
      if (employee.ShareHolder === true) totalShareholder.yes += human.Total_Earning;
      if (employee.ShareHolder === false) totalShareholder.no += human.Total_Earning;
    });
    return totalShareholder;
  }
  
 // Hàm tính tổng ethnicity và phân loại theo từng ethnicity
function calculateTotalEthnicity(humans) {
    const ethnicityCount = {
      'Asian': 0,
      'Black': 0,
      'White': 0,
      'Hispanic': 0,
      'Others': 0
    };
  
    humans.forEach(employee => {
      if (ethnicityCount[employee.Ethnicity] !== undefined) {
        ethnicityCount[employee.Ethnicity]++;  // Tăng số lượng cho ethnicity
      }
    });
  
    return ethnicityCount;  // Trả về đối tượng đếm tổng cho từng ethnicity
  }

  // Hàm tính tổng số employee phân loại theo Full-time và Part-time
function calculateTotalEmployee(humans) {
    const totalEmployee = { fullTime: 0, partTime: 0 };
    humans.forEach(employee => {
      if (employee.Employment_Status === 'Full-time') totalEmployee.fullTime++;
      if (employee.Employment_Status === 'Part-time') totalEmployee.partTime++;
    });
    return totalEmployee;
  }
  
  
  module.exports = {
    calculateTotalDepartments,
    calculateTotalGender,
    calculateTotalShareholder,
    calculateTotalEthnicity,
    calculateTotalEmployee
  };
  