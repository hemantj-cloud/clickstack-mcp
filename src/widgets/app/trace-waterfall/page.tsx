'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { Clock, Layers, AlertCircle, CheckCircle2, ChevronRight, Activity, Zap } from 'lucide-react';

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
  const { data, callTool } = useClickStackWidget(DEFAULT_TRACE);
  const [selectedSpan, setSelectedSpan] = useState<any>(data?.spans?.[2] || data?.spans?.[0]);
  const [filter, setFilter] = useState('');

  const filteredSpans = (data?.spans || []).filter((s: any) =>
    filter ? s.serviceName.toLowerCase().includes(filter.toLowerCase()) || s.spanName.toLowerCase().includes(filter.toLowerCase()) : true
  );

  const handleIsolate = (span: any) => {
    callTool('clickstack_event_deltas', {
      sourceId: data.sourceId,
      target: { where: `SpanName = '${span.spanName}' AND Duration >= ${span.durationNs}`, whereLanguage: 'sql' },
      baseline: { where: `SpanName = '${span.spanName}' AND Duration < ${span.durationNs}`, whereLanguage: 'sql' },
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-4 font-sans text-xs select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-200">{data.rootService}</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono border border-rose-500/30">
                ERROR 500
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              Trace: <span className="text-slate-300">{data.traceId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-400" /> {data.durationMs.toFixed(1)} ms
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> {data.spans.length} Spans
          </span>
        </div>
      </div>

      {/* Filter and Timeline Ruler */}
      <div className="flex items-center justify-between py-2.5 border-b border-slate-900 gap-4">
        <input
          type="text"
          placeholder="Filter spans by name or service..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 placeholder-slate-500 text-xs w-64 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex-1 flex justify-between text-[10px] font-mono text-slate-500 px-2">
          <span>0 ms</span>
          <span>{(data.durationMs * 0.25).toFixed(0)} ms</span>
          <span>{(data.durationMs * 0.5).toFixed(0)} ms</span>
          <span>{(data.durationMs * 0.75).toFixed(0)} ms</span>
          <span>{data.durationMs.toFixed(0)} ms</span>
        </div>
      </div>

      {/* Spans Waterfall List */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1 pr-1">
        {filteredSpans.map((span: any) => {
          const leftPercent = (span.startOffsetMs / data.durationMs) * 100;
          const widthPercent = Math.max((span.durationMs / data.durationMs) * 100, 1.8);
          const isSelected = selectedSpan?.spanId === span.spanId;
          const isError = span.statusCode === 'error';

          return (
            <div
              key={span.spanId}
              onClick={() => setSelectedSpan(span)}
              className={`flex items-center py-1.5 px-2 rounded cursor-pointer transition ${
                isSelected ? 'bg-indigo-950/40 border border-indigo-500/40' : 'hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="w-64 truncate flex items-center gap-1.5 shrink-0 font-mono">
                {isError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="font-semibold text-slate-200">{span.serviceName}</span>
                <span className="text-slate-400 truncate">{span.spanName}</span>
                {span.isCriticalPath && (
                  <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/30 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Slowest
                  </span>
                )}
              </div>

              {/* Gantt Bar */}
              <div className="flex-1 relative h-4 bg-slate-900/60 rounded mx-3">
                <div
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  className={`absolute top-0.5 bottom-0.5 rounded transition ${
                    isError
                      ? 'bg-rose-500/80 border border-rose-400'
                      : span.isCriticalPath
                      ? 'bg-amber-500/80 border border-amber-400'
                      : 'bg-indigo-500/80 hover:bg-indigo-400'
                  }`}
                />
              </div>

              <div className="w-16 text-right font-mono text-slate-400 shrink-0">
                {span.durationMs.toFixed(1)}ms
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Span Drawer */}
      {selectedSpan && (
        <div className="mt-2 p-3 bg-slate-900/80 border border-slate-800 rounded-lg shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <span>{selectedSpan.serviceName}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-slate-300">{selectedSpan.spanName}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Span ID: {selectedSpan.spanId} | Duration: {selectedSpan.durationMs.toFixed(2)} ms
              </div>
            </div>
            <button
              onClick={() => handleIsolate(selectedSpan)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-slate-50 font-semibold rounded text-xs transition flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3" /> Isolate with Event Deltas
            </button>
          </div>

          {/* Attributes Grid */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
            {Object.entries(selectedSpan.attributes || {}).map(([k, v]) => (
              <div key={k} className="flex gap-1.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/60 truncate">
                <span className="text-indigo-400 shrink-0">{k}:</span>
                <span className="text-slate-300 truncate">{String(v)}</span>
              </div>
            ))}
          </div>

          {/* Correlated Logs */}
          {selectedSpan.logs && selectedSpan.logs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Correlated Logs</div>
              {selectedSpan.logs.map((log: any, idx: number) => (
                <div key={idx} className="flex gap-2 font-mono text-[11px] text-slate-300 bg-slate-950/40 px-2 py-0.5 rounded">
                  <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className={log.level === 'ERROR' ? 'text-rose-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-slate-400'}>
                    [{log.level}]
                  </span>
                  <span className="truncate">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
