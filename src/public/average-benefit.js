import { renderBenefitBarChart } from '/Charts/benefitBarChart.js';
import { barChartOptions, compactUSD } from './chart_options.js';

async function fetchHumanData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // timeout 10s

        const response = await fetch(`http://localhost:3000/api/humanList`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Server responded with status: ${response.status}`);
            document.getElementById('error-message').textContent = `Server unavailable (${response.status}). Please try again later.`;
            document.getElementById('error-container').style.display = 'block';
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            console.error('Server error:', result.message);
            document.getElementById('error-message').textContent = `Error: ${result.message}`;
            document.getElementById('error-container').style.display = 'block';
            return [];
        }

        let validData = [];

        if (result.data && Array.isArray(result.data)) {
            validData = result.data;
        } else if (Array.isArray(result)) {
            validData = result;
        } else {
            console.warn('No valid data received:', result);
            document.getElementById('error-message').textContent = 'Invalid data format received from server.';
            document.getElementById('error-container').style.display = 'block';
            return [];
        }

        return validData;
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('error-message').textContent = `Connection error: ${error.message}`;
        document.getElementById('error-container').style.display = 'block';
        return [];
    }
}

async function updateDataFromAPI() {
    try {
        const data = await fetchHumanData();

        if (!data.length) return;

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
        document.getElementById("number-money").textContent = compactUSD.format(totalAverageBenefit);
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
        document.getElementById("total-average-benefit").textContent = compactUSD.format(totalAverageBenefit);

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