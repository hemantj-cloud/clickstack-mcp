'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { ClickStackHeader } from '../../components/ClickStackHeader';
import {
  Clock,
  Layers,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Activity,
  Zap,
  Flame,
  Database,
  Search,
  Filter,
  SlidersHorizontal,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

const DEFAULT_TRACE = {
  traceId: '7b3f9104e1a89c2fa394bc21890e44b1',
  rootService: 'checkout-service',
  durationMs: 2412.35,
  sourceId: 'src_trace_prod_01',
  spans: [
    {
      spanId: 'span_01',
      parentSpanId: null,
      serviceName: 'checkout-service',
      spanName: 'POST /api/v1/orders/checkout',
      statusCode: 'error',
      startOffsetMs: 0,
      durationMs: 2412.35,
      durationNs: 2412350000,
      attributes: { 'http.method': 'POST', 'http.status_code': '500', 'user.id': 'usr_94821', 'cloud.region': 'us-east-1' },
      logs: [
        { timestamp: '18:22:00.100', level: 'INFO', message: 'Order checkout initiated for cart #84210' },
        { timestamp: '18:22:02.400', level: 'ERROR', message: 'Downstream database lock timeout exceeded' },
      ],
    },
    {
      spanId: 'span_02',
      parentSpanId: 'span_01',
      serviceName: 'auth-service',
      spanName: 'POST /v1/tokens/verify',
      statusCode: 'ok',
      startOffsetMs: 12.4,
      durationMs: 45.2,
      durationNs: 45200000,
      attributes: { 'http.method': 'POST', 'http.status_code': '200', 'auth.type': 'Bearer' },
      logs: [],
    },
    {
      spanId: 'span_03',
      parentSpanId: 'span_01',
      serviceName: 'inventory-service',
      spanName: 'POST /v2/inventory/lock',
      statusCode: 'error',
      startOffsetMs: 65.1,
      durationMs: 2210.8,
      durationNs: 2210800000,
      isCriticalPath: true,
      attributes: {
        'db.system': 'postgresql',
        'db.statement': 'SELECT * FROM inventory WHERE product_id = 9842 FOR UPDATE',
        'error.type': 'LockTimeoutException',
      },
      logs: [
        { timestamp: '18:22:00.200', level: 'INFO', message: 'Acquiring lock on row #9842' },
        { timestamp: '18:22:02.350', level: 'WARN', message: 'Transaction wait timeout exceeded (>2000ms)' },
      ],
    },
    {
      spanId: 'span_04',
      parentSpanId: 'span_03',
      serviceName: 'postgres-db',
      spanName: 'query: SELECT * FOR UPDATE',
      statusCode: 'error',
      startOffsetMs: 70.0,
      durationMs: 2200.0,
      durationNs: 2200000000,
      isCriticalPath: true,
      attributes: { 'db.table': 'inventory', 'db.operation': 'SELECT' },
      logs: [],
    },
    {
      spanId: 'span_05',
      parentSpanId: 'span_01',
      serviceName: 'payment-service',
      spanName: 'POST /v1/charges',
      statusCode: 'ok',
      startOffsetMs: 2280.0,
      durationMs: 120.0,
      durationNs: 120000000,
      attributes: { 'payment.provider': 'stripe', 'http.status_code': '200' },
      logs: [],
    },
  ],
};

const SERVICE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  'checkout-service': { bg: 'bg-emerald-950/60', text: 'text-emerald-400', bar: '#10b981' },
  'auth-service': { bg: 'bg-sky-950/60', text: 'text-sky-400', bar: '#38bdf8' },
  'inventory-service': { bg: 'bg-rose-950/60', text: 'text-rose-400', bar: '#f43f5e' },
  'postgres-db': { bg: 'bg-amber-950/60', text: 'text-amber-400', bar: '#f59e0b' },
  'payment-service': { bg: 'bg-indigo-950/60', text: 'text-indigo-400', bar: '#818cf8' },
};

