
let humans = [];
let currentPage = 1;
let pageSize = 20;
let lastId = 0;
let hasMore = true;
let lastIdsStack = [0];



// Mở popup
document.getElementById('btnOpenPopup').addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('popupForm').style.display = 'flex';
});

// Đóng popup
document.getElementById('btnClosePopup').addEventListener('click', function () {
    document.getElementById('popupForm').style.display = 'none';
});

async function fetchHumanData() {
    try {
        console.log('Attempting to fetch data from server...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch('http://localhost:3000/api/humanList', {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Server responded with status: ${response.status}`);
            document.getElementById('error-message').textContent =
                `Server unavailable (${response.status}). Please try again later.`;
            document.getElementById('error-container').style.display = 'block';
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

// New function to handle pagination
function paginateData(data, page, pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
        data: data.slice(start, end),
        hasMore: end < data.length,
        totalPages: Math.ceil(data.length / pageSize)
    };
}

async function fetchAndDisplayHumans() {
    // If we haven't loaded the data yet, load it
    if (humans.length === 0 ) {
        const allData = await fetchHumanData();
        humans = allData; // Store all data
    }

    // Get current page of data
    const paginatedResult = paginateData(humans, currentPage, pageSize);

    // Update hasMore flag
    hasMore = paginatedResult.hasMore;

    // Update the table with current page
    updateTable(paginatedResult.data);
    updatePaginationControls(paginatedResult.totalPages);
}

function updateTable(data) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    console.log('Updating table with data:', data);
    // console.log('Updating table with data:', data[7]);
    data.forEach(human => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${human.Employee_Id || ''}</td>
            <td>${human.First_Name || ''}</td>
            <td>${human.Last_Name || ''}</td>
            <td>${dataToShareHolder(human.ShareHolder)}</td>
            <td>${normalizeGender(human.Gender) || ''}</td>
            <td>${human.Ethnicity || ''}</td>
            <td>${human.Employment_Status || ''}</td>
            <td>${human.Department || ''}</td>
            <td>${human.PayRates_id || ''}</td>
            <td>${human.Paid_To_Date || 0}</td>
            <td>${human.Paid_Last_Year || 0}</td>
            <td>${human.Vacation_Days || 0}</td>
            <td>${human.Benefit_Plan || ''}</td>
            <td>${human.Average_Plan_Benefit || 0}</td>
            <td>${human.Pay_Amount || 0}</td>
            <td>${human.Tax_Percentage || 0}</td>
            <td><a href="#" class="edit-btn" data-id="${human.Employee_Id}">Edit</a></td>
            <td><a href="#" class="delete-btn" data-id="${human.Employee_Id}">Delete</a></td>
        `;
        tbody.appendChild(row);
    });
}

function updatePaginationControls(totalPages) {
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const firstButton = document.getElementById('firstPage');
    const lastButton = document.getElementById('lastPage');
    
    if (prevButton) prevButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = currentPage >= totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (firstButton) firstButton.disabled = currentPage === 1;
    if (lastButton) lastButton.disabled = currentPage >= totalPages;
}

// Update click handlers for pagination
document.getElementById('nextPage').addEventListener('click', async function () {
    if (hasMore) {
        currentPage++;
        await fetchAndDisplayHumans();
    }
});

document.getElementById('prevPage').addEventListener('click', async function () {
    if (currentPage > 1) {
        currentPage--;
        await fetchAndDisplayHumans();
    }
});

// Initial load
window.addEventListener('DOMContentLoaded', async () => {
    await fetchAndDisplayHumans();
});

function normalizeGender(value) {
    const v = value;
    if (v == '1') return 'Male';
    else if (v == '0') return 'Female';
}

function genderToData(value) {
    const v = value;
    if (v == 'Male') return true;
    else if (v == 'Female') return false;
}

function ShareHolderToData(value) {
    const v = value;
    if (v == 'Yes') return true;
    else if (v == 'No') return false;
}

function dataToShareHolder(value) {
    const v = value;
    if (v == true) return 'Yes';
    else if (v == false) return 'No';
}

// Add this function before your form submit handler
function getFormData() {
    return {
        Employee_Id: Number(document.getElementById('Employee_Id').value.trim()),
        First_Name: document.getElementById('First_Name').value.trim(),
        Last_Name: document.getElementById('Last_Name').value.trim(),
        ShareHolder: ShareHolderToData(document.getElementById('ShareHolder').value.trim()),
        Gender: genderToData(document.getElementById('Gender').value.trim()),
        Ethnicity: document.getElementById('Ethnicity').value.trim(),
        Employment_Status: document.getElementById('Employment_Status').value.trim(),
        Department: document.getElementById('Department').value.trim(),
        PayRates_id: document.getElementById('Pay_Id').value.trim(),
        Paid_To_Date: parseFloat(document.getElementById('Paid_To_Date').value) || 0,
        Paid_Last_Year: parseFloat(document.getElementById('Paid_Last_Year').value) || 0,
        Vacation_Days: parseInt(document.getElementById('Vacation_Days').value) || 0,
        Benefit_Plan: document.getElementById('Benefit_Plan').value.trim(),
        Average_Plan_Benefit: parseFloat(document.getElementById('Average_Plan_Benefit').value) || 0,
        Pay_Amount: parseFloat(document.getElementById('Pay_Amount').value) || 0,
        Tax_Percentage: parseFloat(document.getElementById('Tax_Percentage').value) || 0
    };
}

// Hàm fill dữ liệu vào form
function fillForm(human) {
    document.getElementById('Employee_Id').value = human.Employee_Id;
    document.getElementById('First_Name').value = human.First_Name;
    document.getElementById('Last_Name').value = human.Last_Name;
    document.getElementById('ShareHolder').value = dataToShareHolder(human.ShareHolder);
    document.getElementById('Gender').value = normalizeGender(human.Gender);
    document.getElementById('Ethnicity').value = human.Ethnicity || ''; // lưu ý key đúng
    document.getElementById('Employment_Status').value = human.Employment_Status;
    document.getElementById('Department').value = human.Department;
    document.getElementById('Pay_Id').value = human.PayRates_id;
    document.getElementById('Paid_To_Date').value = human.Paid_To_Date;
    document.getElementById('Paid_Last_Year').value = human.Paid_Last_Year;
    document.getElementById('Vacation_Days').value = human.Vacation_Days;
    document.getElementById('Benefit_Plan').value = human.Benefit_Plan;
    document.getElementById('Average_Plan_Benefit').value = human.Average_Plan_Benefit;
    document.getElementById('Pay_Amount').value = human.Pay_Amount;
    document.getElementById('Tax_Percentage').value = human.Tax_Percentage;
}


let formMode = 'edit'; // 'add' hoặc 'edit'
// // Bắt sự kiện click cho các nút edit (cần gọi sau khi tạo bảng xong)
// document.addEventListener('click', function(e) {
//   if(e.target.classList.contains('edit-btn')) {
//     e.preventDefault();
//     const employeeId = e.target.getAttribute('data-id');
//     // Tìm đối tượng human theo employeeId trong mảng humans đã lấy
//     const human = humans.find(h => h.Employee_Id == employeeId);
//     if(human) {
//       fillForm(human);
//       // Hiện popup
//       document.getElementById('popupForm').style.display = 'flex';
//     } else {
//       alert('Không tìm thấy dữ liệu nhân viên');
//     }
//   }
// });
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('edit-btn')) {
        e.preventDefault();
        formMode = 'edit';
        const employeeId = e.target.getAttribute('data-id');
        const human = humans.find(h => h.Employee_Id == employeeId);
        if (human) {
            fillForm(human);
            document.getElementById('popupForm').style.display = 'flex';
            // Cập nhật tiêu đề form
            document.querySelector('#popupForm h2').textContent = 'Edit Employee';
        } else {
            alert('Không tìm thấy dữ liệu nhân viên');
        }
    }
});





document.addEventListener('click', async function (e) {
    if (e.target.classList.contains('delete-btn')) {
        e.preventDefault();
        const employeeId = e.target.getAttribute('data-id');
        // Find if employee with this ID already exists

        const isConfirmed = confirm(`Bạn có chắc chắn muốn xóa nhân viên ID ${employeeId} không?`)
        if (isConfirmed) {
            try {
                const response = await fetch(`http://localhost:3000/api/route/deleteEmployee/${employeeId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                });
                // Xóa thành công
                // Cập nhật mảng humans
                const index = humans.findIndex(h => h.Employee_Id == employeeId);
                if (index >= 0) {
                    humans.splice(index, 1);
                    const totalPages = Math.ceil(humans.length / pageSize);
                    if (currentPage > totalPages) {
                        currentPage = totalPages || 1;
                    }
                }

                // Cập nhật bảng
                await fetchAndDisplayHumans();

                alert(`Đã xóa nhân viên ID ${employeeId} thành công.`);

            } catch (error) {
                console.error('Lỗi khi xóa:', error);
                alert('Xảy ra lỗi khi xóa nhân viên.');
            }
        }
    }
});



