
// Mở popup
document.getElementById('btnOpenPopup').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('popupForm').style.display = 'flex';
});

// Đóng popup
document.getElementById('btnClosePopup').addEventListener('click', function() {
  document.getElementById('popupForm').style.display = 'none';
});

// Xử lý submit form (hiện chỉ preventDefault)
document.getElementById('employeeForm').addEventListener('submit', function(e) {
  e.preventDefault();
  //add du lieu ơ day
  
  // Đóng popup sau submit
  document.getElementById('popupForm').style.display = 'none';
});



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

async function fetchAndDisplayHumans() {
  const humans = await fetchHumanData();
  

  const tbody = document.querySelector('tbody');
  tbody.innerHTML = ''; // Xóa dữ liệu cũ

  humans.forEach(human => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${human.Employee_Id}</td>
      <td>${human.ShareHolder}</td>
      <td>${human.Gender}</td>
      <td>${human.Enthinitic}</td>
      <td>${human.Employment_Status}</td>
      <td>${human.Department}</td>
      <td>${human.Paid_To_Date}</td>
      <td>${human.Paid_Last_Year}</td>
      <td>${human.Vacation_Days}</td>
      <td>${human.Benefit_Plan}</td>
      <td>${human.Average_Plan_Benefit}</td>
      <td>${human.Pay_Amount}</td>
      <td>${human.Tax_Percentage}</td>
    `;
    tbody.appendChild(row);
  });
}

// Gọi hàm khi trang đã tải xong
window.addEventListener('DOMContentLoaded', fetchAndDisplayHumans);

