// controller/employeeStatsController.js

const {
    calculateTotalDepartments,
    calculateTotalGender,
    calculateTotalShareholder,
    calculateTotalEthnicity,
    calculateTotalEmployee
  } = require('../service/employeeStatsService');
  
  
  
  // API tính toán thống kê cho các nhóm từ Humans
  async function getEmployeeStats(req, res) {
    if (!Humans) {
      return res.status(404).send('Humans data not available');
    }
  
    try {
      const totalDepartment = calculateTotalDepartments(Humans);
      const totalGender = calculateTotalGender(Humans);
      const totalShareholder = calculateTotalShareholder(Humans);
      const totalEthnicity = calculateTotalEthnicity(Humans);
      const totalEmployee = calculateTotalEmployee(Humans);
  
      const stats = {
        totalDepartment,
        totalGender,
        totalEmployee,
        totalShareholder,
        totalEthnicity
      };
  
      res.json(stats);  // Trả kết quả cho client
    } catch (error) {
      console.error('Lỗi khi tính toán:', error);
      res.status(500).send('Lỗi khi tính toán dữ liệu');
    }
  }
  
  module.exports = { getEmployeeStats };
  