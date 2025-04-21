import { renderBenefitBarChart } from '/Charts/benefitBarChart.js';

document.addEventListener("DOMContentLoaded", function () {
    const numberMoney = document.getElementById("number-money");
    const numberShareholder = document.getElementById("number-shareholder");
    const numberDepartment = document.getElementById("number-department");
    
    const totalAverageBenefit= document.getElementById("total-average-benefit");

    renderBenefitBarChart(
        document.getElementById('benefitBarChart').getContext('2d'),
        ['Project 1', 'Project 2', 'Project 3', 'Project 4', 'Project 5', 'Project 6', 'Project 7', 'Project 8', 'Project 9', 'Project 10'],
        [12000, 15000, 9000, 18000, 11000, 17000, 14000, 16000, 13000, 20000], // Shareholder data
        [10000, 13000, 8000, 15000, 9000, 12000, 11000, 14000, 10000, 17000]   // Non-Shareholder data
    );
});