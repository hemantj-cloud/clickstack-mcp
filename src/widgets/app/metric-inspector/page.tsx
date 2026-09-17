'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import {
  Gauge,
  Layers,
  AlertTriangle,
  Database,
  TrendingUp,
  Filter,
  BarChart3,
  Cpu,
  ChevronRight,
  HardDrive,
  Sparkles,
} from 'lucide-react';

const DEFAULT_METRIC = {
  sourceId: 'src_metric_prod_01',
  metricName: 'http.server.duration',
  kind: 'histogram',
  unit: 'ms',
  description: 'Measures the incoming HTTP request handling duration across API microservices',
  summary: {
    min: 4.2,
    p50: 48.5,
    p90: 185.0,
    p95: 410.2,
    p99: 2412.3,
    max: 8420.0,
    avg: 124.6,
  },
  dimensions: [
    { name: 'service.name', cardinality: 12, isHighCardinality: false, sampleValues: ['checkout-service', 'auth-service', 'inventory-service'] },
    { name: 'http.route', cardinality: 54, isHighCardinality: false, sampleValues: ['/api/v1/orders', '/v1/tokens/verify', '/v2/inventory/lock'] },
    { name: 'http.status_code', cardinality: 7, isHighCardinality: false, sampleValues: ['200', '201', '400', '404', '500', '503', '504'] },
    { name: 'cloud.region', cardinality: 3, isHighCardinality: false, sampleValues: ['us-east-1', 'eu-west-1', 'ap-southeast-1'] },
    { name: 'user.guid', cardinality: 284100, isHighCardinality: true, sampleValues: ['u_9a8f...', 'u_12dc...'] },
  ],
  clickhouseAdvice: {
    monthlyRows: '4.8 Billion',
    storageSize: '18.4 GB',
    tableEngine: 'AggregatingMergeTree',
    recommendation: 'Materialize percentile aggregates (quantilesExactWeighted(0.95, 0.99)) with toStartOfMinute(Timestamp) to cut query scan latency by 91%.',
  },
};

