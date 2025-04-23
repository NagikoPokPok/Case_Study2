import { renderBenefitBarChart } from '/Charts/benefitBarChart.js';
import { formatNumber } from './format_number.js';
import { barChartOptions } from './chart_options.js';
// import { dataService } from '../services/data_service.js';

async function fetchHumanData() {
    let allData = [];
    let lastId = 0;
    let hasMore = true;

    // while (hasMore) {
        
    // }
    try {
        const response = await fetch(`http://localhost:3000/api/humanList`);
        
        const result = await response.json();
        allData = (result);
        
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
    try {
        const data = await fetchHumanData();

        const shareholders = data.filter(human => human.ShareHolder).length;
        const departments = [...new Set(data.map(human => human.Department))];

    // Calculate totals
    const totalAverageBenefit = data
                                .filter(human => human.ShareHolder)
                                .reduce((sum, human) => sum + human.Average_Plan_Benefit, 0)/shareholders
                              + data
                                .filter(human => !human.ShareHolder)
                                .reduce((sum, human) => sum + human.Average_Plan_Benefit, 0)/(data.length - shareholders);
    
    

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
                .reduce((sum, human) => sum + (human.Average_Plan_Benefit || 0), 0)/shareholders,
            nonShareholder: data
                .filter(human => human.Department === dept && !human.ShareHolder)
                .reduce((sum, human) => sum + (human.Average_Plan_Benefit || 0), 0)/(data.length - shareholders),
        }))
        .sort((a, b) => (b.shareholder + b.nonShareholder) - (a.shareholder + a.nonShareholder))
        .slice(0, 10);

    // Update total average benefit
    document.getElementById("total-average-benefit").textContent = formatNumber(totalAverageBenefit);

    // Process shareholder data
    const shareholderData = {
        shareholder: data.filter(human => human.ShareHolder)
            .reduce((sum, human) => sum + human.Average_Plan_Benefit, 0)/shareholders,
        nonShareHolder: data.filter(human => !human.ShareHolder)
            .reduce((sum, human) => sum + human.Average_Plan_Benefit, 0)/(data.length - shareholders),
    };

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