import React, { useState } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  History,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AutomationRule } from '../../types';
import {
  getStoredAutomations,
  addAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationPause,
  executeAutomationNow,
} from '../../services/automationEngine';

interface AutomationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationCenterModal: React.FC<AutomationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rules, setRules] = useState<AutomationRule[]>(getStoredAutomations());
  const [isExecutingId, setIsExecutingId] = useState<string | null>(null);
  const [selectedRuleForHistory, setSelectedRuleForHistory] = useState<AutomationRule | null>(null);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState<'scheduled' | 'interval' | 'manual'>('interval');
  const [newRuleInterval, setNewRuleInterval] = useState(30);

  if (!isOpen) return null;

  const refresh = () => {
    setRules(getStoredAutomations());
  };

  const handleTogglePause = (id: string) => {
    toggleAutomationPause(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteAutomationRule(id);
    refresh();
  };

  const handleRunNow = async (id: string) => {
    setIsExecutingId(id);
    try {
      await executeAutomationNow(id);
    } catch (err: any) {
      console.error('Execution error:', err);
    } finally {
      setIsExecutingId(null);
      refresh();
    }
  };

  const handleCreateRule = () => {
    if (!newRuleName.trim()) return;

    addAutomationRule({
      name: newRuleName.trim(),
      description: newRuleDesc.trim() || 'Custom recurring task for Suraj Rajput',
      triggerType: newRuleTrigger,
      triggerConfig: {
        intervalMinutes: newRuleTrigger === 'interval' ? newRuleInterval : undefined,
        time: newRuleTrigger === 'scheduled' ? '09:00' : undefined,
      },
      actions: [
        {
          id: `act_${Date.now()}_1`,
          type: 'custom_agent_task',
          description: `Execute workflow plan for ${newRuleName.trim()}`,
        },
        {
          id: `act_${Date.now()}_2`,
          type: 'summarize',
          description: 'Synthesize verification summary for Suraj',
        },
      ],
      status: 'active',
      nextRun: Date.now() + newRuleInterval * 60000,
    });

    setNewRuleName('');
    setNewRuleDesc('');
    setIsAddingRule(false);
    refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Real Automation Center
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  {rules.filter((r) => r.status === 'active').length} Active Workflows
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Scheduled, recurring, and multi-step verified execution engine.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingRule(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create Automation
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Create Rule Form */}
        {isAddingRule && (
          <div className="p-4 mx-6 my-3 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                <Workflow className="w-3.5 h-3.5" /> New Automation Workflow
              </span>
              <button onClick={() => setIsAddingRule(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Workflow Name (e.g. Daily Feedback & Mail Sync)"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              />
              <select
                value={newRuleTrigger}
                onChange={(e) => setNewRuleTrigger(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="interval">Every N Minutes</option>
                <option value="scheduled">Daily at specific time</option>
                <option value="manual">Manual Trigger Only</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Description & Goal of this automation..."
              value={newRuleDesc}
              onChange={(e) => setNewRuleDesc(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
            />
            {newRuleTrigger === 'interval' && (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>Run every:</span>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={newRuleInterval}
                  onChange={(e) => setNewRuleInterval(parseInt(e.target.value, 10) || 30)}
                  className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                />
                <span>minutes</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCreateRule}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                Save & Activate Workflow
              </button>
            </div>
          </div>
        )}

        {/* Workflows List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {rules.map((rule) => {
            const isExecuting = isExecutingId === rule.id;

            return (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{rule.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          rule.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : rule.status === 'running'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                            : rule.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{rule.description}</p>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRunNow(rule.id)}
                      disabled={isExecuting}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-amber-600/20"
                      title="Execute automation immediately"
                    >
                      <Play className={`w-3 h-3 ${isExecuting ? 'animate-spin' : ''}`} />
                      <span>{isExecuting ? 'Running...' : 'Run Now'}</span>
                    </button>

                    <button
                      onClick={() => handleTogglePause(rule.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title={rule.status === 'active' ? 'Pause Automation' : 'Resume Automation'}
                    >
                      {rule.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setSelectedRuleForHistory(rule)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="View Run History & Verification Logs"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors"
                      title="Delete Automation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Multi-step Pipeline View (Trigger -> Action -> Next Action -> Verification -> Result) */}
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5">
                    <Workflow className="w-3 h-3 text-amber-400" />
                    <span>WORKFLOW PIPELINE:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-200 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {rule.triggerType === 'scheduled'
                        ? `Daily at ${rule.triggerConfig.time}`
                        : rule.triggerType === 'interval'
                        ? `Every ${rule.triggerConfig.intervalMinutes}m`
                        : 'Manual'}
                    </span>

                    {rule.actions.map((act, i) => (
                      <React.Fragment key={act.id}>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="px-2 py-1 rounded bg-slate-800/90 text-slate-300 text-[11px]">
                          {i + 1}. {act.description}
                        </span>
                      </React.Fragment>
                    ))}

                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[11px] flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Verification & Result
                    </span>
                  </div>
                </div>

                {/* Timing & Last Run Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                  <span>
                    Last Run:{' '}
                    {rule.lastRun ? new Date(rule.lastRun).toLocaleString() : 'Never'}
                  </span>
                  <span>
                    Next Run:{' '}
                    {rule.nextRun ? new Date(rule.nextRun).toLocaleTimeString() : 'On Demand'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* History Modal Overlay */}
        {selectedRuleForHistory && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[75vh] flex flex-col p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Run History: {selectedRuleForHistory.name}
                </span>
                <button
                  onClick={() => setSelectedRuleForHistory(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mt-4 space-y-3 font-mono text-xs">
                {selectedRuleForHistory.runHistory.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No historical runs recorded yet.</p>
                ) : (
                  selectedRuleForHistory.runHistory.map((run) => (
                    <div key={run.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">
                          {new Date(run.timestamp).toLocaleString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            run.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {run.logs.map((log, lIdx) => (
                          <p key={lIdx} className="text-slate-300 text-[11px] leading-tight">
                            {log}
                          </p>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-900 text-emerald-400 text-[11px]">
                        ✓ {run.verification}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
