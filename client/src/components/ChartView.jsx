import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PALETTE = [
  'rgba(56, 189, 248, 0.85)',
  'rgba(52, 211, 153, 0.85)',
  'rgba(251, 191, 36, 0.85)',
  'rgba(167, 139, 250, 0.85)',
  'rgba(244, 114, 182, 0.85)',
  'rgba(96, 165, 250, 0.85)',
];

const BORDER_PALETTE = [
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#a78bfa',
  '#f472b6',
  '#60a5fa',
];

export const ChartView = ({ chartData, className = '' }) => {
  const isValid =
    chartData &&
    Array.isArray(chartData.labels) &&
    Array.isArray(chartData.values) &&
    chartData.labels.length > 0 &&
    chartData.values.length > 0;

  const { config, options, chartType } = useMemo(() => {
    if (!isValid) return { config: null, options: null, chartType: 'bar' };

    const type = chartData.type || 'bar';
    const isMultiColor = type === 'pie' || type === 'doughnut';

    const bgColors = isMultiColor
      ? chartData.labels.map((_, i) => PALETTE[i % PALETTE.length])
      : 'rgba(56, 189, 248, 0.25)';

    const borderColors = isMultiColor
      ? chartData.labels.map((_, i) => BORDER_PALETTE[i % BORDER_PALETTE.length])
      : '#38bdf8';

    const dataset = {
      label: chartData.datasetLabel || 'Value',
      data: chartData.values,
      backgroundColor: type === 'bar' ? 'rgba(56, 189, 248, 0.75)' : bgColors,
      borderColor: borderColors,
      borderWidth: 2,
      borderRadius: type === 'bar' ? 8 : 0,
      fill: type === 'line',
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#38bdf8',
    };

    const chartConfig = {
      labels: chartData.labels,
      datasets: [dataset],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: isMultiColor || !!chartData.datasetLabel,
          position: isMultiColor ? 'right' : 'top',
          labels: {
            boxWidth: 12,
            color: '#94a3b8',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 10,
          cornerRadius: 10,
        },
      },
      scales:
        type === 'pie' || type === 'doughnut' || type === 'radar'
          ? {}
          : {
              x: {
                grid: { display: false },
                ticks: {
                  font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                  color: '#64748b',
                },
              },
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                  color: '#64748b',
                },
              },
            },
    };

    return { config: chartConfig, options: chartOptions, chartType: type };
  }, [chartData, isValid]);

  if (!isValid) {
    return (
      <div className={`p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center text-slate-500 text-sm ${className}`}>
        <BarChart3 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <p className="font-semibold text-slate-400">No analytical chart data generated for this concept.</p>
        <p className="text-xs text-slate-600 mt-0.5">The concept explanation is presented fully in text format above.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white/[0.03] p-5 sm:p-6 rounded-2xl border border-white/[0.08] backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-500/15 text-brand-300 border border-brand-500/20 rounded-xl">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">
              {chartData.title || 'Visual Concept Metric Analysis'}
            </h4>
            <p className="text-xs text-slate-500">Auto-generated empirical data visualization</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-mono font-semibold px-2.5 py-1 bg-white/[0.06] border border-white/[0.08] text-slate-300 rounded-lg">
          {chartType} chart
        </span>
      </div>

      <div className="h-64 sm:h-72 w-full relative">
        {chartType === 'line' && <Line data={config} options={options} />}
        {chartType === 'bar' && <Bar data={config} options={options} />}
        {chartType === 'pie' && <Pie data={config} options={options} />}
        {chartType === 'doughnut' && <Doughnut data={config} options={options} />}
        {chartType === 'radar' && <Radar data={config} options={options} />}
      </div>
    </div>
  );
};
