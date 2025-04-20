export function renderGenderPieChart(ctx, labels, data) {
    const colors = Array.from({length: data.length}, (_, i) =>
        `hsl(${Math.round(360 * i / data.length)}, 70%, 70%)`
    );
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
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
}