export default function MetricInspectorPage() {
  const { data: mcpData, callTool } = useClickStackWidget(DEFAULT_METRIC);
  const data = (mcpData as any)?.metric || mcpData || DEFAULT_METRIC;
  const summary = data.summary || DEFAULT_METRIC.summary;
  const dimensions = data.dimensions || DEFAULT_METRIC.dimensions;
  const advice = data.clickhouseAdvice || DEFAULT_METRIC.clickhouseAdvice;

  const [selectedDimension, setSelectedDimension] = useState<any>(dimensions[0]);
  const [selectedPercentile, setSelectedPercentile] = useState<string>('p95');

  const handlePlotTimeseries = () => {
    callTool('clickstack_timeseries', {
      sourceId: data.sourceId || 'src_metric_prod_01',
      yAxis: [`quantilesExactWeighted(0.95)(${data.metricName || 'http.server.duration'})`],
      granularity: '5m',
      displayType: 'line',
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-4 font-sans text-xs select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm text-slate-100 font-mono">
                {data.metricName || 'http.server.duration'}
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-900/40 text-indigo-300 border border-indigo-800/60 uppercase">
                {data.kind || 'histogram'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                Unit: {data.unit || 'ms'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xl">
              {data.description || 'OpenTelemetry telemetry metric metadata & distribution analysis'}
            </p>
          </div>
        </div>

        <button
          onClick={handlePlotTimeseries}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/20"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Plot in Timeseries
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 mt-4 overflow-hidden">
        {/* Left Column: Latency Distribution & Summary Metrics (7 cols) */}
        <div className="col-span-7 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Percentile Cards */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: 'MIN', val: `${summary.min}ms`, key: 'min' },
              { label: 'P50', val: `${summary.p50}ms`, key: 'p50' },
              { label: 'P90', val: `${summary.p90}ms`, key: 'p90' },
              { label: 'P95', val: `${summary.p95}ms`, key: 'p95', highlight: true },
              { label: 'P99', val: `${summary.p99}ms`, key: 'p99', alert: true },
              { label: 'MAX', val: `${summary.max}ms`, key: 'max' },
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={() => setSelectedPercentile(stat.key)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedPercentile === stat.key
                    ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400">{stat.label}</div>
                <div
                  className={`text-xs font-semibold font-mono mt-0.5 ${
                    stat.alert ? 'text-rose-400' : stat.highlight ? 'text-indigo-400' : 'text-slate-200'
                  }`}
                >
                  {stat.val}
                </div>
              </button>
            ))}
          </div>

          {/* Latency Distribution Histogram Curve (Mock SVG Graphic) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                Empirical Distribution Function (CDF / Probability Density)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Selected: <span className="text-indigo-300 font-bold uppercase">{selectedPercentile}</span>
              </span>
            </div>

            {/* Custom SVG Distribution Curve */}
            <div className="relative h-44 w-full bg-slate-950/60 rounded border border-slate-800/80 flex items-end p-3 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="curveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area under curve */}
                <path
                  d="M 0 155 Q 80 150 140 120 T 260 20 T 380 130 T 500 155 L 500 160 L 0 160 Z"
                  fill="url(#curveGrad)"
                />
                {/* Distribution Line */}
                <path
                  d="M 0 155 Q 80 150 140 120 T 260 20 T 380 130 T 500 155"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                />
                {/* Selected percentile marker line */}
                <line x1="380" y1="0" x2="380" y2="160" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
              <div className="absolute top-3 right-5 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded text-[10px] font-mono text-rose-300">
                Tail Anomaly Region (&gt;2000ms)
              </div>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span>0ms</span>
              <span>p50 (48.5ms)</span>
              <span>p95 (410ms)</span>
              <span>p99 (2412ms)</span>
              <span>8000ms+</span>
            </div>
          </div>

          {/* ClickHouse Storage Engine & Materialized Rollup Advice */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Database className="w-3.5 h-3.5" />
                ClickHouse Rollup &amp; AggregatingMergeTree Advisor
              </span>
              <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60">
                Optimization Available
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
              <div className="bg-slate-950/70 p-2 rounded border border-slate-800 font-mono space-y-1">
                <div className="text-slate-500 text-[10px]">CURRENT FOOTPRINT</div>
                <div className="text-slate-200 font-bold">{advice.monthlyRows} / month</div>
                <div className="text-slate-400">Compressed: {advice.storageSize} (ZSTD)</div>
              </div>

              <div className="bg-slate-950/70 p-2 rounded border border-slate-800 font-mono space-y-1">
                <div className="text-slate-500 text-[10px]">RECOMMENDED ENGINE</div>
                <div className="text-emerald-400 font-bold">{advice.tableEngine}</div>
                <div className="text-slate-400">Target reduction: 92% speedup</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic pt-1">
              💡 &quot;{advice.recommendation}&quot;
            </p>
          </div>
        </div>

        {/* Right Column: Dimension Cardinality Cloud (5 cols) */}
        <div className="col-span-5 flex flex-col gap-3 bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Dimension Cardinality Cloud
            </span>
            <span className="text-[10px] text-slate-400">{dimensions.length} dimensions</span>
          </div>

          {/* Cardinality List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {dimensions.map((dim: any) => {
              const isSelected = selectedDimension?.name === dim.name;
              return (
                <div
                  key={dim.name}
                  onClick={() => setSelectedDimension(dim)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-xs text-slate-200">{dim.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        dim.isHighCardinality
                          ? 'bg-rose-950/70 border-rose-600/70 text-rose-300 font-semibold'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {dim.cardinality.toLocaleString()} unique
                    </span>
                  </div>

                  {dim.isHighCardinality && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-rose-400 font-medium">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>High Cardinality Warning: Avoid grouping without index</span>
                    </div>
                  )}

                  {/* Sample values */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dim.sampleValues.map((v: string) => (
                      <span
                        key={v}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected dimension drilldown action */}
          {selectedDimension && (
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] space-y-2">
              <div className="font-semibold text-slate-300">
                Filter by dimension: <span className="text-indigo-400 font-mono">{selectedDimension.name}</span>
              </div>
              <button
                onClick={() => {
                  callTool('clickstack_timeseries', {
                    sourceId: data.sourceId || 'src_metric_prod_01',
                    groupBy: selectedDimension.name,
                    granularity: '5m',
                  });
                }}
                className="w-full py-1.5 px-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs text-center transition-colors"
              >
                Group Timeseries by {selectedDimension.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
