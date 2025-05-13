import { renderDepartmentBarChart } from '/Charts/departmentBarChart.js';
import { renderGenderPieChart } from '/Charts/genderPieChart.js';
import { renderEmployeePieChart } from '/Charts/employeePieChart.js';
import { renderShareholderPieChart } from '/Charts/shareholderPieChart.js';
import { renderEthnicityBarChart } from '/Charts/ethnicityBarChart.js';
import { formatNumber } from './format_number.js';
import { barChartOptions, pieChartOptions } from './chart_options.js';


async function fetchHumanData() {
    let allData = [];
    let lastId = 0;
    let hasMore = true;

    // while (hasMore) {
        
    // }
    try {
        const response = await fetch(`http://localhost:3000/api/humanList`);
        
        const result = await response.json();
        
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

document.addEventListener("DOMContentLoaded", async function () {
    const data = await fetchHumanData();

    // Get DOM elements
    const numberMoney = document.getElementById("number-money");
    const numberShareholder = document.getElementById("number-shareholder");
    const numberDepartment = document.getElementById("number-department");
    
    const totalDepartment = document.getElementById("total-department");
    const totalGender = document.getElementById("total-gender");
    const totalEmployee = document.getElementById("total-employee");
    const totalShareholder = document.getElementById("total-shareholder");
    const totalEthnicity = document.getElementById("total-ethnicity");

    // Calculate totals
    const totalEarning = data.reduce((sum, human) => sum + human.Total_Earning, 0);
    const shareholders = data.filter(human => human.ShareHolder).length;
    const departments = [...new Set(data.map(human => human.Department))];

    // Update summary numbers
    numberMoney.textContent = formatNumber(totalEarning);
    numberShareholder.textContent = shareholders;
    numberDepartment.textContent = departments.length;

    // Process department data
    const departmentData = departments
    .map(dept => ({
        name: dept || 'Not Specified',
        total: data
            .filter(human => human.Department === dept)
            .reduce((sum, human) => sum + human.Total_Earning, 0)
    }))
    .sort((a, b) => b.total - a.total) // Sort từ lớn đến nhỏ
    .slice(0, 10); 

    // Process employment status data với null check
    const employmentData = {
        fulltime: data
            .filter(human => human.Employment_Status?.toLowerCase() === 'full-time')
            .reduce((sum, human) => sum + human.Total_Earning, 0),
        parttime: data
            .filter(human => human.Employment_Status?.toLowerCase() === 'part-time')
            .reduce((sum, human) => sum + human.Total_Earning, 0),
        other: data
            .filter(human => !['full-time', 'part-time'].includes(human.Employment_Status?.toLowerCase()))
            .reduce((sum, human) => sum + human.Total_Earning, 0)
    };

    // Process gender data
    const genderData = {
        male: data.filter(human => human.Gender).reduce((sum, human) => sum + human.Total_Earning, 0),
        female: data.filter(human => !human.Gender).reduce((sum, human) => sum + human.Total_Earning, 0)
    };

    // Process shareholder data
    const shareholderData = {
        shareholder: data.filter(human => human.ShareHolder)
            .reduce((sum, human) => sum + human.Total_Earning, 0),
        nonShareHolder: data.filter(human => !human.ShareHolder)
            .reduce((sum, human) => sum + human.Total_Earning, 0)
    };

    // Process ethnicity data
    const ethnicities = [...new Set(data.map(human => human.Ethnicity))];
    const ethnicityData = ethnicities
    .map(ethnicity => ({
        name: ethnicity || 'Unknown',
        total: data
            .filter(human => human.Ethnicity === ethnicity)
            .reduce((sum, human) => sum + human.Total_Earning, 0)
    }))
    .sort((a, b) => b.total - a.total);

    // Update totals in UI
    totalDepartment.textContent = formatNumber(departmentData.reduce((sum, dept) => sum + dept.total, 0));
    totalGender.textContent = formatNumber(genderData.male + genderData.female);
    totalEmployee.textContent = formatNumber(employmentData.fulltime + employmentData.parttime);
    totalShareholder.textContent = formatNumber(shareholderData.shareholder + shareholderData.nonShareHolder);
    totalEthnicity.textContent = formatNumber(ethnicityData.reduce((sum, eth) => sum + eth.total, 0));

     // Cập nhật cách render department chart
    renderDepartmentBarChart(
        document.getElementById('departmentBarChart').getContext('2d'),
        departmentData.map(d => d.name),
        departmentData.map(d => d.total),
        [],
        'money'
    );

// Cập nhật cách render employment chart
renderEmployeePieChart(
    document.getElementById('employeePieChart').getContext('2d'),
    ['Full-time', 'Part-time'],
    [employmentData.fulltime, employmentData.parttime],
    ['#1cc88a', '#f6c23e']
);

    renderGenderPieChart(
        document.getElementById('genderPieChart').getContext('2d'),
        ['Male', 'Female'],
        [genderData.male, genderData.female],
        ['#4e73df', '#e74a3b'],
        
    );


    renderShareholderPieChart(
        document.getElementById('shareholderPieChart').getContext('2d'),
        ['Shareholder', 'Non-Shareholder'],
        [shareholderData.shareholder, shareholderData.nonShareHolder],
        ['#6f42c1', '#d63384'],
        
    );

    renderEthnicityBarChart(
        document.getElementById('ethnicityBarChart').getContext('2d'),
        ethnicityData.map(d => d.name),
        ethnicityData.map(d => d.total),
        [],
        'money'
    );
});