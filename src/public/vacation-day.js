import { renderDepartmentBarChart } from '/Charts/departmentBarChart.js';
import { renderGenderPieChart } from '/Charts/genderPieChart.js';
import { renderEmployeePieChart } from '/Charts/employeePieChart.js';
import { renderShareholderPieChart } from '/Charts/shareholderPieChart.js';
import { renderEthnicityBarChart } from '/Charts/ethnicityBarChart.js';
import { compactUSD } from './chart_options.js';

async function fetchHumanData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`http://localhost:3000/api/humanList`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            document.getElementById('error-message').textContent = `Server unavailable (${response.status}). Please try again later.`;
            document.getElementById('error-container').style.display = 'block';
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            document.getElementById('error-message').textContent = `Error: ${result.message}`;
            document.getElementById('error-container').style.display = 'block';
            return [];
        }

        if (result.data && Array.isArray(result.data)) {
            return result.data;
        } else if (Array.isArray(result)) {
            return result;
        } else {
            document.getElementById('error-message').textContent = 'Invalid data format received from server.';
            document.getElementById('error-container').style.display = 'block';
            return [];
        }
    } catch (error) {
        document.getElementById('error-message').textContent = `Connection error: ${error.message}`;
        document.getElementById('error-container').style.display = 'block';
        return [];
    }
}

async function updateDataFromAPI() {
    try {
        const data = await fetchHumanData();
        if (!data.length) return;

        const numberMoney = document.getElementById("number-day");
        const numberShareholder = document.getElementById("number-shareholder");
        const numberDepartment = document.getElementById("number-department");

        const totalDepartment = document.getElementById("total-department");
        const totalGender = document.getElementById("total-gender");
        const totalEmployee = document.getElementById("total-employee");
        const totalShareholder = document.getElementById("total-shareholder");
        const totalEthnicity = document.getElementById("total-ethnicity");

        // Calculate totals
        const totalVacation = data.reduce((sum, human) => sum + human.Vacation_Days, 0);
        const shareholders = data.filter(human => human.ShareHolder).length;
        const departments = [...new Set(data.map(human => human.Department))];

        // Update summary numbers
        numberMoney.textContent = compactUSD.format(totalVacation);
        numberShareholder.textContent = shareholders;
        numberDepartment.textContent = departments.length;

        // Process department data
        const departmentData = departments
        .map(dept => ({
            name: dept || 'Not Specified',
            total: data
                .filter(human => human.Department === dept)
                .reduce((sum, human) => sum + human.Vacation_Days, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

        // Process gender data
        const genderData = {
            male: data.filter(human => human.Gender).reduce((sum, human) => sum + human.Vacation_Days, 0),
            female: data.filter(human => !human.Gender).reduce((sum, human) => sum + human.Vacation_Days, 0)
        };

        // Process employment status data
        const employmentData = {
            fulltime: data
                .filter(human => human.Employment_Status?.toLowerCase() === 'full-time')
                .reduce((sum, human) => sum + human.Vacation_Days, 0),
            parttime: data
                .filter(human => human.Employment_Status?.toLowerCase() === 'part-time')
                .reduce((sum, human) => sum + human.Vacation_Days, 0),
            other: data
                .filter(human => !['full-time', 'part-time'].includes(human.Employment_Status?.toLowerCase()))
                .reduce((sum, human) => sum + human.Vacation_Days, 0)
        };

        // Process shareholder data
        const shareholderData = {
            shareholder: data.filter(human => human.ShareHolder)
                .reduce((sum, human) => sum + human.Vacation_Days, 0),
            nonShareHolder: data.filter(human => !human.ShareHolder)
                .reduce((sum, human) => sum + human.Vacation_Days, 0)
        };

        // Process ethnicity data
        const ethnicities = [...new Set(data.map(human => human.Ethnicity))];
        const ethnicityData = ethnicities
        .map(ethnicity => ({
            name: ethnicity || 'Unknown',
            total: data
                .filter(human => human.Ethnicity === ethnicity)
                .reduce((sum, human) => sum + human.Vacation_Days, 0)
        }))
        .sort((a, b) => b.total - a.total);

        // Update totals in UI
        totalGender.textContent = compactUSD.format(genderData.male + genderData.female);
        totalEmployee.textContent = compactUSD.format(employmentData.fulltime + employmentData.parttime);
        totalShareholder.textContent = compactUSD.format(shareholderData.shareholder + shareholderData.nonShareHolder);
        totalEthnicity.textContent = compactUSD.format(ethnicityData.reduce((sum, eth) => sum + eth.total, 0));

        // Department Bar Chart
        renderDepartmentBarChart(
            document.getElementById('departmentBarChart').getContext('2d'),
            departmentData.map(d => d.name),
            departmentData.map(d => d.total),
            [],
            'days'
        );

        // Gender Pie Chart
        renderGenderPieChart(
            document.getElementById('genderPieChart').getContext('2d'),
            ['Male', 'Female'],
            [genderData.male, genderData.female],
            ['#4e73df', '#e74a3b'],
            'days'
        );

        // Employee Pie Chart
        renderEmployeePieChart(
            document.getElementById('employeePieChart').getContext('2d'),
            ['Full-time', 'Part-time'],
            [employmentData.fulltime, employmentData.parttime],
            ['#1cc88a', '#f6c23e'],
            'days'
        );

        // Shareholder Bar Chart
        renderShareholderPieChart(
            document.getElementById('shareholderPieChart').getContext('2d'),
            ['Shareholder', 'Non-Shareholder'],
            [shareholderData.shareholder, shareholderData.nonShareHolder],
            ['#6f42c1', '#d63384'],
            'days'
        );

        // Ethnicity Bar Chart
        renderEthnicityBarChart(
            document.getElementById('ethnicityBarChart').getContext('2d'),
            ethnicityData.map(d => d.name),
            ethnicityData.map(d => d.total),
            [],
            'days'
        );
    } catch (error) {
        console.error('Error loading vacation day data:', error);
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    window.updateDataFromAPI = updateDataFromAPI;
    await updateDataFromAPI();

    // Socket event listeners
    if (window.socketClient) {
        window.socketClient.on('personalChanged', async () => {
            await updateDataFromAPI();
        });
        window.socketClient.on('benefitPlanUpdated', async () => {
            await updateDataFromAPI();
        });
    }
});

