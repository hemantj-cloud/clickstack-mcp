'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { TrendingUp, BarChart2, Calendar, ZoomIn, Eye, EyeOff } from 'lucide-react';

const DEFAULT_TIMESERIES = {
  sourceId: 'src_metric_prod_01',
  granularity: '5m',
  displayType: 'line',
  series: [
    {
      alias: 'P95 Latency (ms)',
      color: '#818cf8', // indigo-400
      data: [
        { timestamp: '18:00', value: 142.1 },
        { timestamp: '18:05', value: 155.4 },
        { timestamp: '18:10', value: 160.2 },
        { timestamp: '18:15', value: 680.5 },
        { timestamp: '18:20', value: 2410.8 },
        { timestamp: '18:25', value: 2190.4 },
        { timestamp: '18:30', value: 410.2 },
      ],
    },
    {
      alias: '5xx Error Rate (%)',
      color: '#f43f5e', // rose-500
      data: [
        { timestamp: '18:00', value: 0.05 },
        { timestamp: '18:05', value: 0.08 },
        { timestamp: '18:10', value: 0.12 },
        { timestamp: '18:15', value: 4.80 },
        { timestamp: '18:20', value: 18.50 },
        { timestamp: '18:25', value: 14.20 },
        { timestamp: '18:30', value: 1.10 },
      ],
    },
  ],
};

export default function TimeseriesChartPage() {
  const { data, callTool } = useClickStackWidget(DEFAULT_TIMESERIES);
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    'P95 Latency (ms)': true,
    '5xx Error Rate (%)': true,
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(4); // default to peak

  const toggleSeries = (alias: string) => {
    setActiveSeries(prev => ({ ...prev, [alias]: !prev[alias] }));
  };

  const primarySeries = data.series[0] || { data: [] };
  const timestamps = primarySeries.data.map((d: any) => d.timestamp);
  const maxPrimary = Math.max(...primarySeries.data.map((d: any) => d.value), 1);

  const handleCorrelate = () => {
    callTool('clickstack_event_patterns', {
      sourceId: 'src_log_prod_01',
      where: 'level:error',
      sampleSize: 10000,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-4 font-sans text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-200">Timeseries Metric Analysis</h1>
            <div className="text-[11px] font-mono text-slate-400">
              Granularity: {data.granularity} | Display: {data.displayType}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCorrelate}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-slate-50 font-semibold rounded text-xs transition flex items-center gap-1.5"
          >
            <ZoomIn className="w-3.5 h-3.5" /> Correlate Logs at Spike
          </button>
        </div>
      </div>

      {/* Series Toggles */}
      <div className="flex items-center gap-3 py-2 border-b border-slate-900">
        {data.series.map((s: any) => {
          const isVisible = activeSeries[s.alias] !== false;
          return (
            <button
              key={s.alias}
              onClick={() => toggleSeries(s.alias)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition ${
                isVisible
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-slate-950 border-slate-900 text-slate-600 line-through'
              }`}
            >
              {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#818cf8' }} />
              {s.alias}
            </button>
          );
        })}
      </div>

      {/* Interactive Chart Canvas Simulation */}
      <div className="flex-1 mt-4 flex flex-col justify-between">
        <div className="relative flex-1 bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex items-end justify-between gap-3">
          {/* Anomaly Highlight Box */}
          <div className="absolute top-0 bottom-0 left-[48%] right-[20%] bg-rose-500/10 border-x border-rose-500/30 pointer-events-none flex items-start justify-center pt-2">
            <span className="text-[10px] font-mono text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40">
              Anomaly Window (Peak Surge)
            </span>
          </div>

          {/* Bars / Points */}
          {timestamps.map((t: string, idx: number) => {
            const val = primarySeries.data[idx]?.value || 0;
            const heightPct = Math.max((val / maxPrimary) * 80, 5);
            const isHover = hoverIndex === idx;

            return (
              <div
                key={t}
                onMouseEnter={() => setHoverIndex(idx)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer z-10"
              >
                {/* Tooltip on hover */}
                {isHover && (
                  <div className="absolute top-12 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded shadow-xl text-center font-mono text-[11px] pointer-events-none">
                    <div className="text-slate-400">{t}</div>
                    <div className="text-indigo-400 font-bold">{val.toFixed(1)} ms</div>
                    {data.series[1] && (
                      <div className="text-rose-400">{data.series[1].data[idx]?.value}% Errors</div>
                    )}
                  </div>
                )}

                {/* Column Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[36px] rounded-t transition-all ${
                    isHover
                      ? 'bg-indigo-400 shadow-lg shadow-indigo-500/50'
                      : val > maxPrimary * 0.6
                      ? 'bg-rose-500/80'
                      : 'bg-indigo-500/70 hover:bg-indigo-400'
                  }`}
                />
                <span className="mt-2 text-[10px] font-mono text-slate-400">{t}</span>
              </div>
            );
          })}
        </div>

        {/* Selected Point Info Footer */}
        {hoverIndex !== null && (
          <div className="mt-3 p-2.5 bg-slate-900 border border-slate-800 rounded flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Timestamp: <strong className="text-slate-200">{timestamps[hoverIndex]}</strong></span>
              <span className="text-indigo-400">Latency: <strong>{primarySeries.data[hoverIndex]?.value}ms</strong></span>
              {data.series[1] && (
                <span className="text-rose-400">Errors: <strong>{data.series[1].data[hoverIndex]?.value}%</strong></span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Hover over bars to inspect time slices</span>
          </div>
        )}
      </div>
    </div>
  );
}
