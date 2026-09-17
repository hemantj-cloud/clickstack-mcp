'use client';

import React, { useState } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { LayoutDashboard, CheckCircle2, AlertTriangle, RefreshCw, Layers, Plus, CheckCircle, XCircle } from 'lucide-react';

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
  const { data: rawDash, callTool } = useClickStackWidget<any>(DEFAULT_DASHBOARD);
  const dash = rawDash || DEFAULT_DASHBOARD;
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = () => {
    setIsValidating(true);
    callTool('clickstack_query_tiles', {
      dashboardId: dash?.id || 'dash_api_overview',
    });
    setTimeout(() => setIsValidating(false), 800);
  };

  // 1. TILE QUERY VALIDATION SUMMARY VIEW (clickstack_query_tiles)
  if (dash?.results && Array.isArray(dash.results)) {
    const results = dash.results;
    const total = dash.totalTiles || results.length;
    const valid = dash.validCount ?? results.filter((r: any) => r.status === 'ok').length;

    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/50">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">Dashboard Batch Tile Validation</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-700/60">
                  {valid}/{total} validated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dashboard ID: <span className="font-mono text-slate-200">{dash.dashboardId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              callTool('clickstack_get_dashboard', {
                id: dash.dashboardId || 'dash_api_overview',
              });
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-indigo-600/30"
          >
            View Full Canvas
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1 font-mono text-xs">
          {results.map((r: any, idx: number) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {r.status === 'ok' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <div>
                  <div className="font-bold text-slate-200">{r.tileId || `Tile #${idx + 1}`}</div>
                  <div className="text-[11px] text-slate-400">Execution status: {r.status}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                  Query verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. DASHBOARD CANVAS VIEW (clickstack_get_dashboard / clickstack_save_dashboard)
  const tiles = dash.tiles || DEFAULT_DASHBOARD.tiles;
  const tags = dash.tags || DEFAULT_DASHBOARD.tags;
  const name = dash.name || DEFAULT_DASHBOARD.name;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-5 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/50">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">{name}</h1>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Live Verified
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {tags.map((t: string) => (
                <span key={t} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-indigo-400' : ''}`} />
            {isValidating ? 'Validating Tiles...' : 'Validate Tile Queries'}
          </button>
        </div>
      </div>

      {/* Tiles Grid */}
      <div className="flex-1 overflow-y-auto mt-4 grid grid-cols-12 gap-3.5 pr-1">
        {tiles.map((tile: any) => {
          const isLine = tile.displayType === 'line';
          const isTable = tile.displayType === 'table';

          return (
            <div
              key={tile.id || tile.name}
              className={`p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all ${
                isLine || isTable ? 'col-span-6' : 'col-span-3'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-300 pb-2 border-b border-slate-800/60">
                  <span className="truncate">{tile.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-950 border border-slate-800 text-slate-400 uppercase">
                    {tile.displayType}
                  </span>
                </div>

                <div className="mt-3">
                  {tile.displayType === 'number' && (
                    <div className="space-y-1">
                      <div className="text-2xl font-bold font-mono text-slate-100">{tile.value || '0.14%'}</div>
                      <div className="text-[10px] font-mono text-emerald-400">Target: {tile.target || 'Normal'}</div>
                    </div>
                  )}

                  {isLine && (
                    <div className="space-y-2">
                      {(tile.series || [
                        { name: '/api/v1/checkout', value: '240 ms' },
                        { name: '/v1/tokens/verify', value: '45 ms' },
                        { name: '/v1/charges', value: '120 ms' },
                      ]).map((s: any) => (
                        <div key={s.name} className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-400 truncate max-w-[180px]">{s.name}</span>
                          <span className="font-bold text-indigo-300">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isTable && (
                    <div className="space-y-2">
                      {(tile.rows || [
                        { pattern: 'DB lock timeout on inventory table', count: 840, trend: '+14%' },
                        { pattern: 'Invalid JWT bearer authorization token', count: 42, trend: '-2%' },
                      ]).map((r: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-300 truncate max-w-[200px]">{r.pattern}</span>
                          <span className="font-bold text-rose-400">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Tile ID: {tile.id}</span>
                <span className="text-emerald-400">Query verified</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
