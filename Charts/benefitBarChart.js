export function renderBenefitBarChart(ctx, projectLabels, shareholderData, nonShareholderData) {
    // Generate colors for each group
    const colors = [
        'hsl(220, 70%, 60%)', // Shareholder
        'hsl(340, 70%, 60%)'  // Non-Shareholder
    ];
    // Calculate max value for y-axis padding
    const maxValue = Math.max(...shareholderData, ...nonShareholderData);
    const zeros = Math.floor(Math.log10(maxValue));
    const padding = Math.pow(10, zeros - 1 > 0 ? zeros - 1 : 1);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projectLabels,
            datasets: [
                {
                    label: 'Shareholder',
                    data: shareholderData,
                    backgroundColor: colors[0],
                    borderRadius: 16,
                    barPercentage: 0.8,
                    categoryPercentage: 0.5
                },
                {
                    label: 'Non-Shareholder',
                    data: nonShareholderData,
                    backgroundColor: colors[1],
                    borderRadius: 16,
                    barPercentage: 0.8,
                    categoryPercentage: 0.5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutBounce'
            },
            scales: {
                x: {
                    stacked: false,
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    max: maxValue + padding,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' $';
                        }
                    }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '$';
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    color: '#222',
                    font: { weight: 'bold' },
                    // formatter: function(value) {
                    //     return '$' + value.toLocaleString();
                    // }
                }
            }
        },
        // plugins: [ChartDataLabels]
    });
}