'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { ClickStackHeader } from '../../components/ClickStackHeader';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  Eye,
  EyeOff,
  Table as TableIcon,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

const DEFAULT_TIMESERIES = {
  sourceId: 'src_metric_prod_01',
  granularity: '5m',
  displayType: 'line',
  series: [
    {
      alias: 'P95 Latency (ms)',
      color: '#38bdf8', // ClickStack sky cyan
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
      color: '#f43f5e', // ClickStack rose crimson
      data: [
        { timestamp: '18:00', value: 0.05 },
        { timestamp: '18:05', value: 0.08 },
        { timestamp: '18:10', value: 0.12 },
        { timestamp: '18:15', value: 4.8 },
        { timestamp: '18:20', value: 18.5 },
        { timestamp: '18:25', value: 14.2 },
        { timestamp: '18:30', value: 1.1 },
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

  // 1. AGGREGATED TABLE VIEW (clickstack_table)
  if (data?.shape === 'table' || (data?.columns && data?.rows)) {
    const columns: string[] = data.columns || [];
    const rows: any[] = data.rows || [];

    return (
      <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
        <ClickStackHeader
          sourceName="Metrics"
          sqlQuery={`SELECT ${columns.join(', ')} GROUP BY ...`}
          elapsedMs={19}
          actionButtonText="Timeseries View"
          actionButtonIcon={<TrendingUp className="w-3 h-3" />}
          onRun={() => {
            callTool('clickstack_timeseries', {
              sourceId: data.sourceId || 'src_trace_prod_01',
              select: [{ aggFn: 'avg', valueExpression: 'Duration / 1e6', alias: 'Avg Latency' }],
              granularity: '5m',
            });
          }}
        />

        {/* Subheader */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0e141d] border-b border-[#1c2432] text-xs">
          <div className="flex items-center gap-2">
            <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">Aggregated Metrics Table</span>
            <span className="px-2 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-slate-400 font-mono text-[11px]">
              {rows.length} rows
            </span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            ClickHouse Columnar Aggregation
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-[#1c2432] rounded-md bg-[#0e141d] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1c2432] bg-[#121824] text-slate-400 text-[11px]">
                  {columns.map((col) => (
                    <th key={col} className="py-2.5 px-4 font-semibold uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2432]">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#131924] transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="py-2.5 px-4 text-slate-200">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. TIMESERIES METRICS VIEW (clickstack_timeseries)
  const seriesList = data.series || [];
  const primarySeries = seriesList[0] || { data: [] };
  const timestamps = primarySeries.data.map((d: any) => d.timestamp);

  const toggleSeries = (alias: string) => {
    setActiveSeries((prev) => ({ ...prev, [alias]: !prev[alias] }));
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
      <ClickStackHeader
        sourceName="Metrics"
        sqlQuery="SELECT toStartOfInterval(Timestamp, INTERVAL 5 MINUTE) as t, quantilesExactWeighted(0.95)(Duration) FROM otel.otel_traces GROUP BY t"
        timeRange={data.granularity || '5m'}
        elapsedMs={22}
        secondaryActions={
          <button
            onClick={() => {
              callTool('clickstack_table', {
                sourceId: data.sourceId || 'src_metric_prod_01',
                groupBy: ['ServiceName'],
              });
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#131924] hover:bg-[#182030] border border-[#222c3d] rounded-md text-[11px] text-slate-300 transition-colors"
          >
            <TableIcon className="w-3 h-3 text-sky-400" />
            <span>Table View</span>
          </button>
        }
      />

      {/* Metric Series Toggle Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e141d] border-b border-[#1c2432] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[11px]">Series:</span>
          {seriesList.map((s: any) => {
            const isVisible = activeSeries[s.alias] !== false;
            return (
              <button
                key={s.alias}
                onClick={() => toggleSeries(s.alias)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                  isVisible
                    ? 'bg-[#131924] border-[#222c3d] text-slate-200'
                    : 'bg-[#090d13] border-[#1b2330] text-slate-600'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isVisible ? s.color : '#475569' }}
                />
                <span>{s.alias}</span>
                {isVisible ? (
                  <Eye className="w-3 h-3 text-slate-400 ml-1" />
                ) : (
                  <EyeOff className="w-3 h-3 text-slate-600 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hover inspector readouts */}
        {hoverIndex !== null && (
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-500">
              Time: <span className="text-slate-300">{timestamps[hoverIndex]}</span>
            </span>
            {seriesList.map((s: any) => (
              <span key={s.alias} style={{ color: s.color }}>
                {s.alias}: <span className="font-bold">{s.data[hoverIndex]?.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Timeseries Canvas */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1 border border-[#1c2432] rounded-md bg-[#0e141d] p-4 flex flex-col relative">
          {/* Chart SVG */}
          <div className="flex-1 relative flex items-center justify-center">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="40"
                  y1={`${ratio * 100}%`}
                  x2="100%"
                  y2={`${ratio * 100}%`}
                  stroke="#1c2432"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Vertical guideline for active hover index */}
              {hoverIndex !== null && (
                <line
                  x1={`${40 + (hoverIndex / (timestamps.length - 1)) * (100 - 4)}%`}
                  y1="0"
                  x2={`${40 + (hoverIndex / (timestamps.length - 1)) * (100 - 4)}%`}
                  y2="100%"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Render each visible series line */}
              {seriesList.map((s: any) => {
                if (activeSeries[s.alias] === false) return null;
                const vals = s.data.map((d: any) => d.value);
                const maxVal = Math.max(...vals, 1);
                const points = s.data
                  .map((d: any, idx: number) => {
                    const x = 40 + (idx / (s.data.length - 1)) * 550; // proportional
                    const y = 180 - (d.value / maxVal) * 150;
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <g key={s.alias}>
                    <polyline
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.5"
                      points={points}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {s.data.map((d: any, idx: number) => {
                      const x = 40 + (idx / (s.data.length - 1)) * 550;
                      const y = 180 - (d.value / maxVal) * 150;
                      const isHovered = hoverIndex === idx;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r={isHovered ? 5 : 3}
                          fill="#0b0f15"
                          stroke={s.color}
                          strokeWidth="2"
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoverIndex(idx)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X Axis Time Labels */}
          <div className="flex justify-between pl-10 pt-2 border-t border-[#1c2432] font-mono text-[11px] text-slate-500">
            {timestamps.map((t: string, idx: number) => (
              <span
                key={t}
                onClick={() => setHoverIndex(idx)}
                className={`cursor-pointer hover:text-slate-300 ${
                  hoverIndex === idx ? 'text-emerald-400 font-bold' : ''
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
