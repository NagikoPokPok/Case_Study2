import { renderDepartmentBarChart } from '/Charts/departmentBarChart.js';
import { renderGenderPieChart } from '/Charts/genderPieChart.js';
import { renderEmployeePieChart } from '/Charts/employeePieChart.js';
import { renderShareholderPieChart } from '/Charts/shareholderPieChart.js';
import { renderEthnicityBarChart } from '/Charts/ethnicityBarChart.js';
import { compactUSD } from './chart_options.js';

let departmentChart = null;
let employeeChart = null;
let genderChart = null;
let shareholderChart = null;
let ethnicityChart = null;


async function fetchHumanData() {
    try {
        console.log('Attempting to fetch data from server...');
        
        // Add a timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
        
        // Call API to fetch data with timeout
        const response = await fetch(`http://localhost:3000/api/humanList`, {
            signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error(`Server responded with status: ${response.status}`);
            
            // Try to get error details from response
            try {
                const errorData = await response.json();
                console.error('Server error details:', errorData);
            } catch (parseErr) {
                // If can't parse error JSON, just log the status
                console.error('Could not parse error response');
            }
            
            // Display error message to user
            document.getElementById('error-message').textContent = 
                `Server unavailable (${response.status}). Please try again later.`;
            document.getElementById('error-container').style.display = 'block';
            
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Received data from server:', result);

        // Check server error
        if (result.error) {
            console.error('Server error:', result.message);
            document.getElementById('error-message').textContent = 
                `Error: ${result.message}`;
            document.getElementById('error-container').style.display = 'block';
            return [];
        }

        // Check and validate data structure
        let validData = [];
        
        // Check if result has data array
        if (result.data && Array.isArray(result.data)) {
            console.log(`Fetched ${result.data.length} records from data property`);
            validData = result.data;
        }
        // Check if result is an array
        else if (Array.isArray(result)) {
            console.log(`Fetched ${result.length} records from array result`);
            validData = result;
        }
        // No valid data structure found
        else {
            console.warn('No valid data received:', result);
            document.getElementById('error-message').textContent = 
                'Invalid data format received from server.';
            document.getElementById('error-container').style.display = 'block';
            return [];
        }
        
        // Validate each record has Total_Earning
        return validData.map(item => {
            // If Total_Earning is missing, calculate it
            if (typeof item.Total_Earning === 'undefined') {
                return {
                    ...item,
                    Total_Earning: (item.Paid_To_Date || 0) + 
                                  (item.Average_Plan_Benefit || 0) + 
                                  ((item.Pay_Amount || 0) * 0.1)
                };
            }
            return item;
        });

            } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Fetch aborted due to timeout');
            if (document.getElementById('error-message')) {
                document.getElementById('error-message').textContent = 'Request timed out. Please try again later.';
                document.getElementById('error-container').style.display = 'block';
            }
        } else {
            console.error('Error fetching data:', error);
            if (document.getElementById('error-message')) {
                document.getElementById('error-message').textContent = `Connection error: ${error.message}`;
                document.getElementById('error-container').style.display = 'block';
            }
        }
        return [];
    }
}

