'use client';

import React, { useState, useMemo } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import {
  Bell,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Send,
  Save,
  Clock,
  ShieldAlert,
  Flame,
  MessageSquare,
  Radio,
  Sparkles,
} from 'lucide-react';

const DEFAULT_ALERT = {
  id: 'alert_p99_spike',
  name: 'Checkout P99 Latency Surge',
  displayName: 'P99 Latency > 2000ms for 5m',
  state: 'ALERT',
  interval: '5m',
  threshold: 2000,
  thresholdType: 'above',
  channels: ['wh_slack_sre'],
};

const AVAILABLE_WEBHOOKS = [
  { id: 'wh_slack_sre', name: '#sre-incidents', service: 'slack', icon: 'slack' },
  { id: 'wh_incidentio', name: 'Incident.io P1 Escalation', service: 'incidentio', icon: 'zap' },
  { id: 'wh_generic_pager', name: 'PagerDuty Webhook', service: 'generic', icon: 'bell' },
];

export default function AlertStudioPage() {
  const { data: mcpData, callTool } = useClickStackWidget(DEFAULT_ALERT);
  const initialAlert = (mcpData as any)?.alert || mcpData || DEFAULT_ALERT;

  const [name, setName] = useState(initialAlert.name || 'API Latency Threshold');
  const [interval, setInterval] = useState(initialAlert.interval || '5m');
  const [thresholdType, setThresholdType] = useState(initialAlert.thresholdType || 'above');
  const [threshold, setThreshold] = useState<number>(initialAlert.threshold || 2000);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialAlert.channels || ['wh_slack_sre']);
  const [isSaved, setIsSaved] = useState(false);

  // Historical simulation calculation (What-If analysis)
  const simulation = useMemo(() => {
    // Generate simulated breach count based on threshold
    const baseCount = Math.max(0, Math.round(150 - (threshold / 3000) * 140));
    const falsePositives = Math.max(0, Math.round(baseCount * 0.42));
    const trueIncidents = Math.max(0, baseCount - falsePositives);
    const noiseReduction = Math.min(99, Math.max(10, Math.round(((threshold - 500) / 3500) * 95)));

    return {
      historicalTriggers30d: baseCount,
      estimatedFalsePositives: falsePositives,
      estimatedTrueIncidents: trueIncidents,
      noiseReductionPct: noiseReduction,
    };
  }, [threshold]);

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId]
    );
  };

  const handleSaveAndDeploy = () => {
    callTool('clickstack_save_alert', {
      id: initialAlert.id,
      name,
      interval,
      thresholdType,
      threshold,
      channels: selectedChannels,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 p-4 font-sans text-xs select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm text-slate-100">ClickStack Alert Studio</h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-900/40 text-red-300 border border-red-800/60">
                {initialAlert.state || 'ALERT'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive historical simulation &amp; automated notification routing
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAndDeploy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
            isSaved
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
          }`}
        >
          {isSaved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {isSaved ? 'Deployed & Saved' : 'Save & Deploy'}
        </button>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 grid grid-cols-12 gap-4 mt-4 overflow-hidden">
        {/* Left Column: Configuration & Threshold Controls (7 cols) */}
        <div className="col-span-7 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Rule Metadata Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Alert Definition
              </span>
              <span className="text-[10px] font-mono text-slate-500">{initialAlert.id || 'new_alert'}</span>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Rule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Evaluation Interval</label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="1m">1 minute (aggressive)</option>
                  <option value="5m">5 minutes (standard)</option>
                  <option value="15m">15 minutes</option>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Threshold Condition</label>
                <select
                  value={thresholdType}
                  onChange={(e) => setThresholdType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="above">Value is ABOVE</option>
                  <option value="below">Value is BELOW</option>
                  <option value="outside">Value is OUTSIDE normal range</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive What-If Threshold Slider Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Historical Backtest &amp; Threshold Slider
              </span>
              <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                {threshold} ms
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>500 ms (Strict)</span>
                <span>Current: {threshold} ms</span>
                <span>4000 ms (Relaxed)</span>
              </div>
              <input
                type="range"
                min="500"
                max="4000"
                step="50"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Simulated 30-day Impact Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800/60">
                <div className="text-[10px] text-slate-400">30d Triggers</div>
                <div className="text-base font-semibold font-mono text-slate-200">
                  {simulation.historicalTriggers30d}
                </div>
                <div className="text-[10px] text-slate-500">simulated fires</div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800/60">
                <div className="text-[10px] text-slate-400">Est. False Positives</div>
                <div className="text-base font-semibold font-mono text-amber-400">
                  {simulation.estimatedFalsePositives}
                </div>
                <div className="text-[10px] text-slate-500">noise instances</div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800/60">
                <div className="text-[10px] text-slate-400">Noise Suppression</div>
                <div className="text-base font-semibold font-mono text-emerald-400">
                  +{simulation.noiseReductionPct}%
                </div>
                <div className="text-[10px] text-slate-500">alert hygiene</div>
              </div>
            </div>
          </div>

          {/* Webhook Channel Selection */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-400" />
                Notification Routing Channels
              </span>
              <span className="text-[10px] text-slate-500">
                {selectedChannels.length} active destinations
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_WEBHOOKS.map((wh) => {
                const isActive = selectedChannels.includes(wh.id);
                return (
                  <button
                    key={wh.id}
                    onClick={() => toggleChannel(wh.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs ${
                      isActive
                        ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-200 font-medium shadow-sm shadow-indigo-500/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span>{wh.name}</span>
                    <span className="text-[10px] opacity-60">({wh.service})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Incident Payload & Routing Preview (5 cols) */}
        <div className="col-span-5 flex flex-col gap-3 bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              Live Notification Payload Preview
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-ping" /> Validated
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* Simulated Slack Incident Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span className="font-semibold text-indigo-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  [P1-ALERT] ClickStack SRE Monitor
                </span>
                <span className="font-mono">Just now</span>
              </div>

              <div className="font-semibold text-xs text-slate-100">{name}</div>
              <div className="text-[11px] text-slate-300">
                Condition met: metric value is{' '}
                <span className="font-bold text-rose-400">
                  {thresholdType.toUpperCase()} {threshold}ms
                </span>{' '}
                evaluated over a {interval} window.
              </div>

              <div className="p-2 bg-slate-900/90 rounded border border-slate-800 font-mono text-[10px] space-y-1 text-slate-300">
                <div>• Status: <span className="text-rose-400 font-semibold">FIRING</span></div>
                <div>• Current Value: <span className="text-indigo-300 font-semibold">{threshold + 412}ms</span></div>
                <div>• Threshold Target: <span className="text-slate-400">{threshold}ms</span></div>
                <div>• Source: <span className="text-slate-400">src_trace_prod_01</span></div>
              </div>

              <div className="flex gap-2 pt-1">
                <button className="flex-1 py-1 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] text-center">
                  Open Trace Waterfall
                </button>
                <button className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]">
                  Acknowledge
                </button>
              </div>
            </div>

            {/* Target Channel Summary */}
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="text-[10px] font-medium text-slate-400">Configured Escalation Flow:</div>
              {selectedChannels.length === 0 ? (
                <div className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> No channels selected. Alert will fire silently.
                </div>
              ) : (
                <ul className="space-y-1">
                  {selectedChannels.map((cId) => {
                    const match = AVAILABLE_WEBHOOKS.find((w) => w.id === cId);
                    return (
                      <li key={cId} className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>• {match?.name || cId}</span>
                        <span className="text-[10px] font-mono text-indigo-400">{match?.service}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
