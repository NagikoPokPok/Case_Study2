export function renderShareholderBarChart(ctx, labels, data) {
    const colors = Array.from({length: data.length}, (_, i) =>
        `hsl(${Math.round(360 * i / data.length)}, 70%, 70%)`
    );
    const maxValue = Math.max(...data);
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Shareholder Value ($)',
                data: data,
                backgroundColor: colors,
                borderRadius: 32,
                borderSkipped: false,
                barPercentage: 0.7,
                categoryPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutBounce'
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    max: maxValue + 300,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toLocaleString();
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    color: '#222',
                    font: { weight: 'bold' },
                    formatter: function(value) {
                        return '$' + value.toLocaleString();
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}