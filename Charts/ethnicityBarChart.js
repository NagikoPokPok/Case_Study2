import { compactUSD } from '../src/public/chart_options.js';

export function renderEthnicityBarChart(ctx, labels, data, colors, type) {
    
    // If colors not provided, generate random pastel colors
    if (!colors || colors.length < data.length) {
        const hueOffset = Math.floor(Math.random() * 360);
        colors = Array.from({length: data.length}, (_, i) =>
            `hsl(${(hueOffset + Math.round(360 * i / data.length)) % 360}, 70%, 70%)`
        );
    }
    const maxValue = Math.max(...data);
    // Calculate padding based on number of digits in maxValue
    const zeros = Math.floor(Math.log10(maxValue));
    const padding = Math.pow(10, zeros - 1 > 0 ? zeros - 1 : 1);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ethnicity Count',
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
            },            scales: {
                x: { grid: { display: false } },
                                y: {
                    beginAtZero: true,
                    max: maxValue + padding,
                    ticks: {
                         callback: function(value) {
                            return type === 'money'
                                ? compactUSD.format(value)
                                : value.toLocaleString() + ' days';
                        }
                }
            }
            },
            plugins: {
                legend: { display: false },                tooltip: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return type === 'days'
                                    ? context.parsed.x.toLocaleString() + ' days'
                                    : compactUSD.format(context.parsed.x);
                            }
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    color: '#222',
                    font: { weight: 'bold' },
                    formatter: function(value) {
                        return type === 'days'
                            ? value.toLocaleString() + ' days'
                            : compactUSD.format(value);
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}