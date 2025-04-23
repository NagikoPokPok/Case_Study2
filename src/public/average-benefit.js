import { renderBenefitBarChart } from '/Charts/benefitBarChart.js';
import { formatNumber } from './format_number.js';
import { barChartOptions } from './chart_options.js';
import { dataService } from '../services/data_service.js';


document.addEventListener("DOMContentLoaded", async function () {
    try {
        const data = await dataService.getData();

    // Calculate totals
    const totalAverageBenefit = data.reduce((sum, human) => sum + (human.Average_Plan_Benefit || 0), 0);
    
    const shareholders = data.filter(human => human.ShareHolder).length;
    const departments = [...new Set(data.map(human => human.Department))];

    // Update summary numbers
    document.getElementById("number-money").textContent = formatNumber(totalAverageBenefit);
    document.getElementById("number-shareholder").textContent = shareholders;
    document.getElementById("number-department").textContent = departments.length;

    // Process benefit data by departments
    const benefitData = departments
        .map(dept => ({
            name: dept || 'Not Specified',
            shareholder: data
                .filter(human => human.Department === dept && human.ShareHolder)
                .reduce((sum, human) => sum + (human.Average_Plan_Benefit || 0), 0),
            nonShareholder: data
                .filter(human => human.Department === dept && !human.ShareHolder)
                .reduce((sum, human) => sum + (human.Average_Plan_Benefit || 0), 0)
        }))
        .sort((a, b) => (b.shareholder + b.nonShareholder) - (a.shareholder + a.nonShareholder))
        .slice(0, 10);

    // Update total average benefit
    document.getElementById("total-average-benefit").textContent = formatNumber(totalAverageBenefit);

    // Render benefit chart
    renderBenefitBarChart(
        document.getElementById('benefitBarChart').getContext('2d'),
        benefitData.map(d => d.name),
        benefitData.map(d => d.shareholder),
        benefitData.map(d => d.nonShareholder),
        {
            ...barChartOptions,
            indexAxis: 'y'
        }
    );
    } catch (error) {
        console.error('Error loading benefit data:', error);
    }
});