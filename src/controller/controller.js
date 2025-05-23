const { getHumanDataService, updateInfoService } = require('../service/service');
const { sendMessage } = require('../utils/rabbitProducer');
const { getHumans } = require('../utils/dataStore');
const Pay_Rate = require('../models/Pay_Rate');

const EXCHANGE_NAME = 'person-events-exchange';
const SENDER_ID = 'myapp'; // Mã định danh hệ thống gửi để consumer khác lọc

async function getHumanData(req, res) {
  const limit = parseInt(req.query.limit) || 50000;  // Số dòng mỗi trang
  const lastId = parseInt(req.query.lastId) || 0;

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

    await Promise.all([
      sendMessage(EXCHANGE_NAME, 'dashboard.person.update', {
        senderId: SENDER_ID,
        Employee_ID: humanData.Employee_Id,
        Operation: 'Update',
        First_Name: humanData.First_Name,
        Last_Name: humanData.Last_Name,
        Shareholder_Status: humanData.ShareHolder,
        Gender: humanData.Gender,
        Ethnicity: humanData.Ethnicity,
        Employment_Status: humanData.Employment_Status,
        Department: humanData.Department,
        Vacation_Days: humanData.Vacation_Days,
        Paid_To_Date: humanData.Paid_To_Date,
        Paid_Last_Year: humanData.Paid_Last_Year,
        Benefit_Plan: humanData.Benefit_Plan,
        PayRates_id: humanData.PayRates_id,
        Pay_Amount: humanData.Pay_Amount,
        Tax_Percentage: humanData.Tax_Percentage
      })
    ]);

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

    await Promise.all([
      sendMessage(EXCHANGE_NAME, 'dashboard.person.create', {
        senderId: SENDER_ID,
        Employee_ID: humanData.Employee_Id,
        Operation: 'Create',
        First_Name: humanData.First_Name,
        Last_Name: humanData.Last_Name,
        Shareholder_Status: humanData.ShareHolder,
        Gender: humanData.Gender,
        Ethnicity: humanData.Ethnicity,
        Employment_Status: humanData.Employment_Status,
        Department: humanData.Department,
        Vacation_Days: humanData.Vacation_Days,
        Paid_To_Date: humanData.Paid_To_Date,
        Paid_Last_Year: humanData.Paid_Last_Year,
        Benefit_Plan: humanData.Benefit_Plan,
        PayRates_id: humanData.PayRates_id,
        Pay_Amount: humanData.Pay_Amount,
        Tax_Percentage: humanData.Tax_Percentage
      })
    ]);


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

    if (!employeeId) {
          return res.status(400).json({ success: false, message: 'Thiếu employeeId để xóa' });
        }

    const empIdNum = Number(employeeId);
    const humans = getHumans();

    // Tìm index nhân viên trong bộ nhớ
    const idx = humans.findIndex(h => h.Employee_Id === empIdNum);

    if (idx >= 0) {
      // Xóa khỏi bộ nhớ
      humans.splice(idx, 1);
      console.log(`Deleted employee with ID ${empIdNum} from memory`);
    } else {
      console.log(`Employee ID ${empIdNum} không tồn tại trong bộ nhớ để xóa`);
      return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại để xóa' });
    }

    await Promise.all([
      sendMessage(EXCHANGE_NAME, 'dashboard.person.delete', {
        senderId: SENDER_ID,
        Employee_ID: empIdNum,
        Operation: 'Delete'
      })
    ]);


    return res.json({ success: true, message: 'Xóa nhân viên thành công' });

  } catch (error) {
    console.error('Delete failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xóa nhân viên' });
  }
}



module.exports = { getHumanData, updateEmployee, addEmployee, deleteEmployee };