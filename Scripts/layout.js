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

// Hàm chèn navbar và footer vào trang
(async () => {
  const { insertNavbar, insertFooter } = await import('./component.js');
  insertNavbar('body', 'afterbegin');
  insertFooter('body', 'beforeend');
})();

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
        const departmentLabels = [
          'Sell Department', 'Marketing','HR','Payroll','Accounting'];
        const departmentData = [15000, 32000, 13000, 38000, 30000];
        const departmentColors = [
          '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'
        ];
        const ctx = document.getElementById('departmentBarChart').getContext('2d');
        const departmentBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: departmentLabels,
                datasets: [{
                    label: 'Budget ($)',
                    data: departmentData,
                    backgroundColor: departmentColors,
                    borderWidth: 1,
                    borderRadius: 12
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
        genderLabels = ['Male', 'Female'];
        genderData = [7680, 5120];
        const genderCtx = document.getElementById('genderPieChart').getContext('2d');
        new Chart(genderCtx, {
            type: 'pie',
            data: {
                labels: genderLabels,
                datasets: [{
                    data: genderData,
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
                        formatter: function(value, context) {
                          // Show percentage only in pie
                          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                          const percent = value / total * 100;
                          return percent.toFixed(1) + '%';
                      }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        // Employee Pie Chart
        const employeeLabels = ['Full-time', 'Part-time'];
        const employeeData = [7680, 5120];
        const employeeCtx = document.getElementById('employeePieChart').getContext('2d');
        new Chart(employeeCtx, {
            type: 'pie',
            data: {
                labels: employeeLabels,
                datasets: [{
                    data: employeeData,
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
                        formatter: function(value, context) {
                          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                          const percent = value / total * 100;
                          return percent.toFixed(1) + '%';
                      }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        // Shareholder Bar Chart
        const shareholderLabels = [
          'SH1', 'SH2', 'SH3', 'SH4', 'SH5', 'SH6', 'SH7', 'SH8', 'SH9', 'SH10'
        ];
        const shareholderData = [1200, 1500, 900, 1800, 1100, 1700, 1400, 1600, 1300, 2000];
        const maxShareholder = Math.max(...shareholderData);

        const shareholderCtx = document.getElementById('shareholderBarChart').getContext('2d');
        new Chart(shareholderCtx, {
          type: 'bar',
          data: {
              labels: shareholderLabels,
              datasets: [{
                  label: 'Shareholder Value ($)',
                  data: shareholderData,
                  backgroundColor: [
                      '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                      '#858796', '#fd7e14', '#20c997', '#6f42c1', '#d63384'
                  ],
                  borderRadius: 32, // Large border radius
                  borderSkipped: false, // Rounded all corners
                  barPercentage: 0.7, // Thicker bars
                  categoryPercentage: 0.7
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
                  x: {
                      grid: { display: false }
                  },
                  y: {
                      beginAtZero: true,
                      max: maxShareholder + 300, // Add some padding above the tallest bar
                      ticks: {
                          callback: function(value) {
                              return '$' + value.toLocaleString();
                          }
                      }
                  }
              },
              plugins: {
                  legend: { display: false },
                  tooltip: {
                      callbacks: {
                          label: function(context) {
                              return '$' + context.parsed.y.toLocaleString();
                          }
                      }
                  },
                  datalabels: {
                    anchor: 'end',      // Center of the bar
                    align: 'end',       // Center vertically
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


        // Ethnicity Bar Chart
        const ethnicityLabels = [
          'Asian', 'Black', 'White', 'Hispanic', 'Native', 'Pacific', 'Arab', 'Jewish', 'Other1', 'Other2'
        ];
        const ethnicityData = [800, 950, 1200, 1100, 700, 650, 900, 1050, 980, 1020];
        const maxEthnicity = Math.max(...ethnicityData);

        const ethnicityCtx = document.getElementById('ethnicityBarChart').getContext('2d');
        new Chart(ethnicityCtx, {
          type: 'bar',
          data: {
              labels: ethnicityLabels,
              datasets: [{
                  label: 'Ethnicity Count',
                  data: ethnicityData,
                  backgroundColor: [
                      '#fd7e14', '#20c997', '#6f42c1', '#d63384', '#4e73df',
                      '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'
                  ],
                  borderRadius: 32,
                  borderSkipped: false,
                  barPercentage: 0.7,
                  categoryPercentage: 0.7
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
                  x: {
                      grid: { display: false }
                  },
                  y: {
                      beginAtZero: true,
                      max: maxEthnicity + 300, // Add some padding above the tallest bar
                      ticks: {
                          callback: function(value) {
                              return value.toLocaleString();
                          }
                      }
                  }
              },
              plugins: {
                  legend: { display: false },
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