// document.getElementById('btnOpenPopup').addEventListener('click', function(e) {
//   e.preventDefault();
//   document.getElementById('popupForm').style.display = 'flex';
//   const form = document.getElementById('employeeForm');
//   form.reset();
// });
document.getElementById('btnOpenPopup').addEventListener('click', function (e) {
    e.preventDefault();
    formMode = 'add';
    const form = document.getElementById('employeeForm');
    document.getElementById('popupForm').style.display = 'flex';
    // Cập nhật tiêu đề form
    document.querySelector('#popupForm h2').textContent = 'Create New Employee';
    form.reset();
});



// // Modify the form submit handler
// document.getElementById('employeeForm').addEventListener('submit', async function(e) {
//     e.preventDefault();
//     const newData = getFormData();

//     try {
//         // Find if employee with this ID already exists
//         const index = humans.findIndex(h => h.Employee_Id === newData.Employee_Id);
//         console.log('Index of existing employee:',typeof newData.Employee_Id);
//         console.log('Index of existing employee:',typeof humans[0].Employee_Id);

//         if (index >= 0) {
//             // Update existing employee
//             const isConfirmed = confirm("Đã có ID trùng, bạn có muốn chỉnh sửa không?");
//             if (isConfirmed) {
//                 // Call API to update databases
//                 await fetch(`http://localhost:3000/api/route/updateEmployee`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify(newData)
//                 });
//                 humans[index] = newData;
//                 console.log('Updated existing employee:', newData);
//             } else {
//                 resetFormFields();
//                 return;
//             }
//         } else {
//             // Add new employee
//             await fetch('http://localhost:3000/api/route/addEmployee', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(newData)
//             });
//             humans.push(newData);
//         }

