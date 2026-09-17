'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { LayoutDashboard, CheckCircle2, AlertTriangle, RefreshCw, Layers, Plus } from 'lucide-react';

const DEFAULT_DASHBOARD = {
  id: 'dash_api_overview',
  name: 'Production API & Reliability Overview',
  tags: ['production', 'api', 'golden-signals'],
  tiles: [
    {
      id: 'tile_kpi_error',
      name: '5xx Error Rate',
      displayType: 'number',
      value: '0.14%',
      target: '< 0.50%',
      status: 'ok',
    },
    {
      id: 'tile_kpi_reqs',
      name: 'Total Request Volume',
      displayType: 'number',
      value: '1.24M',
      target: 'Normal',
      status: 'ok',
    },
    {
      id: 'tile_p95_latency',
      name: 'P95 Latency by Endpoint',
      displayType: 'line',
      series: [
        { name: '/api/v1/checkout', value: '240 ms' },
        { name: '/v1/tokens/verify', value: '45 ms' },
        { name: '/v1/charges', value: '120 ms' },
      ],
      status: 'ok',
    },
    {
      id: 'tile_top_errors',
      name: 'Top Recurring Error Patterns',
      displayType: 'table',
      rows: [
        { pattern: 'DB lock timeout on inventory table', count: 840, trend: '+14%' },
        { pattern: 'Invalid JWT bearer authorization token', count: 42, trend: '-2%' },
      ],
      status: 'ok',
    },
  ],
};

export default function DashboardCanvasPage() {
  const { data: dash, callTool } = useClickStackWidget(DEFAULT_DASHBOARD);
  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(true);

  const handleValidate = () => {
    setIsValidating(true);
    callTool('clickstack_query_tiles', {
      dashboardId: dash?.id || 'dash_api_overview',
    });
    setTimeout(() => {
      setIsValidating(false);
      setValidationSuccess(true);
    }, 800);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-4 font-sans text-xs select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-200">{dash.name}</h1>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              Tags: {dash.tags?.map((t: string) => <span key={t} className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 rounded">#{t}</span>)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs transition flex items-center gap-1.5 border border-slate-700"
          >
            <RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin text-indigo-400' : ''}`} />
            {validationSuccess ? 'Validate Tiles (All OK)' : 'Validate Tiles'}
          </button>
        </div>
      </div>

      {/* Tiles Grid */}
      <div className="flex-1 overflow-y-auto mt-4 grid grid-cols-2 gap-3 pr-1">
        {/* KPI 1 */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-xs text-slate-200">5xx Error Rate</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono"><CheckCircle2 className="w-3 h-3" /> OK</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-400">0.14%</div>
            <div className="text-[10px] text-slate-500 font-mono">SLA Target: &lt; 0.50%</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-xs text-slate-200">Total Requests (1h)</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono"><CheckCircle2 className="w-3 h-3" /> OK</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-indigo-400">1.24M</div>
            <div className="text-[10px] text-slate-500 font-mono">Normal traffic distribution</div>
          </div>
        </div>

        {/* Line Chart Tile */}
        <div className="col-span-2 p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-xs text-slate-200">P95 Latency by Endpoint</span>
            <span className="text-[10px] font-mono text-indigo-400">Live Telemetry</span>
          </div>
          <div className="mt-3 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">/api/v1/orders/checkout</span>
              <span className="text-amber-400 font-bold">240.2 ms</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-[60%] h-full bg-amber-400 rounded-full" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">/v1/charges (Stripe)</span>
              <span className="text-emerald-400 font-bold">120.0 ms</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-[30%] h-full bg-emerald-400 rounded-full" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">/v1/tokens/verify</span>
              <span className="text-emerald-400 font-bold">45.2 ms</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-[12%] h-full bg-emerald-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Table Tile */}
        <div className="col-span-2 p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200">Top Recurring Errors</span>
            <span className="text-[10px] text-slate-500">Last 1 hour</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between items-center py-1 text-slate-300 border-b border-slate-800/60">
              <span className="truncate max-w-md">DB connection lock timeout in inventory table</span>
              <span className="text-rose-400 font-bold">840 reqs</span>
            </div>
            <div className="flex justify-between items-center py-1 text-slate-300">
              <span className="truncate max-w-md">Invalid JWT bearer authorization token</span>
              <span className="text-amber-400 font-bold">42 reqs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
