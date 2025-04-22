import { renderDepartmentBarChart } from '/Charts/departmentBarChart.js';
import { renderGenderPieChart } from '/Charts/genderPieChart.js';
import { renderEmployeePieChart } from '/Charts/employeePieChart.js';
import { renderShareholderPieChart } from '/Charts/shareholderPieChart.js';
import { renderEthnicityBarChart } from '/Charts/ethnicityBarChart.js';

document.addEventListener("DOMContentLoaded", function () {
    const numberMoney = document.getElementById("number-day");
    const numberShareholder = document.getElementById("number-shareholder");
    const numberDepartment = document.getElementById("number-department");
    
    const totalDepartment = document.getElementById("total-department");
    const totalGender = document.getElementById("total-gender");
    const totalEmployee = document.getElementById("total-employee");
    const totalShareholder = document.getElementById("total-shareholder");
    const totalEthnicity = document.getElementById("total-ethnicity");

    // Department Bar Chart
    renderDepartmentBarChart(
        document.getElementById('departmentBarChart').getContext('2d'),
        ['Sell Department', 'Marketing','HR','Payroll','Accounting'],
        [30, 80, 25, 100, 65],
    );

    // Gender Pie Chart
    renderGenderPieChart(
        document.getElementById('genderPieChart').getContext('2d'),
        ['Male', 'Female'],
        [60, 40],
        ['#4e73df', '#e74a3b']
    );

    // Employee Pie Chart
    renderEmployeePieChart(
        document.getElementById('employeePieChart').getContext('2d'),
        ['Full-time', 'Part-time'],
        [30, 70],
        ['#1cc88a', '#f6c23e']
    );

    // Shareholder Bar Chart
    renderShareholderPieChart(
        document.getElementById('shareholderPieChart').getContext('2d'),
        ['Shareholder', 'Non-Shareholder'],
        [45, 55],
        ['#6f42c1', '#d63384']
    );

    // Ethnicity Bar Chart
    renderEthnicityBarChart(
        document.getElementById('ethnicityBarChart').getContext('2d'),
        ['Asian', 'Black', 'White', 'Hispanic', 'Others'],
        [30, 80, 25, 100, 65]
    );
});

