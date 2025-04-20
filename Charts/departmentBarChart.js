export function renderDepartmentBarChart(ctx, labels, data) {
    const colors = Array.from({length: data.length}, (_, i) =>
        `hsl(${Math.round(360 * i / data.length)}, 70%, 70%)`
    );
    const maxValue = Math.max(...data);
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Budget ($)',
                data: data,
                backgroundColor: colors,
                borderWidth: 1,
                borderRadius: 12
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
                y: {
                    beginAtZero: true,
                    max: maxValue + 2000,
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