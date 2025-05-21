const { getHumanDataService, updateInfoService } = require('../service/service');
const { sendMessage } = require('../utils/rabbitProducer');
const { getHumans } = require('../utils/dataStore');


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

    // const idx = Humans.findIndex(h => h.Employee_Id === humanData.Employee_Id);
    // if (idx >= 0) {
    //   Humans[idx] = { ...Humans[idx], ...humanData };
    // } else {
    //   Humans.push(humanData);
    // }

    // console.log('humanData:', humanData);

    await sendMessage('personal_changes', { Employee_ID: humanData.Employee_Id, Operation: 'Update' , data: humanData});

    res.json({ success: true, message: 'Cập nhật thành công (chỉ bộ nhớ)' });
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật dữ liệu' });
  }
}

// Thêm nhân viên
async function addEmployee(req, res) {
  try {
    const humanData = req.body;
    if (!humanData || !humanData.Employee_Id) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ hoặc thiếu Employee_Id' });
    }

    // Thêm vào bộ nhớ cục bộ trước (nếu có)
    const humans = getHumans();
    const exists = humans.some(h => h.Employee_Id === humanData.Employee_Id);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Nhân viên đã tồn tại' });
    }
    humans.push(humanData);

    // Gửi message lên RabbitMQ để các hệ thống khác xử lý
    await sendMessage('personal_changes', {
      Employee_ID: humanData.Employee_Id,
      Operation: 'Add',
      data: humanData
    });

    return res.json({ success: true, message: 'Thêm nhân viên thành công' });

    // res.json({ success: true, message: 'Thêm nhân viên thành công' });
  } catch (error) {
    console.error('Add failed:', error);
    res.status(500).json({ success: false, message: 'Lỗi thêm nhân viên' });
  }
}

// Xóa nhân viên
async function deleteEmployee(req, res) {
  try {
    const employeeId = req.params.id;

    // TODO: Xóa khỏi DB hoặc bộ nhớ (nếu có)

    await sendMessage('personal_changes', { 
      Employee_ID: employeeId, 
      Operation: 'Delete' 
    });

    res.json({ success: true, message: 'Xóa nhân viên thành công' });
  } catch (error) {
    console.error('Delete failed:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa nhân viên' });
  }
}



module.exports = { getHumanData, updateEmployee, addEmployee, deleteEmployee };