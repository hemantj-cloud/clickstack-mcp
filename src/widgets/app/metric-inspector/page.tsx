'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { ClickStackHeader } from '../../components/ClickStackHeader';
import {
  Gauge,
  Layers,
  Database,
  TrendingUp,
  BarChart3,
  Search,
  ArrowLeft,
  Activity,
  HardDrive,
  Hash,
  Sparkles,
  AlertTriangle,
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
  const data = mcpData || DEFAULT_METRIC;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const isListMode = Array.isArray(data?.metrics) || Array.isArray(data?.data?.metrics);
  const metricsList: MetricItem[] = isListMode
    ? (data.metrics || data.data.metrics)
    : [];

  const filteredMetrics = metricsList.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 1. CATALOG / LIST VIEW (clickstack_list_metrics)
  if (isListMode && !selectedMetric) {
    return (
      <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
        <ClickStackHeader
          sourceName="Metrics"
          sqlQuery="SELECT MetricName, Unit, Description FROM otel.otel_metrics_gauge GROUP BY MetricName"
          elapsedMs={15}
        />

        {/* Action Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0e141d] border-b border-[#1c2432] text-xs">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">OpenTelemetry Metrics Catalog</span>
            <span className="px-2 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-slate-400 font-mono text-[11px]">
              {metricsList.length} metrics
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 pl-7 pr-2 py-0.5 bg-[#090d13] border border-[#1b2330] rounded text-xs text-slate-200 placeholder-slate-500 font-mono outline-none"
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-[#1c2432] rounded-md bg-[#0e141d] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1c2432] bg-[#121824] text-slate-400 text-[11px]">
                  <th className="py-2.5 px-4 w-72">METRIC NAME</th>
                  <th className="py-2.5 px-4 w-28">KIND</th>
                  <th className="py-2.5 px-4 w-24">UNIT</th>
                  <th className="py-2.5 px-4">DESCRIPTION</th>
                  <th className="py-2.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2432]">
                {filteredMetrics.map((m) => (
                  <tr key={m.name} className="hover:bg-[#131924] transition-colors">
                    <td className="py-2.5 px-4 font-bold text-emerald-400">
                      {m.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-slate-300 text-[10px]">
                        {m.kind || 'gauge'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {m.unit || '1'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans text-xs">
                      {m.description || 'OpenTelemetry metric'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => {
                          callTool('clickstack_describe_metric', {
                            metricName: m.name,
                          });
                        }}
                        className="px-2 py-1 bg-[#131924] hover:bg-[#1c2432] border border-[#222c3d] rounded text-[11px] text-slate-200 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. DETAILED METRIC INSPECTION VIEW (clickstack_describe_metric)
  const metric = data;
  const summary = metric.summary || DEFAULT_METRIC.summary;
  const dimensions = metric.dimensions || DEFAULT_METRIC.dimensions;
  const advice = metric.clickhouseAdvice || DEFAULT_METRIC.clickhouseAdvice;

  return (
    <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
      <ClickStackHeader
        sourceName="Metrics"
        sqlQuery={`SELECT quantilesExactWeighted(0.5, 0.95, 0.99)(Value) FROM otel.otel_metrics_gauge WHERE MetricName = '${metric.metricName}'`}
        elapsedMs={14}
        actionButtonText="Plot Timeseries"
        actionButtonIcon={<TrendingUp className="w-3 h-3" />}
        onRun={() => {
          callTool('clickstack_timeseries', {
            sourceId: metric.sourceId || 'src_metric_prod_01',
            select: [{ aggFn: 'avg', valueExpression: 'Value', alias: metric.metricName }],
            granularity: '5m',
          });
        }}
      />

      {/* Metric Header Ribbon */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e141d] border-b border-[#1c2432] text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-slate-100">{metric.metricName}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-emerald-400 font-mono text-[11px]">
            {metric.kind || 'histogram'} ({metric.unit || 'ms'})
          </span>
          <span className="text-slate-400 text-xs truncate max-w-lg">{metric.description}</span>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          ClickHouse Columnar Inspection
        </div>
      </div>

      {/* Main Grid: Percentiles + Dimensions + Engine Advice */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Percentiles Bar */}
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Percentile Distribution
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 font-mono">
            {[
              { label: 'MIN', val: summary.min, color: 'text-slate-300' },
              { label: 'P50 (Median)', val: summary.p50, color: 'text-slate-200' },
              { label: 'AVG', val: summary.avg, color: 'text-slate-300' },
              { label: 'P90', val: summary.p90, color: 'text-sky-400' },
              { label: 'P95', val: summary.p95, color: 'text-amber-400' },
              { label: 'P99', val: summary.p99, color: 'text-rose-400' },
              { label: 'MAX', val: summary.max, color: 'text-rose-500' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-2.5 rounded bg-[#0e141d] border border-[#1c2432] text-center"
              >
                <div className="text-[10px] text-slate-500">{stat.label}</div>
                <div className={`text-sm font-bold mt-0.5 ${stat.color}`}>
                  {stat.val} <span className="text-[10px] font-normal text-slate-500">{metric.unit || 'ms'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dimensions & Cardinality Table */}
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Dimensions & Cardinality Audit
          </div>
          <div className="border border-[#1c2432] rounded-md bg-[#0e141d] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1c2432] bg-[#121824] text-slate-400 text-[11px]">
                  <th className="py-2.5 px-4 w-64">DIMENSION NAME</th>
                  <th className="py-2.5 px-4 w-36">CARDINALITY</th>
                  <th className="py-2.5 px-4 w-36">STATUS</th>
                  <th className="py-2.5 px-4">SAMPLE VALUES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2432]">
                {dimensions.map((dim: any) => (
                  <tr key={dim.name} className="hover:bg-[#131924] transition-colors">
                    <td className="py-2 px-4 text-slate-200 font-semibold">{dim.name}</td>
                    <td className="py-2 px-4 text-slate-300">{dim.cardinality?.toLocaleString()}</td>
                    <td className="py-2 px-4">
                      {dim.isHighCardinality ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                          HIGH CARDINALITY
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                          OK (Low)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-slate-400 text-[11px] truncate">
                      {dim.sampleValues?.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ClickHouse Table Optimization Advice */}
        {advice && (
          <div className="p-3.5 rounded-md bg-[#0e141d] border border-[#1c2432] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>ClickHouse Storage & Aggregation Architecture</span>
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-2 rounded bg-[#090d13] border border-[#1b2330]">
                <div className="text-slate-500 text-[10px]">MONTHLY SCAN VOLUME</div>
                <div className="text-slate-200 font-bold mt-0.5">{advice.monthlyRows}</div>
              </div>
              <div className="p-2 rounded bg-[#090d13] border border-[#1b2330]">
                <div className="text-slate-500 text-[10px]">COMPRESSED FOOTPRINT</div>
                <div className="text-slate-200 font-bold mt-0.5">{advice.storageSize}</div>
              </div>
              <div className="p-2 rounded bg-[#090d13] border border-[#1b2330]">
                <div className="text-slate-500 text-[10px]">RECOMMENDED ENGINE</div>
                <div className="text-emerald-400 font-bold mt-0.5">{advice.tableEngine}</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-1 leading-relaxed">
              <span className="text-slate-200 font-semibold">Engine Advice:</span> {advice.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
