const { getHumanDataService } = require('../service/service');

async function getHumanData(req, res) {
  const limit = req?.query?.limit || 50000;
  const lastId = req?.query?.lastId || 0;

  try {
    const humans = await getHumanDataService(limit, lastId);
    
    if (res) {
      // Nếu được gọi như API endpoint
      return res.json(humans);
    }
    // Nếu được gọi trực tiếp
    return humans.data;
    
  } catch (error) {
    console.error('Human Data Error:', error);
    if (res) {
      // Nếu được gọi như API endpoint
      return res.status(500).send('Lỗi khi truy vấn dữ liệu Human');
    }
    throw error;
  }
}

module.exports = { getHumanData };