import { renderDepartmentBarChart } from '/Charts/departmentBarChart.js';
import { renderGenderPieChart } from '/Charts/genderPieChart.js';
import { renderEmployeePieChart } from '/Charts/employeePieChart.js';
import { renderShareholderPieChart } from '/Charts/shareholderPieChart.js';
import { renderEthnicityBarChart } from '/Charts/ethnicityBarChart.js';
import { compactUSD } from './chart_options.js';

async function fetchHumanData() {
    try {
        console.log('Attempting to fetch data from server...');
        
        // Add a timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
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
        console.error('Error fetching data:', error);
        
        // Show error message to user
        document.getElementById('error-message').textContent = 
            `Connection error: ${error.message}`;
        document.getElementById('error-container').style.display = 'block';
        
        return []; 
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const data = await fetchHumanData();

    console.log('Data:', data);
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

    // Update summary numbers - use format() method with compactUSD
    numberMoney.textContent = compactUSD.format(totalEarning);
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
    .sort((a, b) => b.total - a.total) // Sort from largest to smallest
    .slice(0, 10); 

    // Process employment status data with null check
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

    // Update totals in UI - use format() method with compactUSD
    totalDepartment.textContent = compactUSD.format(departmentData.reduce((sum, dept) => sum + dept.total, 0));
    totalGender.textContent = compactUSD.format(genderData.male + genderData.female);
    totalEmployee.textContent = compactUSD.format(employmentData.fulltime + employmentData.parttime);
    totalShareholder.textContent = compactUSD.format(shareholderData.shareholder + shareholderData.nonShareHolder);
    totalEthnicity.textContent = compactUSD.format(ethnicityData.reduce((sum, eth) => sum + eth.total, 0));

    // Update department chart rendering
    renderDepartmentBarChart(
        document.getElementById('departmentBarChart').getContext('2d'),
        departmentData.map(d => d.name),
        departmentData.map(d => d.total),
        [],
        'money'
    );

    // Update employment chart rendering
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
        ['#4e73df', '#e74a3b']
    );

    renderShareholderPieChart(
        document.getElementById('shareholderPieChart').getContext('2d'),
        ['Shareholder', 'Non-Shareholder'],
        [shareholderData.shareholder, shareholderData.nonShareHolder],
        ['#6f42c1', '#d63384']
    );

    renderEthnicityBarChart(
        document.getElementById('ethnicityBarChart').getContext('2d'),
        ethnicityData.map(d => d.name),
        ethnicityData.map(d => d.total),
        [],
        'money'
    );
});