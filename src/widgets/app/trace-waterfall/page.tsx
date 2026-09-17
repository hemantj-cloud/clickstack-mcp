'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import {
  Clock,
  Layers,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Activity,
  Zap,
  Flame,
  Database,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
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
      attributes: { 'http.method': 'POST', 'http.status_code': '500' },
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
      attributes: { 'http.status_code': '200' },
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
      attributes: { 'db.table': 'inventory' },
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
      attributes: { 'payment.provider': 'stripe' },
      logs: [],
    },
  ],
};

export default function TraceWaterfallPage() {
  const { data: rawData, callTool } = useClickStackWidget<any>(DEFAULT_TRACE);
  const data = rawData || DEFAULT_TRACE;

  const [selectedSpan, setSelectedSpan] = useState<any>(null);
  const [filter, setFilter] = useState('');

  // 1. TOP TIME CONSUMING OPERATIONS VIEW (clickstack_trace_top_time_consuming_operations)
  if (data?.operations && Array.isArray(data.operations)) {
    const ops = data.operations;
    const totalTraces = data.totalTracesAnalyzed || 0;
    const parentFilter = data.parentFilter || 'All parent spans';

    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400 shadow-md shadow-amber-950/50">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-slate-100 tracking-tight">
                  Top Time-Consuming Operations
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-900/50 text-amber-300 border border-amber-700/60">
                  {ops.length} bottlenecks ranked
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                  {totalTraces.toLocaleString()} traces analyzed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-xl">
                Parent Filter: <span className="text-slate-200">{parentFilter}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              callTool('clickstack_trace_waterfall', {
                sourceId: data.sourceId || 'src_trace_prod_01',
                pickFilter: parentFilter,
                pickBy: 'slowest',
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <Activity className="w-3.5 h-3.5" />
            Inspect Slowest Trace
          </button>
        </div>

        {/* Bottleneck Summary Banner */}
        {ops[0] && (
          <div className="my-4 p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-800/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-600/60 text-rose-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-rose-300 font-semibold uppercase tracking-wider">
                  Primary Latency Culprit
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                  {ops[0].operationName}
                </div>
                <div className="text-xs text-slate-400">
                  Accounts for <span className="text-rose-400 font-bold">{ops[0].percentageOfTotalTime}%</span> of total transaction duration across all analyzed traces
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                callTool('clickstack_event_deltas', {
                  sourceId: data.sourceId || 'src_trace_prod_01',
                  target: { where: `SpanName = '${ops[0].operationName}'`, whereLanguage: 'sql' },
                  baseline: { where: `SpanName != '${ops[0].operationName}'`, whereLanguage: 'sql' },
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Triage Divergence
            </button>
          </div>
        )}

        {/* Operations Breakdown Table */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {ops.map((op: any, index: number) => {
            const isTop = index === 0;
            const percentage = op.percentageOfTotalTime || 0;

            return (
              <div
                key={op.operationName}
                className={`p-4 rounded-xl border transition-all ${
                  isTop
                    ? 'bg-slate-900/90 border-rose-500/50 shadow-md shadow-rose-950/20'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">#{index + 1}</span>
                      <span className="font-mono text-sm font-bold text-slate-100 truncate">
                        {op.operationName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                        {op.serviceName}
                      </span>
                    </div>

                    {/* Progress Bar of Time Contribution */}
                    <div className="mt-2.5 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Time Contribution</span>
                        <span className={`font-bold ${isTop ? 'text-rose-400' : 'text-slate-200'}`}>
                          {percentage}% of total trace time
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            percentage > 50
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                              : percentage > 15
                              ? 'bg-gradient-to-r from-amber-500 to-indigo-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operation Stats Cards */}
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono">
                      <div className="text-[10px] text-slate-500">AVG DURATION</div>
                      <div className="text-xs font-bold text-slate-200">
                        {op.averageDurationMs?.toFixed(1) || op.averageDurationMs} ms
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono">
                      <div className="text-[10px] text-slate-500">CALL COUNT</div>
                      <div className="text-xs font-bold text-slate-300">
                        {op.callCount?.toLocaleString()} calls
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        callTool('clickstack_trace_waterfall', {
                          sourceId: data.sourceId || 'src_trace_prod_01',
                          pickFilter: `SpanName:"${op.operationName}"`,
                          pickBy: 'slowest',
                        });
                      }}
                      className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all flex items-center justify-center"
                      title="Inspect sample trace with this operation"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. TRACE WATERFALL VIEW (clickstack_trace_waterfall)
  const spans = data.spans || DEFAULT_TRACE.spans;
  const totalDuration = data.durationMs || DEFAULT_TRACE.durationMs || 1;
  const rootService = data.rootService || spans[0]?.serviceName || 'unknown-service';
  const traceId = data.traceId || DEFAULT_TRACE.traceId;

  const currentSelected = selectedSpan || spans.find((s: any) => s.statusCode === 'error') || spans[0];

  const filteredSpans = spans.filter((s: any) =>
    filter
      ? s.serviceName.toLowerCase().includes(filter.toLowerCase()) ||
        s.spanName.toLowerCase().includes(filter.toLowerCase())
      : true
  );

  const handleIsolate = (span: any) => {
    callTool('clickstack_event_deltas', {
      sourceId: data.sourceId || 'src_trace_prod_01',
      target: { where: `SpanName = '${span.spanName}' AND Duration >= ${span.durationNs}`, whereLanguage: 'sql' },
      baseline: { where: `SpanName = '${span.spanName}' AND Duration < ${span.durationNs}`, whereLanguage: 'sql' },
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/50">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-100 font-mono tracking-tight">{rootService}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                ERROR 500
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2 mt-0.5">
              Trace: <span className="text-slate-200">{traceId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" /> {totalDuration.toFixed(1)} ms
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> {spans.length} Spans
          </span>
        </div>
      </div>

      {/* Filter and Timeline Ruler */}
      <div className="flex items-center justify-between py-3 border-b border-slate-900 gap-4">
        <input
          type="text"
          placeholder="Filter spans by name or service..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-80 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        <div className="flex-1 flex justify-between text-[10px] font-mono text-slate-500 px-2">
          <span>0ms</span>
          <span>{(totalDuration * 0.25).toFixed(0)}ms</span>
          <span>{(totalDuration * 0.5).toFixed(0)}ms</span>
          <span>{(totalDuration * 0.75).toFixed(0)}ms</span>
          <span>{totalDuration.toFixed(0)}ms</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-4 mt-4 overflow-hidden">
        {/* Waterfall Span Tree */}
        <div className="col-span-7 flex flex-col gap-2 overflow-y-auto pr-1">
          {filteredSpans.map((span: any) => {
            const isSelected = currentSelected?.spanId === span.spanId;
            const isError = span.statusCode === 'error';
            const leftPct = (span.startOffsetMs / totalDuration) * 100;
            const widthPct = Math.max(2, (span.durationMs / totalDuration) * 100);

            return (
              <div
                key={span.spanId}
                onClick={() => setSelectedSpan(span)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {isError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    )}
                    <span className="font-mono font-bold text-slate-200 truncate">{span.serviceName}</span>
                    <span className="text-slate-400 truncate text-[11px]">{span.spanName}</span>
                    {span.isCriticalPath && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono border border-rose-500/30">
                        CRITICAL PATH
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-300 text-xs flex-shrink-0">
                    {span.durationMs.toFixed(1)} ms
                  </span>
                </div>

                {/* Timeline Gantt Bar */}
                <div className="relative h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className={`absolute h-full rounded-full ${
                      span.isCriticalPath
                        ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                        : isError
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Span Details & Correlated Logs */}
        <div className="col-span-5 flex flex-col gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4 overflow-hidden shadow-sm">
          {currentSelected ? (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <div className="font-mono font-bold text-sm text-slate-100 truncate">
                    {currentSelected.spanName}
                  </div>
                  <div className="text-xs text-indigo-400 font-mono mt-0.5">{currentSelected.serviceName}</div>
                </div>
                <button
                  onClick={() => handleIsolate(currentSelected)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-rose-600/30 flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" /> Isolate Root Cause
                </button>
              </div>

              {/* Attributes Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Span Attributes</span>
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(currentSelected.attributes || {}).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-slate-400">{k}:</span>
                      <span className="text-slate-200 truncate max-w-[200px]">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correlated Logs */}
              <div className="flex-1 flex flex-col space-y-1.5 overflow-hidden">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                  Correlated Span Logs ({currentSelected.logs?.length || 0})
                </span>
                <div className="flex-1 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 overflow-y-auto space-y-2 text-xs font-mono">
                  {(currentSelected.logs || []).length === 0 ? (
                    <div className="text-slate-500 text-center py-4">No correlated logs emitted on this span</div>
                  ) : (
                    currentSelected.logs.map((log: any, i: number) => (
                      <div
                        key={i}
                        className={`p-2 rounded border ${
                          log.level === 'ERROR'
                            ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                            : log.level === 'WARN'
                            ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between text-[10px] text-slate-400 pb-1">
                          <span>{log.timestamp}</span>
                          <span className="font-bold uppercase">{log.level}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{log.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select a span from the waterfall to inspect details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
