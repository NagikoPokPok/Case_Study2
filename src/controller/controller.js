// controllers/employeeController.js
const { 
  getHumanDataService  
} = require('../service/service');


async function getHumanData(req, res) {
  const limit = parseInt(req.query.limit) || 50000;  // Số dòng mỗi trang
  const lastId = parseInt(req.query.lastId) || 0;

  try {
      const humans = await getHumanDataService(limit, lastId);
      res.json(humans);
  } catch (error) {
      console.error('Human Data Error:', error);
      res.status(500).send('Lỗi khi truy vấn dữ liệu Human');
  }
}

module.exports = {  getHumanData };
