// Đánh dấu các script đã được tải để tránh tải lại
if (!window._loadedScripts) {
  window._loadedScripts = new Set();
}

// Danh sách các script cần tải theo đúng thứ tự
const requiredScripts = [
  "/Scripts/jquery-1.9.1.min.js",
  "/Scripts/jquery-ui-1.10.1.custom.min.js",
  "/bootstrap/js/bootstrap.min.js",
  "/Scripts/flot/jquery.flot.js",
  "/Scripts/flot/jquery.flot.resize.js",
  "/Scripts/datatables/jquery.dataTables.js",
  "/Scripts/common.js",
  "https://cdn.jsdelivr.net/npm/flatpickr",
  "https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/monthSelect/index.js",
  "https://cdn.jsdelivr.net/npm/chart.js",
"https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels",
];

// Hàm tải từng script với Promise
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window._loadedScripts.has(src)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.type = "text/javascript";
    script.onload = () => {
      window._loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => {
      console.error(`Lỗi khi tải script: ${src}`);
      reject(new Error(`Script load failed: ${src}`));
    };
    document.body.appendChild(script);
  });
}

// Hàm tải tuần tự tất cả scripts
async function loadAllScripts() {
  try {
    for (const src of requiredScripts) {
      await loadScript(src);
    }
    console.log('Tất cả scripts đã được tải xong');
    return true;
  } catch (error) {
    console.error('Lỗi khi tải scripts:', error);
    return false;
  }
}

// Hàm khởi tạo dashboard
async function initDashboard() {
  const container = document.querySelector('.span9');
  if (!container) {
    console.error('Không tìm thấy container');
    return;
  }

  // Xóa nội dung cũ
  container.innerHTML = '';

  try {
    // Tải nội dung HTML
    const response = await fetch("content.html");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    container.innerHTML = html;

    // Tải các script sau khi có nội dung
    const scriptsLoaded = await loadAllScripts();

    if (scriptsLoaded) {
      // Khởi tạo flatpickr nếu tồn tại phần tử #myDate
      const dateInput = document.querySelector("#yearPicker");
      if (dateInput && typeof flatpickr === "function") {
        // flatpickr("#myDate", {
        //   dateFormat: "d/m/Y"  // dd/mm/yyyy
        // });
        flatpickr("#yearPicker", {
          dateFormat: "Y",         // Chỉ hiển thị năm
          defaultDate: new Date(), // Tùy chọn: năm hiện tại
          plugins: [
            new monthSelectPlugin({
              shorthand: true,
              dateFormat: "Y",
              theme: "light"
            })
          ]
        });

        // Department Bar Chart
        const ctx = document.getElementById('departmentBarChart').getContext('2d');
        const departmentBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [
                    'Sell Department',
                    'Marketing',
                    'HR',
                    'Payroll',
                    'Accounting'
                ],
                datasets: [{
                    label: 'Budget ($)',
                    data: [15000, 32000, 13000, 38000, 30000],
                    backgroundColor: [
                        '#4e73df',
                        '#1cc88a',
                        '#36b9cc',
                        '#f6c23e',
                        '#e74a3b'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeOutBounce'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$' + context.parsed.y.toLocaleString();
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: '#222',
                        font: {
                            weight: 'bold'
                        },
                        formatter: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        // Gender Pie Chart
        const genderCtx = document.getElementById('genderPieChart').getContext('2d');
        new Chart(genderCtx, {
            type: 'pie',
            data: {
                labels: ['Male', 'Female'],
                datasets: [{
                    data: [7680, 5120],
                    backgroundColor: ['#4e73df', '#e74a3b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    datalabels: {
                        color: '#222',
                        font: { weight: 'bold' },
                        formatter: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        // Employee Pie Chart
        const employeeCtx = document.getElementById('employeePieChart').getContext('2d');
        new Chart(employeeCtx, {
            type: 'pie',
            data: {
                labels: ['Full-time', 'Part-time'],
                datasets: [{
                    data: [7680, 5120],
                    backgroundColor: ['#1cc88a', '#f6c23e']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    datalabels: {
                        color: '#222',
                        font: { weight: 'bold' },
                        formatter: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
      }

      // Gọi các hàm khởi tạo khác nếu cần
      if (typeof initPageSpecificFunctions === 'function') {
        initPageSpecificFunctions();
      }
    }
  } catch (error) {
    console.error("Lỗi khi khởi tạo dashboard:", error);
  }
}

// Sự kiện khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", initDashboard);

// Xử lý trường hợp back/forward cache
window.addEventListener("pageshow", function(event) {
  if (event.persisted) {
    initDashboard();
  }
});

// Kiểm tra nếu DOM đã loaded (phòng trường hợp script được chèn sau khi DOM đã load)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initDashboard();
}
