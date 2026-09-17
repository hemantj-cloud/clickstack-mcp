'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { TrendingUp, BarChart2, Calendar, ZoomIn, Eye, EyeOff, Table as TableIcon, Layers } from 'lucide-react';

const DEFAULT_TIMESERIES = {
  sourceId: 'src_metric_prod_01',
  granularity: '5m',
  displayType: 'line',
  series: [
    {
      alias: 'P95 Latency (ms)',
      color: '#818cf8',
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
      color: '#f43f5e',
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
  const { data: rawData, callTool } = useClickStackWidget<any>(DEFAULT_TIMESERIES);
  const data = rawData || DEFAULT_TIMESERIES;

  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    'P95 Latency (ms)': true,
    '5xx Error Rate (%)': true,
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(4);

  // 1. TABLE SHAPE VIEW (clickstack_table)
  if (data?.shape === 'table' || (data?.columns && data?.rows)) {
    const columns: string[] = data.columns || [];
    const rows: any[] = data.rows || [];

    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-md shadow-indigo-950/50">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-slate-100 tracking-tight">Aggregated Metrics Table</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/60">
                  {rows.length} rows
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-dimensional aggregated metrics grouped by partition
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              callTool('clickstack_timeseries', {
                sourceId: data.sourceId || 'src_trace_prod_01',
                select: [{ aggFn: 'avg', valueExpression: 'Duration / 1e6', alias: 'Avg Latency' }],
                granularity: '5m',
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Switch to Timeseries View
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto mt-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
                {columns.map((col) => (
                  <th key={col} className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className="py-3 px-4">
                      {typeof row[col] === 'number'
                        ? row[col].toLocaleString()
                        : String(row[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. TIMESERIES LINE CHART VIEW (clickstack_timeseries)
  const series = data.series || DEFAULT_TIMESERIES.series;
  const primarySeries = series[0] || { data: [] };
  const timestamps = primarySeries.data.map((d: any) => d.timestamp);
  const maxPrimary = Math.max(...primarySeries.data.map((d: any) => d.value), 1);

  const toggleSeries = (alias: string) => {
    setActiveSeries(prev => ({ ...prev, [alias]: !prev[alias] }));
  };

  const handleCorrelate = () => {
    callTool('clickstack_event_patterns', {
      sourceId: data.sourceId || 'src_log_prod_01',
      where: 'level:error',
      sampleSize: 10000,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/50">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">Timeseries Metric Analysis</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-900/50 text-indigo-300 border border-indigo-700/60">
                {data.granularity || '5m'} buckets
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              Display: {data.displayType || 'line'} | Source: {data.sourceId || 'src_metric_prod_01'}
            </div>
          </div>
        </div>

        <button
          onClick={handleCorrelate}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
        >
          <ZoomIn className="w-3.5 h-3.5" /> Correlate Logs at Spike
        </button>
      </div>

      {/* Series Toggles */}
      <div className="flex items-center gap-2 py-3 border-b border-slate-900">
        {series.map((s: any) => {
          const isVisible = activeSeries[s.alias] !== false;
          return (
            <button
              key={s.alias}
              onClick={() => toggleSeries(s.alias)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                isVisible
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-slate-950 border-slate-900 text-slate-600 line-through'
              }`}
            >
              {isVisible ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || '#818cf8' }} />
              {s.alias}
            </button>
          );
        })}
      </div>

      {/* Interactive Chart Canvas Simulation */}
      <div className="flex-1 mt-4 flex flex-col justify-between">
        <div className="relative flex-1 bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-end justify-between gap-3 overflow-hidden shadow-sm">
          {/* Anomaly Highlight Box */}
          <div className="absolute top-0 bottom-0 left-[48%] right-[20%] bg-rose-500/10 border-x border-rose-500/30 pointer-events-none flex items-start justify-center pt-3">
            <span className="text-[10px] font-mono text-rose-400 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 font-semibold shadow-sm">
              Anomaly Window (Peak Surge)
            </span>
          </div>

          {timestamps.map((t: string, idx: number) => {
            const pVal = primarySeries.data[idx]?.value || 0;
            const hPct = Math.min(95, Math.max(5, (pVal / maxPrimary) * 100));
            const isHovered = hoverIndex === idx;

            return (
              <div
                key={t}
                onMouseEnter={() => setHoverIndex(idx)}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
              >
                {isHovered && (
                  <div className="mb-2 p-2 rounded-lg bg-slate-950 border border-slate-700 text-[10px] font-mono text-center shadow-lg pointer-events-none z-10 space-y-0.5">
                    <div className="text-slate-400">{t}</div>
                    {series.map((s: any) => (
                      <div key={s.alias} className="font-bold" style={{ color: s.color || '#818cf8' }}>
                        {s.alias}: {s.data[idx]?.value}
                      </div>
                    ))}
                  </div>
                )}

                <div className="w-full max-w-[36px] bg-slate-950/80 rounded-t-lg overflow-hidden flex items-end h-full">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      idx >= 3 && idx <= 5
                        ? 'bg-gradient-to-t from-rose-600 to-amber-500'
                        : 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                    } ${isHovered ? 'brightness-125 ring-2 ring-indigo-400' : ''}`}
                    style={{ height: `${hPct}%` }}
                  />
                </div>

                <span className={`text-[10px] font-mono ${isHovered ? 'text-indigo-300 font-bold' : 'text-slate-500'}`}>
                  {t}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend / Stats Footer */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono">
            <div className="text-[10px] text-slate-500">MAX METRIC VALUE</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">{maxPrimary.toFixed(1)}</div>
          </div>
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono">
            <div className="text-[10px] text-slate-500">PEAK ANOMALY WINDOW</div>
            <div className="text-sm font-bold text-rose-400 mt-0.5">18:15 – 18:25</div>
          </div>
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono">
            <div className="text-[10px] text-slate-500">TOTAL BUCKETS</div>
            <div className="text-sm font-bold text-indigo-300 mt-0.5">{timestamps.length} points</div>
          </div>
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono">
            <div className="text-[10px] text-slate-500">RECOMMENDED ACTION</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5 truncate">Check Log Drain Clusters</div>
          </div>
        </div>
      </div>
    </div>
  );
}
