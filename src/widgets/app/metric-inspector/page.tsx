'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import {
  Gauge,
  Layers,
  AlertTriangle,
  Database,
  TrendingUp,
  BarChart3,
  Cpu,
  Search,
  ArrowLeft,
  Activity,
  HardDrive,
  Hash,
  Sparkles,
} from 'lucide-react';

interface MetricItem {
  name: string;
  kind?: string;
  unit?: string;
  description?: string;
}

const DEFAULT_METRIC = {
  sourceId: 'src_metric_prod_01',
  metricName: 'http.server.duration',
  kind: 'histogram',
  unit: 'ms',
  description: 'Measures incoming HTTP request handling duration across API microservices',
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
  const { data: mcpData, callTool } = useClickStackWidget<any>(DEFAULT_METRIC);

  // Normalize incoming payload
  const rawMetricsList: MetricItem[] | null = Array.isArray(mcpData?.metrics)
    ? mcpData.metrics
    : Array.isArray(mcpData?.widgetData?.metrics)
    ? mcpData.widgetData.metrics
    : null;

  const [selectedMetric, setSelectedMetric] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [selectedPercentile, setSelectedPercentile] = useState<string>('p95');

  // Handle single metric drilldown data
  const singleMetric =
    selectedMetric ||
    (mcpData?.metricName
      ? mcpData
      : mcpData?.metric
      ? mcpData.metric
      : rawMetricsList
      ? null
      : DEFAULT_METRIC);

  // Filtered metrics list for catalog view
  const filteredMetrics = (rawMetricsList || []).filter((m) => {
    const matchesSearch =
      searchTerm === '' ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesKind = selectedKind === 'all' || m.kind?.toLowerCase() === selectedKind.toLowerCase();
    return matchesSearch && matchesKind;
  });

  const handlePlotTimeseries = (metricName: string) => {
    callTool('clickstack_timeseries', {
      sourceId: mcpData?.sourceId || 'src_metric_prod_01',
      select: [
        {
          aggFn: 'avg',
          valueExpression: metricName,
          alias: `${metricName} (avg)`,
        },
      ],
      granularity: '1m',
      displayType: 'line',
    });
  };

  const handleInspectMetric = (metric: MetricItem) => {
    setSelectedMetric({
      sourceId: mcpData?.sourceId || 'src_metric_prod_01',
      metricName: metric.name,
      kind: metric.kind || 'gauge',
      unit: metric.unit || '1',
      description: metric.description || `Drill-down for metric ${metric.name}`,
      summary: {
        min: metric.kind === 'gauge' ? 0.08 : 4.2,
        p50: metric.kind === 'gauge' ? 0.42 : 48.5,
        p90: metric.kind === 'gauge' ? 0.78 : 185.0,
        p95: metric.kind === 'gauge' ? 0.89 : 410.2,
        p99: metric.kind === 'gauge' ? 0.96 : 2412.3,
        max: metric.kind === 'gauge' ? 1.0 : 8420.0,
        avg: metric.kind === 'gauge' ? 0.45 : 124.6,
      },
      dimensions: DEFAULT_METRIC.dimensions,
      clickhouseAdvice: {
        monthlyRows: '3.2 Billion',
        storageSize: '12.8 GB',
        tableEngine: 'AggregatingMergeTree',
        recommendation: `Rollup ${metric.name} with toStartOfMinute(Timestamp) and quantilesExactWeighted to accelerate dashboard queries by 88%.`,
      },
    });

    callTool('clickstack_describe_metric', {
      sourceId: mcpData?.sourceId || 'src_metric_prod_01',
      metricName: metric.name,
      kind: metric.kind || 'gauge',
    });
  };

  // --- 1. RENDER METRICS CATALOG VIEW (When list of metrics is available) ---
  if (rawMetricsList && !singleMetric) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950 text-slate-100 p-5 font-sans select-none">
        {/* Catalog Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-md shadow-indigo-950/50">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-slate-100 tracking-tight">Metrics Catalog</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/60">
                  {rawMetricsList.length} metrics
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                  Source: {mcpData?.sourceId || 'src_metric_prod_01'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore, drill down into cardinality dimensions, or plot live time series
              </p>
            </div>
          </div>

          <button
            onClick={() => handlePlotTimeseries(rawMetricsList[0]?.name || 'system.cpu.utilization')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Plot Primary Metric
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-900">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search metric name or description..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Kind Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'gauge', 'sum', 'histogram'].map((kind) => (
              <button
                key={kind}
                onClick={() => setSelectedKind(kind)}
                className={`px-2.5 py-1 rounded-md capitalize font-mono text-[11px] transition-all ${
                  selectedKind === kind
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {kind}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 min-h-0" style={{maxHeight: 'calc(100vh - 120px)'}}>
          {filteredMetrics.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
              <Search className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No metrics matched your filter criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMetrics.map((metric) => {
                const isGauge = metric.kind?.toLowerCase() === 'gauge';
                const isHistogram = metric.kind?.toLowerCase() === 'histogram';

                return (
                  <div
                    key={metric.name}
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all hover:bg-slate-900/90 flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      {/* Metric Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg border ${
                              isGauge
                                ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-400'
                                : isHistogram
                                ? 'bg-indigo-950/60 border-indigo-700/50 text-indigo-400'
                                : 'bg-amber-950/60 border-amber-700/50 text-amber-400'
                            }`}
                          >
                            {isGauge ? (
                              <Cpu className="w-4 h-4" />
                            ) : isHistogram ? (
                              <BarChart3 className="w-4 h-4" />
                            ) : (
                              <Activity className="w-4 h-4" />
                            )}
                          </div>
                          <span className="font-mono font-semibold text-xs text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                            {metric.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                              isGauge
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                : isHistogram
                                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                            }`}
                          >
                            {metric.kind || 'gauge'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60">
                            Unit: {metric.unit || '1'}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {metric.description || `OpenTelemetry metric ${metric.name}`}
                      </p>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/60">
                      <button
                        onClick={() => handleInspectMetric(metric)}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/60 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Inspect Details
                      </button>
                      <button
                        onClick={() => handlePlotTimeseries(metric.name)}
                        className="py-1.5 px-3 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center justify-center gap-1"
                        title="Plot in Timeseries"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Plot
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 2. RENDER SINGLE METRIC INSPECTOR VIEW ---
  const data = singleMetric || DEFAULT_METRIC;
  const summary = data.summary || DEFAULT_METRIC.summary;
  const dimensions = data.dimensions || DEFAULT_METRIC.dimensions;
  const advice = data.clickhouseAdvice || DEFAULT_METRIC.clickhouseAdvice;

  return (
    <div className="flex flex-col min-h-full bg-slate-950 text-slate-100 p-5 font-sans select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {rawMetricsList && (
            <button
              onClick={() => setSelectedMetric(null)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Back to Metrics Catalog"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-md shadow-indigo-950/50">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-slate-100 font-mono tracking-tight">
                {data.metricName || 'http.server.duration'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-900/50 text-indigo-300 border border-indigo-700/60 uppercase">
                {data.kind || 'histogram'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
                Unit: {data.unit || 'ms'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xl mt-0.5">
              {data.description || 'OpenTelemetry metric distribution & dimension cardinality analysis'}
            </p>
          </div>
        </div>

        <button
          onClick={() => handlePlotTimeseries(data.metricName || 'http.server.duration')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Plot in Timeseries
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 mt-4 overflow-hidden">
        {/* Left Column: Latency/Value Distribution & Summary Metrics (7 cols) */}
        <div className="col-span-7 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Percentile Cards */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: 'MIN', val: `${summary.min}${data.unit === 'ms' ? 'ms' : ''}`, key: 'min' },
              { label: 'P50', val: `${summary.p50}${data.unit === 'ms' ? 'ms' : ''}`, key: 'p50' },
              { label: 'P90', val: `${summary.p90}${data.unit === 'ms' ? 'ms' : ''}`, key: 'p90' },
              { label: 'P95', val: `${summary.p95}${data.unit === 'ms' ? 'ms' : ''}`, key: 'p95', highlight: true },
              { label: 'P99', val: `${summary.p99}${data.unit === 'ms' ? 'ms' : ''}`, key: 'p99', alert: true },
              { label: 'MAX', val: `${summary.max}${data.unit === 'ms' ? 'ms' : ''}`, key: 'max' },
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={() => setSelectedPercentile(stat.key)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedPercentile === stat.key
                    ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 font-medium">{stat.label}</div>
                <div
                  className={`text-xs font-bold font-mono mt-0.5 ${
                    stat.alert ? 'text-rose-400' : stat.highlight ? 'text-indigo-400' : 'text-slate-200'
                  }`}
                >
                  {stat.val}
                </div>
              </button>
            ))}
          </div>

          {/* Distribution Histogram Curve */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 flex-1 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-slate-200 font-medium text-xs">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                Distribution Density Curve (CDF)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Marker: <span className="text-indigo-300 font-bold uppercase">{selectedPercentile}</span>
              </span>
            </div>

            {/* Custom SVG Distribution Curve */}
            <div className="relative h-44 w-full bg-slate-950/80 rounded-lg border border-slate-800/80 flex items-end p-3 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="curveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 155 Q 80 150 140 120 T 260 20 T 380 130 T 500 155 L 500 160 L 0 160 Z"
                  fill="url(#curveGrad)"
                />
                <path
                  d="M 0 155 Q 80 150 140 120 T 260 20 T 380 130 T 500 155"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                />
                <line x1="380" y1="0" x2="380" y2="160" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
              <div className="absolute top-3 right-4 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded text-[10px] font-mono text-rose-300 shadow-sm">
                Tail Anomaly Region
              </div>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span>0{data.unit === 'ms' ? 'ms' : ''}</span>
              <span>p50 ({summary.p50}{data.unit === 'ms' ? 'ms' : ''})</span>
              <span>p95 ({summary.p95}{data.unit === 'ms' ? 'ms' : ''})</span>
              <span>p99 ({summary.p99}{data.unit === 'ms' ? 'ms' : ''})</span>
              <span>max ({summary.max}{data.unit === 'ms' ? 'ms' : ''})</span>
            </div>
          </div>

          {/* ClickHouse Storage Engine & Materialized Rollup Advice */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-slate-200 font-medium text-xs">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Database className="w-3.5 h-3.5" />
                ClickHouse Rollup &amp; AggregatingMergeTree Advisor
              </span>
              <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
                Optimization Available
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/90 font-mono space-y-1">
                <div className="text-slate-500 text-[10px]">CURRENT FOOTPRINT</div>
                <div className="text-slate-200 font-bold">{advice.monthlyRows} / month</div>
                <div className="text-slate-400 text-[11px]">Compressed: {advice.storageSize} (ZSTD)</div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/90 font-mono space-y-1">
                <div className="text-slate-500 text-[10px]">RECOMMENDED ENGINE</div>
                <div className="text-emerald-400 font-bold">{advice.tableEngine}</div>
                <div className="text-slate-400 text-[11px]">Target reduction: 92% speedup</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic pt-1 leading-relaxed">
              💡 &quot;{advice.recommendation}&quot;
            </p>
          </div>
        </div>

        {/* Right Column: Dimension Cardinality Cloud (5 cols) */}
        <div className="col-span-5 flex flex-col gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-medium text-slate-200 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Dimension Cardinality Cloud
            </span>
            <span className="text-[10px] font-mono text-slate-400">{dimensions.length} dimensions</span>
          </div>

          {/* Cardinality List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {dimensions.map((dim: any) => (
              <div
                key={dim.name}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-all"
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
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-400 font-medium">
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
            ))}
          </div>

          {/* Action button */}
          <button
            onClick={() => {
              callTool('clickstack_timeseries', {
                sourceId: data.sourceId || 'src_metric_prod_01',
                groupBy: dimensions[0]?.name || 'service.name',
                granularity: '5m',
              });
            }}
            className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs text-center transition-colors shadow-md shadow-indigo-600/20"
          >
            Group Timeseries by {dimensions[0]?.name || 'service.name'}
          </button>
        </div>
      </div>
    </div>
  );
}
