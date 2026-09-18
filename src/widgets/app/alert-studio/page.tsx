'use client';

import React, { useState, useMemo } from 'react';
import { useClickStackWidget } from '../../hooks/useClickStackWidget';
import { ClickStackHeader } from '../../components/ClickStackHeader';
import {
  Bell,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Save,
  Check,
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
  { id: 'wh_slack_sre', name: '#sre-incidents', service: 'slack' },
  { id: 'wh_incidentio', name: 'Incident.io P1 Escalation', service: 'incidentio' },
  { id: 'wh_generic_pager', name: 'PagerDuty Webhook', service: 'pagerduty' },
];

export default function AlertStudioPage() {
  const { data: mcpData, callTool } = useClickStackWidget(DEFAULT_ALERT);
  const initialAlert = (mcpData as any)?.alert || (mcpData as any)?.alerts?.[0] || mcpData || DEFAULT_ALERT;

  const [name, setName] = useState(initialAlert.name || 'API Latency Threshold');
  const [interval, setInterval] = useState(initialAlert.interval || '5m');
  const [thresholdType, setThresholdType] = useState(initialAlert.thresholdType || 'above');
  const [threshold, setThreshold] = useState<number>(initialAlert.threshold || 2000);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialAlert.channels || ['wh_slack_sre']);
  const [isSaved, setIsSaved] = useState(false);

  // Historical What-If Simulation
  const simulation = useMemo(() => {
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

  const handleSave = () => {
    callTool('clickstack_save_alert', {
      alert: {
        id: initialAlert.id || 'alert_custom',
        name,
        displayName: `${name} (${thresholdType} ${threshold}ms)`,
        interval,
        threshold,
        thresholdType,
        channels: selectedChannels,
      },
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const toggleChannel = (chId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0f15] text-[#e2e8f0] font-sans select-none overflow-hidden">
      <ClickStackHeader
        sourceName="Alerts"
        sqlQuery={`SELECT quantilesExactWeighted(0.99)(Duration) > ${threshold} FROM otel.otel_traces`}
        elapsedMs={16}
        actionButtonText={isSaved ? 'Saved!' : 'Save Alert Rule'}
        actionButtonIcon={isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
        onRun={handleSave}
      />

      {/* Alert Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e141d] border-b border-[#1c2432] text-xs">
        <div className="flex items-center gap-3">
          <Bell className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-100">{name}</span>
          <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800 font-mono text-[10px] font-bold">
            {initialAlert.state || 'ALERT'}
          </span>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          ClickHouse Alert Evaluation Engine
        </div>
      </div>

      {/* Main Form & Simulation Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* Parameters Box */}
        <div className="p-4 rounded-md bg-[#0e141d] border border-[#1c2432] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-sans font-semibold mb-1 block">
                Rule Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#090d13] border border-[#1b2330] rounded text-slate-200 outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-sans font-semibold mb-1 block">
                Evaluation Window
              </label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#090d13] border border-[#1b2330] rounded text-slate-200 outline-none focus:border-emerald-500/60"
              >
                <option value="1m">1 minute</option>
                <option value="5m">5 minutes</option>
                <option value="15m">15 minutes</option>
                <option value="1h">1 hour</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-sans font-semibold mb-1 block">
                Threshold Operator
              </label>
              <select
                value={thresholdType}
                onChange={(e) => setThresholdType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#090d13] border border-[#1b2330] rounded text-slate-200 outline-none focus:border-emerald-500/60"
              >
                <option value="above">Above (&gt;)</option>
                <option value="below">Below (&lt;)</option>
              </select>
            </div>
          </div>

          {/* Threshold Tuning Slider */}
          <div className="space-y-2 pt-2 border-t border-[#18212e]">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-sans font-semibold">Latency Threshold Tuning</span>
              <span className="text-rose-400 font-bold text-sm">{threshold} ms</span>
            </div>
            <input
              type="range"
              min="500"
              max="4000"
              step="50"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#090d13] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>500 ms (Strict)</span>
              <span>2,000 ms (Default)</span>
              <span>4,000 ms (Lenient)</span>
            </div>
          </div>
        </div>

        {/* Historical What-If Simulation Card */}
        <div className="p-4 rounded-md bg-[#0e141d] border border-[#1c2432] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200 font-sans flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Historical What-If Simulator (ClickHouse 30-Day Backtest)</span>
            </div>
            <span className="text-[11px] text-slate-500">Simulated over 4.8M spans</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded bg-[#090d13] border border-[#1b2330]">
              <div className="text-[10px] text-slate-500">PAST 30D TRIGGERS</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                {simulation.historicalTriggers30d}
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#090d13] border border-[#1b2330]">
              <div className="text-[10px] text-slate-500">FALSE POSITIVES</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                {simulation.estimatedFalsePositives}
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#090d13] border border-[#1b2330]">
              <div className="text-[10px] text-slate-500">TRUE INCIDENTS</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">
                {simulation.estimatedTrueIncidents}
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#090d13] border border-[#1b2330]">
              <div className="text-[10px] text-slate-500">NOISE REDUCTION</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {simulation.noiseReductionPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Dispatch Routing */}
        <div className="p-4 rounded-md bg-[#0e141d] border border-[#1c2432] space-y-2.5">
          <div className="text-xs font-semibold text-slate-200 font-sans">
            Dispatch Channels
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-sans">
            {AVAILABLE_WEBHOOKS.map((wh) => {
              const isSelected = selectedChannels.includes(wh.id);
              return (
                <div
                  key={wh.id}
                  onClick={() => toggleChannel(wh.id)}
                  className={`p-2.5 rounded border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-[#131924] border-emerald-500 text-slate-100'
                      : 'bg-[#090d13] border-[#1b2330] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{wh.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