document.addEventListener("DOMContentLoaded", async function () {
  // --- Khai báo và lấy các phần tử DOM 1 lần duy nhất ---
  const elements = {
    numberMoney: document.getElementById("number-money"),
    numberShareholder: document.getElementById("number-shareholder"),
    numberDepartment: document.getElementById("number-department"),
    totalDepartment: document.getElementById("total-department"),
    totalGender: document.getElementById("total-gender"),
    totalEmployee: document.getElementById("total-employee"),
    totalShareholder: document.getElementById("total-shareholder"),
    totalEthnicity: document.getElementById("total-ethnicity"),
    charts: {
      department: document.getElementById('departmentBarChart'),
      employee: document.getElementById('employeePieChart'),
      gender: document.getElementById('genderPieChart'),
      shareholder: document.getElementById('shareholderPieChart'),
      ethnicity: document.getElementById('ethnicityBarChart')
    }
  };

  // --- Hàm lấy dữ liệu từ server ---
  async function fetchHumanData() {
    try {
      const response = await fetch(`http://localhost:3000/api/humanList`);
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      const result = await response.json();
      if (!result || !Array.isArray(result)) throw new Error("Invalid data format");
      return result;
    } catch (err) {
      console.error('Error fetching human data:', err);
      return [];
    }
  }

  // --- Hàm tính toán thống kê từ data ---
  function calculateStats(data) {
    const totalEarning = data.reduce((sum, h) => sum + (h.Total_Earning || 0), 0);
    const shareholders = data.filter(h => h.ShareHolder === true).length;
    const departments = [...new Set(data.filter(h => h.Department).map(h => h.Department))];

    const departmentData = departments
      .map(dept => ({
        name: dept || 'Not Specified',
        total: data.filter(h => h.Department === dept)
                   .reduce((sum, h) => sum + (h.Total_Earning || 0), 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const employmentData = {
      fulltime: data.filter(h => h.Employment_Status?.toLowerCase() === 'full-time')
                    .reduce((sum, h) => sum + (h.Total_Earning || 0), 0),
      parttime: data.filter(h => h.Employment_Status?.toLowerCase() === 'part-time')
                    .reduce((sum, h) => sum + (h.Total_Earning || 0), 0),
      other: data.filter(h => !['full-time', 'part-time'].includes(h.Employment_Status?.toLowerCase()))
                 .reduce((sum, h) => sum + (h.Total_Earning || 0), 0),
    };

    const genderData = {
      male: data.filter(h => h.Gender === true).reduce((sum, h) => sum + (h.Total_Earning || 0), 0),
      female: data.filter(h => h.Gender === false).reduce((sum, h) => sum + (h.Total_Earning || 0), 0),
    };

    const shareholderData = {
      shareholder: data.filter(h => h.ShareHolder === true)
                       .reduce((sum, h) => sum + (h.Total_Earning || 0), 0),
      nonShareHolder: data.filter(h => h.ShareHolder !== true)
                          .reduce((sum, h) => sum + (h.Total_Earning || 0), 0),
    };

    const ethnicities = [...new Set(data.filter(h => h.Ethnicity).map(h => h.Ethnicity))];
    const ethnicityData = ethnicities
      .map(eth => ({
        name: eth || 'Unknown',
        total: data.filter(h => h.Ethnicity === eth)
                   .reduce((sum, h) => sum + (h.Total_Earning || 0), 0)
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalEarning,
      shareholders,
      departments,
      departmentData,
      employmentData,
      genderData,
      shareholderData,
      ethnicityData,
    };
  }

  // --- Hàm cập nhật giao diện tổng quan ---
  function updateSummaryNumbers(stats, elems) {
    elems.numberMoney.textContent = compactUSD.format(stats.totalEarning);
    elems.numberShareholder.textContent = stats.shareholders;
    elems.numberDepartment.textContent = stats.departments.length;
    elems.totalDepartment.textContent = compactUSD.format(stats.departmentData.reduce((sum, d) => sum + d.total, 0));
    elems.totalGender.textContent = compactUSD.format(stats.genderData.male + stats.genderData.female);
    elems.totalEmployee.textContent = compactUSD.format(stats.employmentData.fulltime + stats.employmentData.parttime);
    elems.totalShareholder.textContent = compactUSD.format(stats.shareholderData.shareholder + stats.shareholderData.nonShareHolder);
    elems.totalEthnicity.textContent = compactUSD.format(stats.ethnicityData.reduce((sum, e) => sum + e.total, 0));
  }

  // --- Hàm cập nhật các biểu đồ ---
 function updateCharts(stats, chartElems) {
  if (chartElems.department) {
    if (departmentChart) {
      departmentChart.destroy();
      departmentChart = null;
    }
    departmentChart = renderDepartmentBarChart(
      chartElems.department.getContext('2d'),
      stats.departmentData.map(d => d.name),
      stats.departmentData.map(d => d.total),
      [],
      'money'
    );
  }

  if (chartElems.employee) {
    if (employeeChart) {
      employeeChart.destroy();
      employeeChart = null;
    }
    employeeChart = renderEmployeePieChart(
      chartElems.employee.getContext('2d'),
      ['Full-time', 'Part-time'],
      [stats.employmentData.fulltime, stats.employmentData.parttime],
      ['#1cc88a', '#f6c23e']
    );
  }

  if (chartElems.gender) {
    if (genderChart) {
      genderChart.destroy();
      genderChart = null;
    }
    genderChart = renderGenderPieChart(
      chartElems.gender.getContext('2d'),
      ['Male', 'Female'],
      [stats.genderData.male, stats.genderData.female],
      ['#4e73df', '#e74a3b']
    );
  }

  if (chartElems.shareholder) {
    if (shareholderChart) {
      shareholderChart.destroy();
      shareholderChart = null;
    }
    shareholderChart = renderShareholderPieChart(
      chartElems.shareholder.getContext('2d'),
      ['Shareholder', 'Non-Shareholder'],
      [stats.shareholderData.shareholder, stats.shareholderData.nonShareHolder],
      ['#6f42c1', '#d63384']
    );
  }

  if (chartElems.ethnicity) {
    if (ethnicityChart) {
      ethnicityChart.destroy();
      ethnicityChart = null;
    }
    ethnicityChart = renderEthnicityBarChart(
      chartElems.ethnicity.getContext('2d'),
      stats.ethnicityData.map(e => e.name),
      stats.ethnicityData.map(e => e.total),
      [],
      'money'
    );
  }
}


  // --- Hàm tổng để cập nhật dashboard ---
  function updateDashboard(data, elems) {
    try {
      if (!data || !Array.isArray(data)) throw new Error("Invalid data");
      const stats = calculateStats(data);
      updateSummaryNumbers(stats, elems);
      updateCharts(stats, elems.charts);
      console.log('Dashboard updated successfully');
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  }

  // --- Load data ban đầu và render dashboard ---
  let data = await fetchHumanData();
  updateDashboard(data, elements);

  // --- Setup websocket lắng nghe event ---
  if (typeof io !== 'undefined') {
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
      console.log('WebSocket connected');
      const statusElem = document.getElementById('connection-status');
      if (statusElem) {
        statusElem.className = 'status-connected';
        statusElem.textContent = 'WebSocket: connected';
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      const statusElem = document.getElementById('connection-status');
      if (statusElem) {
        statusElem.className = 'status-disconnected';
        statusElem.textContent = 'WebSocket: disconnected';
      }
    });

    // Lắng nghe event dữ liệu thay đổi
    socket.on('personalChanged', async () => {
      console.log('Received personalChanged event');
      data = await fetchHumanData();
      updateDashboard(data, elements);
    });

    socket.on('benefitPlanUpdated', async () => {
      console.log('Received benefitPlanUpdated event');
      data = await fetchHumanData();
      updateDashboard(data, elements);
    });
  }
});
