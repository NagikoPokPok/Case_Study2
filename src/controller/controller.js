const { getHumanDataService, updateInfoService } = require('../service/service');
const { sendMessage } = require('../utils/rabbitProducer');
const { getHumans } = require('../server');


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

async function updateEmployee(req, res) {
  const Humans = getHumans();
  try {
    const humanData = req.body;

    const idx = Humans.findIndex(h => h.Employee_Id === humanData.Employee_Id);
    if (idx >= 0) {
      Humans[idx] = { ...Humans[idx], ...humanData };
    } else {
      Humans.push(humanData);
    }

    await sendMessage('personal_changes', { employeeId: humanData.Employee_Id, action: 'update' });

    res.json({ success: true, message: 'Cập nhật thành công (chỉ bộ nhớ)' });
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật dữ liệu' });
  }
}


module.exports = { getHumanData, updateEmployee };