export default function TraceWaterfallPage() {
  const { data: rawData, callTool } = useClickStackWidget<any>(DEFAULT_TRACE);
  const data = rawData || DEFAULT_TRACE;

  const [selectedSpan, setSelectedSpan] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. TOP TIME CONSUMING OPERATIONS SUB-VIEW
  if (data?.operations && Array.isArray(data.operations)) {
    const ops = data.operations;
    const totalTraces = data.totalTracesAnalyzed || 0;
    const parentFilter = data.parentFilter || 'All parent spans';

    return (
      <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
        <ClickStackHeader
          sourceName="Traces"
          sqlQuery="SELECT SpanName, sum(Duration), count() GROUP BY SpanName ORDER BY sum(Duration) DESC"
          searchFilter={parentFilter}
          elapsedMs={24}
          actionButtonText="Inspect Trace"
          actionButtonIcon={<Activity className="w-3 h-3" />}
          onRun={() => {
            callTool('clickstack_trace_waterfall', {
              sourceId: data.sourceId || 'src_trace_prod_01',
              pickFilter: parentFilter,
              pickBy: 'slowest',
            });
          }}
        />

        {/* Action / Context Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e141d] border-b border-[#1c2432] text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Top Time-Consuming Operations</span>
            <span className="px-2 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-slate-400 font-mono text-[11px]">
              {ops.length} ranked
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              across {totalTraces.toLocaleString()} traces
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            ClickHouse Columnar Latency Breakdown
          </div>
        </div>

        {/* Operations Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-[#1c2432] rounded-md bg-[#0e141d] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1c2432] bg-[#121824] text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">RANK</th>
                  <th className="py-2.5 px-3">OPERATION</th>
                  <th className="py-2.5 px-3">SERVICE</th>
                  <th className="py-2.5 px-3 w-64">TIME CONTRIBUTION</th>
                  <th className="py-2.5 px-3 text-right">AVG LATENCY</th>
                  <th className="py-2.5 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2432]">
                {ops.map((op: any, index: number) => {
                  const isTop = index === 0;
                  const pct = op.percentageOfTotalTime || 0;

                  return (
                    <tr
                      key={op.operationName}
                      className="hover:bg-[#131924] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 font-bold">
                        #{index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${isTop ? 'text-rose-400' : 'text-slate-200'}`}>
                          {op.operationName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-slate-300 text-[11px]">
                          {op.serviceName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#090d13] border border-[#1b2330] rounded-sm overflow-hidden">
                            <div
                              className={`h-full ${
                                pct > 50
                                  ? 'bg-rose-500'
                                  : pct > 20
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(2, pct)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-300 w-12 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {op.averageDurationMs?.toFixed(1) || op.averageDurationMs} ms
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            callTool('clickstack_event_deltas', {
                              sourceId: data.sourceId || 'src_trace_prod_01',
                              target: { where: `SpanName = '${op.operationName}'`, whereLanguage: 'sql' },
                              baseline: { where: `SpanName != '${op.operationName}'`, whereLanguage: 'sql' },
                            });
                          }}
                          className="px-2.5 py-1 bg-[#131924] hover:bg-[#1c2432] border border-[#222c3d] hover:border-slate-600 rounded text-[11px] text-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                          <span>Triage Divergence</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL TRACE WATERFALL VIEW
  const spans = data.spans || [];
  const maxDuration = data.durationMs || 2500;

  const filteredSpans = filter
    ? spans.filter(
        (s: any) =>
          s.spanName.toLowerCase().includes(filter.toLowerCase()) ||
          s.serviceName.toLowerCase().includes(filter.toLowerCase())
      )
    : spans;

  return (
    <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
      <ClickStackHeader
        sourceName="Traces"
        sqlQuery={`SELECT TraceId, SpanId, Duration, ServiceName, SpanName, StatusCode WHERE TraceId = '${data.traceId?.substring(0, 8)}...'`}
        elapsedMs={16}
        timeRange="Recent"
        secondaryActions={
          <button
            onClick={() => {
              callTool('clickstack_trace_top_time_consuming_operations', {
                sourceId: data.sourceId || 'src_trace_prod_01',
              });
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#131924] hover:bg-[#182030] border border-[#222c3d] rounded-md text-[11px] text-slate-300 transition-colors"
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Top Bottlenecks</span>
          </button>
        }
      />

      {/* Trace Metadata Ribbon */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e141d] border-b border-[#1c2432] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span>Trace ID:</span>
            <span className="text-slate-200 font-bold">{data.traceId}</span>
            <button
              onClick={() => copyToClipboard(data.traceId)}
              className="p-1 hover:text-slate-100 transition-colors"
              title="Copy Trace ID"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
            </button>
          </div>

          <div className="h-3.5 w-px bg-[#222c3d]" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Root:</span>
            <span className="px-1.5 py-0.5 rounded bg-[#131924] border border-[#222c3d] text-emerald-400 font-mono text-[11px]">
              {data.rootService}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Duration:</span>
            <span className="font-mono font-bold text-rose-400 text-[11px]">
              {data.durationMs?.toFixed(2)} ms
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Spans:</span>
            <span className="font-mono text-slate-300 text-[11px]">{spans.length}</span>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter spans..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-48 pl-7 pr-2 py-0.5 bg-[#090d13] border border-[#1b2330] focus:border-emerald-500/60 rounded text-xs text-slate-200 placeholder-slate-500 font-mono outline-none"
          />
        </div>
      </div>

      {/* Main Workspace: Left Waterfall + Right Span Detail Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Waterfall Flamegraph */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#1c2432]">
          {/* Gantt Time Axis Ruler */}
          <div className="h-6 bg-[#0e141d] border-b border-[#1c2432] flex items-center pl-72 pr-4 font-mono text-[10px] text-slate-500 relative select-none">
            <div className="absolute left-72">0ms</div>
            <div className="absolute left-[35%]">{(maxDuration * 0.25).toFixed(0)}ms</div>
            <div className="absolute left-[55%]">{(maxDuration * 0.5).toFixed(0)}ms</div>
            <div className="absolute left-[75%]">{(maxDuration * 0.75).toFixed(0)}ms</div>
            <div className="absolute right-4">{maxDuration.toFixed(0)}ms</div>
          </div>

          {/* Spans Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#131924]">
            {filteredSpans.map((span: any, index: number) => {
              const depth = span.parentSpanId ? 1 : 0;
              const isSelected = selectedSpan?.spanId === span.spanId;
              const hasError = span.statusCode === 'error';
              const sColor = SERVICE_COLORS[span.serviceName] || {
                bg: 'bg-slate-900',
                text: 'text-slate-300',
                bar: '#64748b',
              };

              const leftPct = (span.startOffsetMs / maxDuration) * 100;
              const widthPct = Math.max(1.2, (span.durationMs / maxDuration) * 100);

              return (
                <div
                  key={span.spanId}
                  onClick={() => setSelectedSpan(span)}
                  className={`flex items-center h-10 hover:bg-[#121824] cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#151c2a] border-l-2 border-emerald-500' : ''
                  }`}
                >
                  {/* Left Metadata Column */}
                  <div
                    className="w-72 flex-shrink-0 flex items-center gap-2 pl-3 pr-2 truncate"
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                  >
                    {hasError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    )}

                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${sColor.bg} ${sColor.text} border border-[#222c3d] truncate`}>
                      {span.serviceName}
                    </span>

                    <span className="font-mono text-xs text-slate-200 truncate" title={span.spanName}>
                      {span.spanName}
                    </span>
                  </div>

                  {/* Right Timeline Bar Column */}
                  <div className="flex-1 relative h-full flex items-center pr-4">
                    {/* Vertical grid guidelines */}
                    <div className="absolute inset-y-0 left-0 w-px bg-[#18202d]" />
                    <div className="absolute inset-y-0 left-[25%] w-px bg-[#141b26]" />
                    <div className="absolute inset-y-0 left-[50%] w-px bg-[#141b26]" />
                    <div className="absolute inset-y-0 left-[75%] w-px bg-[#141b26]" />

                    {/* Gantt Span Bar */}
                    <div
                      className={`h-5 rounded-sm flex items-center px-1.5 font-mono text-[10px] truncate shadow-sm transition-all ${
                        hasError ? 'bg-rose-900/80 border border-rose-500/80 text-rose-200' : 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-200'
                      }`}
                      style={{
                        marginLeft: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      <span className="truncate">{span.durationMs?.toFixed(1)}ms</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail / Correlated Log Drawer */}
        <div className="w-96 bg-[#0e141d] flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-[#1c2432] flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Span Attributes & Correlated Logs</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-mono">
            {selectedSpan ? (
              <>
                {/* Span Quick Specs */}
                <div className="space-y-1.5 p-2.5 rounded bg-[#131924] border border-[#1c2432]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">
                    Selected Span
                  </div>
                  <div className="text-slate-100 font-bold truncate">
                    {selectedSpan.spanName}
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-rose-400 font-bold">{selectedSpan.durationMs?.toFixed(2)} ms</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">Status:</span>
                    <span className={selectedSpan.statusCode === 'error' ? 'text-rose-400' : 'text-emerald-400'}>
                      {selectedSpan.statusCode}
                    </span>
                  </div>
                </div>

                {/* Attributes Table */}
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold mb-1.5">
                    Attributes ({Object.keys(selectedSpan.attributes || {}).length})
                  </div>
                  <div className="border border-[#1c2432] rounded bg-[#090d13] divide-y divide-[#161f2c]">
                    {Object.entries(selectedSpan.attributes || {}).map(([k, v]: [string, any]) => (
                      <div key={k} className="p-2 flex flex-col gap-0.5">
                        <span className="text-slate-500 text-[10px] truncate">{k}</span>
                        <span className="text-emerald-300 text-[11px] break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correlated Logs */}
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
                    <span>Correlated Logs</span>
                    <span className="text-[10px] text-slate-500">
                      {selectedSpan.logs?.length || 0} events
                    </span>
                  </div>

                  {selectedSpan.logs && selectedSpan.logs.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedSpan.logs.map((log: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-[#090d13] border border-[#1c2432] space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">{log.timestamp}</span>
                            <span
                              className={`px-1 rounded text-[9px] font-bold ${
                                log.level === 'ERROR'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : log.level === 'WARN'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-slate-900 text-slate-300'
                              }`}
                            >
                              {log.level}
                            </span>
                          </div>
                          <div className="text-slate-200 text-[11px] leading-relaxed">
                            {log.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-[11px] border border-dashed border-[#1c2432] rounded">
                      No inline logs correlated to this span
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Layers className="w-6 h-6 text-slate-600 mx-auto" />
                <p>Click any span on the waterfall to inspect attributes and correlated ClickHouse logs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
