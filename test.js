
let humans = [];

// Mở popup
document.getElementById('btnOpenPopup').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('popupForm').style.display = 'flex';
});

// Đóng popup
document.getElementById('btnClosePopup').addEventListener('click', function() {
  document.getElementById('popupForm').style.display = 'none';
});

// // Xử lý submit form (hiện chỉ preventDefault)
// document.getElementById('employeeForm').addEventListener('submit', function(e) {
//   e.preventDefault();
//   //add du lieu ơ day
  
//   // Đóng popup sau submit
//   document.getElementById('popupForm').style.display = 'none';
// });



async function fetchHumanData() {
   let allData = [];
    let lastId = 0;
    let hasMore = true;

    // while (hasMore) {
        
    // }
    try {
        const response = await fetch(`http://localhost:3000/api/humanList`);
        
        const result = await response.json();
        allData = (result);
        
        if (result.data && result.data.length > 0) {
            allData = allData.concat(result.data);
            lastId = result.nextLastId;
            hasMore = result.hasMore;
        } else {
            hasMore = false;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        // break;
    }
    return allData;
}

function getFormData() {
  return {
    Employee_Id: document.getElementById('Employee_Id').value.trim(),
    ShareHolder: document.getElementById('ShareHolder').value.trim(),
    Gender: document.getElementById('Gender').value,
    Ethnicity: document.getElementById('Ethnicity').value.trim(),
    Employment_Status: document.getElementById('Employment_Status').value.trim(),
    Department: document.getElementById('Department').value.trim(),
    Paid_To_Date: parseFloat(document.getElementById('Paid_To_Date').value) || 0,
    Paid_Last_Year: parseFloat(document.getElementById('Paid_Last_Year').value) || 0,
    Vacation_Days: parseInt(document.getElementById('Vacation_Days').value) || 0,
    Benefit_Plan: document.getElementById('Benefit_Plan').value.trim(),
    Average_Plan_Benefit: parseFloat(document.getElementById('Average_Plan_Benefit').value) || 0,
    Pay_Amount: parseFloat(document.getElementById('Pay_Amount').value) || 0,
    Tax_Percentage: parseFloat(document.getElementById('Tax_Percentage').value) || 0
  };
}

async function fetchAndDisplayHumans() {
  humans = await fetchHumanData();;


  const tbody = document.querySelector('tbody');
  tbody.innerHTML = ''; // Xóa dữ liệu cũ
  console.log('humans', humans[0]);

  for(let i=0; i<20; i++){
  const human = humans[i];
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${human.Employee_Id}</td>
    <td>${human.ShareHolder}</td>
    <td>${human.Gender}</td>
    <td>${human.Ethnicity}</td>
    <td>${human.Employment_Status}</td>
    <td>${human.Department}</td>
    <td>${human.Paid_To_Date}</td>
    <td>${human.Paid_Last_Year}</td>
    <td>${human.Vacation_Days}</td>
    <td>${human.Benefit_Plan}</td>
    <td>${human.Average_Plan_Benefit}</td>
    <td>${human.Pay_Amount}</td>
    <td>${human.Tax_Percentage}</td>
    <td><a href="#" class="edit-btn" data-id="${human.Employee_Id}">edit</a></td>
  `;
  tbody.appendChild(row);
}
}
  

function normalizeGender(value) {
  if (!value) return '';
  const v = value;
  if (v === 'Male' ) return 'Male';
  if (v === 'Female') return 'Female';
  if (v === 'Other' ) return 'Other';
  return '';
}


// Hàm fill dữ liệu vào form
function fillForm(human) {
  document.getElementById('Employee_Id').value = human.Employee_Id;
  document.getElementById('ShareHolder').value = human.ShareHolder;
  document.getElementById('Gender').value = normalizeGender(human.Gender);
  document.getElementById('Ethnicity').value = human.Ethnicity || ''; // lưu ý key đúng
  document.getElementById('Employment_Status').value = human.Employment_Status;
  document.getElementById('Department').value = human.Department;
  document.getElementById('Paid_To_Date').value = human.Paid_To_Date;
  document.getElementById('Paid_Last_Year').value = human.Paid_Last_Year;
  document.getElementById('Vacation_Days').value = human.Vacation_Days;
  document.getElementById('Benefit_Plan').value = human.Benefit_Plan;
  document.getElementById('Average_Plan_Benefit').value = human.Average_Plan_Benefit;
  document.getElementById('Pay_Amount').value = human.Pay_Amount;
  document.getElementById('Tax_Percentage').value = human.Tax_Percentage;
}

// Bắt sự kiện click cho các nút edit (cần gọi sau khi tạo bảng xong)
document.addEventListener('click', function(e) {
  if(e.target.classList.contains('edit-btn')) {
    e.preventDefault();
    const employeeId = e.target.getAttribute('data-id');
    // Tìm đối tượng human theo employeeId trong mảng humans đã lấy
    const human = humans.find(h => h.Employee_Id == employeeId);
    if(human) {
      fillForm(human);
      // Hiện popup
      document.getElementById('popupForm').style.display = 'flex';
    } else {
      alert('Không tìm thấy dữ liệu nhân viên');
    }
  }
});


document.getElementById('btnOpenPopup').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('popupForm').style.display = 'flex';

  // Tính max ID
  let maxId = humans.length;
  const newId = maxId + 1;

  // Reset form rồi gán ID mới
  const form = document.getElementById('employeeForm');
  form.reset();
  document.getElementById('Employee_Id').value = newId;
});

// Xử lý submit form (lưu dữ liệu)
document.getElementById('employeeForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const newData = getFormData();

  //Tìm xem có nhân viên đó chưa
  const index = humans.findIndex(h => h.Employee_Id === newData.Employee_Id);

  if (index >= 0) {
    // Cập nhật
     const isConfirmed = confirm("Đã có ID trùng, bạn có muốn chỉnh sửa không?");
  if (isConfirmed) {
    // Người dùng đồng ý chỉnh sửa, cập nhật dữ liệu
    humans[index] = newData;
  } else {
    // Người dùng không đồng ý, reset form các trường về rỗng
    resetFormFields();
    return; // dừng không thực hiện tiếp
  }

  } else {
    // Thêm mới
    humans.push(newData);
  }

  // Hàm reset form
function resetFormFields() {
  document.getElementById('Employee_Id').value = '';
}

  // Cập nhật bảng
  //show(index+1);
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = ''; // Xóa dữ liệu cũ 

  const startIndex = Math.max(0, humans.length - 20);
  for( let i = 0; i < 20; i++){
  const human = humans[i];
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${human.Employee_Id}</td>
    <td>${human.ShareHolder}</td>
    <td>${human.Gender}</td>
    <td>${ethnicityDisplay(human.Ethnicity)}</td>
    <td>${human.Employment_Status}</td>
    <td>${human.Department}</td>
    <td>${human.Paid_To_Date}</td>
    <td>${human.Paid_Last_Year}</td>
    <td>${human.Vacation_Days}</td>
    <td>${human.Benefit_Plan}</td>
    <td>${human.Average_Plan_Benefit}</td>
    <td>${human.Pay_Amount}</td>
    <td>${human.Tax_Percentage}</td>
    <td><a href="#" class="edit-btn" data-id="${human.Employee_Id}">edit</a></td>
  `;
  tbody.appendChild(row);
  }

  // Đóng popup
  document.getElementById('popupForm').style.display = 'none';
});


// Gọi hàm khi trang đã tải xong
window.addEventListener('DOMContentLoaded', fetchAndDisplayHumans);