//         // Close popup and refresh data
//         document.getElementById('popupForm').style.display = 'none';
//         await fetchAndDisplayHumans(); // This will get fresh data from server

//     } catch (error) {
//         console.error('Error updating data:', error);
//         alert('Failed to save changes. Please try again.');
//     }
// });
document.getElementById('employeeForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = getFormData();

    try {
        //console.log('Submitting form, mode:', formMode, formData);

        if (formMode === 'add') {
            const index = humans.findIndex(h => h.Employee_Id === formData.Employee_Id);
            if (index >= 0) {
                // Update existing employee
                alert("Đã có id trùng, hãy nhập ID");
                // Call API to update databases
                document.getElementById(Employee_Id).value = '';
            } else {
                await fetch(`http://localhost:3000/api/route/updateEmployee`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                humans[index] = formData;
                console.log('Updated existing employee:', formData);
                // Cập nhật lại dữ liệu từ server
                // Cập nhật humans mới từ server (để có tổng trang mới)
                const allData = await fetchHumanData();
                humans = allData;

                // Không thay đổi currentPage, giữ nguyên trang đang đứng
                await fetchAndDisplayHumans(); // KHÔNG truyền `true`
                // await fetchAndDisplayHumans(true);
                alert(`Add successfully Employee: ${formData.Employee_Id}`);
                document.getElementById('popupForm').style.display = 'none';
            }

        } else if (formMode === 'edit') {
            const index = humans.findIndex(h => h.Employee_Id === formData.Employee_Id);
            if (index >= 0) {
                // Update existing employee
                const isConfirmed = confirm("Do you want to update");
                if (isConfirmed) {
                    // Call API to update databases
                    await fetch(`http://localhost:3000/api/route/updateEmployee`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    humans[index] = formData;
                    console.log('Updated existing employee:', formData);
                } else {
                    document.getElementById(Employee_Id).value = '';
                    return;
                }
                // Cập nhật lại dữ liệu từ server
                await fetchAndDisplayHumans();
                alert(`Update successfully Employee: ${formData.Employee_Id}`);
            }

            document.getElementById('popupForm').style.display = 'none';
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Lỗi khi lưu dữ liệu: ' + error.message);
    }
});



document.getElementById('nextPage').addEventListener('click', async function () {
    if (hasMore) {
        lastIdsStack.push(lastId);
        lastId = humans.length > 0 ? humans[humans.length - 1].Employee_Id : lastId;
        // currentPage++;
        console.log('currentPage:', currentPage);
        console.log('lastId:', lastId);
        await fetchAndDisplayHumans();
        console.log('action next');
    }
});

document.getElementById('prevPage').addEventListener('click', async function () {
    if (currentPage > 1) {
        lastIdsStack.pop(); // Remove current lastId
        lastId = lastIdsStack[lastIdsStack.length - 1] || 0;
        // currentPage--;
        await fetchAndDisplayHumans();
        console.log('action next');
    }
});

document.getElementById('firstPage').addEventListener('click', async function () {
    if (currentPage !== 1) {
        currentPage = 1;
        await fetchAndDisplayHumans();
    }
});

document.getElementById('lastPage').addEventListener('click', async function () {
    const totalPages = Math.ceil(humans.length / pageSize);
    if (currentPage !== totalPages) {
        currentPage = totalPages;
        await fetchAndDisplayHumans();
    }
});

// Initial load
window.addEventListener('DOMContentLoaded', async () => {
    await fetchAndDisplayHumans();
});


// Lấy các phần tử cần thiết
const searchInput = document.getElementById('searchIdInput');
const searchBtn = document.getElementById('btnSearchId');
const clearSearchBtn = document.getElementById('btnClearSearch');
const searchMessage = document.getElementById('searchMessage');

// Hàm hiển thị dữ liệu tìm được (mảng có 0 hoặc 1 phần tử)
function displaySearchResult(data) {
    updateTable(data); // tận dụng hàm updateTable hiện có
    updatePaginationControls(1); // chỉ 1 trang duy nhất
}

// Xử lý tìm kiếm khi nhấn nút Tìm kiếm
searchBtn.addEventListener('click', function () {
    const idToFind = searchInput.value.trim();
    searchMessage.textContent = ''; // xóa thông báo cũ

    if (!idToFind) {
        alert('Vui lòng nhập Employee ID để tìm kiếm.');
        return;
    }

    // Tìm employee theo ID trong mảng humans
    const found = humans.filter(h => String(h.Employee_Id) === idToFind);

    if (found.length > 0) {
        displaySearchResult(found);
    } else {
        updateTable([]); // xóa bảng
        updatePaginationControls(0);
        searchMessage.textContent = 'Không tìm thấy nhân viên với ID này.';
    }
});

// Xử lý nút Xóa tìm kiếm để quay lại bảng bình thường
clearSearchBtn.addEventListener('click', function () {
    searchInput.value = '';
    searchMessage.textContent = '';
    currentPage = 1; // reset trang về 1
    fetchAndDisplayHumans(); // hiển thị lại bảng đầy đủ
});
