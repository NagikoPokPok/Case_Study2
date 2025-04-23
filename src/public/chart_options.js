import { formatNumber } from './format_number.js';

export const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        tooltip: {
            callbacks: {
                label: (context) => `${context.label}: $${formatNumber(context.raw)}`
            }
        },
        datalabels: {
            color: '#fff',
            formatter: (value) => formatNumber(value)
        }
    }
};

export const barChartOptions = {
    ...commonChartOptions,
    indexAxis: 'y',
    scales: {
        x: {
            ticks: {
                callback: (value) => '$' + formatNumber(value)
            }
        },
        y: {
            ticks: {
                autoSkip: false,
                maxRotation: 0
            }
        }
    },
    plugins: {
        ...commonChartOptions.plugins,
        legend: {
            display: false
        },
        datalabels: {
            anchor: 'end',
            align: 'right',
            formatter: (value) => formatNumber(value),
            color: '#000',
            font: {
                weight: 'bold',
                size: 11
            }
        }
    }
};

export const pieChartOptions = {
    ...commonChartOptions,
    plugins: {
        ...commonChartOptions.plugins,
        tooltip: {
            callbacks: {
                label: (context) => {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((context.raw / total) * 100).toFixed(1);
                    return `${context.label}: $${formatNumber(context.raw)} (${percentage}%)`;
                }
            }
        }
    }
};