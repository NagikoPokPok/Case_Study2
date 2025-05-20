

export const compactUSD = new Intl.NumberFormat('en', {
  notation:    'compact',
  style:       'currency',
  currency:    'USD',
  // keep one decimal place for billions, millions, etc
  maximumFractionDigits: 1
});

export const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        tooltip: {
            callbacks: {
                label: (context) => `${context.label}: ${compactUSD.format(context.raw)}`
            }
        },
        datalabels: {
            color: '#fff',
            formatter: (value) => compactUSD.format(value)
        }
    }
};

export const barChartOptions = {
    ...commonChartOptions,
    indexAxis: 'y',
    scales: {
        x: {
            ticks: {
                callback: value => compactUSD.format(value),
            }
        },
        y: {
            ticks: {
                callback: value => compactUSD.format(value),
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
            formatter: (value) => compactUSD.format(value),
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
                    return `${context.label}: ${compactUSD.format(context.raw)} (${percentage}%)`;
                }
            }
        }
    }
};