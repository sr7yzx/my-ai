import React, { useEffect, useState } from 'react';
import {
  Monitor,
  Play,
  Pause,
  RotateCcw,
  Square,
  Camera,
  Maximize2,
  Minimize2,
  EyeOff,
  Globe,
  ArrowRight,
  Terminal,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
  X,
} from 'lucide-react';
import { LiveComputerState, LiveComputerStatus } from '../../types';
import { computerEngine } from '../../services/computerEngine';

interface LiveComputerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveComputerPanel: React.FC<LiveComputerPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [computerState, setComputerState] = useState<LiveComputerState>(computerEngine.getState());
  const [urlInput, setUrlInput] = useState(computerState.currentUrl);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hidePreview, setHidePreview] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const unsub = computerEngine.subscribe((state) => {
      setComputerState(state);
      setUrlInput(state.currentUrl);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    computerEngine.navigateTo(urlInput.trim());
  };

  const handleStartTask = (taskType: string) => {
    if (taskType === 'workspace_search') {
      computerEngine.executeTaskPlan('Search Active Workspace Project', [
        { action: 'nav', conciseStatus: 'Opening internal workspace project hub', value: 'https://workspace.internal/projects' },
        { action: 'inspect', conciseStatus: 'Reading visible DOM elements & search bar' },
        { action: 'type', conciseStatus: 'Entering query: "Radhe Krishna AI Engine"', target: 'input[name="search"]' },
        { action: 'click', conciseStatus: 'Clicking Search button' },
        { action: 'scroll', conciseStatus: 'Scrolling through project results' },
        { action: 'verify', conciseStatus: 'Verifying project state & commit logs' },
      ]);
    } else if (taskType === 'diagnose_system') {
      computerEngine.executeTaskPlan('System Diagnostic Verification', [
        { action: 'nav', conciseStatus: 'Navigating to system diagnostics portal', value: 'https://workspace.internal/health' },
        { action: 'click', conciseStatus: 'Triggering real-time health audit' },
        { action: 'inspect', conciseStatus: 'Reading status indicators and telemetry' },
        { action: 'verify', conciseStatus: 'Verifying all backend services online' },
      ]);
    }
  };

  // Status badge styling
  const statusStyles: Record<LiveComputerStatus, { bg: string; text: string; ring: string }> = {
    LIVE: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', ring: 'ring-emerald-500/30' },
    THINKING: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', ring: 'ring-indigo-500/30' },
    ACTION: { bg: 'bg-amber-500/20', text: 'text-amber-300', ring: 'ring-amber-500/30' },
    WAITING: { bg: 'bg-sky-500/20', text: 'text-sky-300', ring: 'ring-sky-500/30' },
    PAUSED: { bg: 'bg-slate-500/20', text: 'text-slate-300', ring: 'ring-slate-500/30' },
    COMPLETED: { bg: 'bg-emerald-600/30', text: 'text-emerald-200', ring: 'ring-emerald-400/40' },
    ERROR: { bg: 'bg-rose-500/20', text: 'text-rose-300', ring: 'ring-rose-500/30' },
  };

  const currentStatusStyle = statusStyles[computerState.status] || statusStyles.LIVE;

  const viewportWidths = {
    desktop: 'w-full',
    tablet: 'max-w-2xl mx-auto',
    mobile: 'max-w-sm mx-auto',
  }[viewport];

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isFullscreen
          ? 'inset-0 p-2 bg-slate-950/90'
          : 'inset-4 md:inset-8 lg:inset-12 p-2 bg-slate-950/80 backdrop-blur-xl'
      } flex flex-col rounded-2xl border border-slate-800 shadow-2xl overflow-hidden`}
    >
      {/* Control Title Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">Live Computer</span>
              {/* Mandatory Status Badges */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ring-1 ${currentStatusStyle.bg} ${currentStatusStyle.text} ${currentStatusStyle.ring}`}
              >
                {computerState.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive browser & UI automation workspace for Suraj Rajput
            </p>
          </div>
        </div>

        {/* Viewport & Window Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 mr-2">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded ${viewport === 'desktop' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400'}`}
              title="Desktop Viewport"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded ${viewport === 'tablet' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400'}`}
              title="Tablet Viewport"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded ${viewport === 'mobile' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400'}`}
              title="Mobile Viewport"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setHidePreview(!hidePreview)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            title={hidePreview ? 'Show Preview' : 'Hide Preview'}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hidePreview ? 'Show' : 'Hide'}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser Controls & Actions Bar */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* URL Navigation Form */}
        <form onSubmit={handleNavigate} className="flex-1 min-w-[280px] flex items-center gap-1.5">
          <div className="relative flex-1">
            <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              placeholder="Enter URL to navigate..."
            />
          </div>
          <button
            type="submit"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Action Controls: Start, Pause, Resume, Stop, Screenshot */}
        <div className="flex items-center gap-1.5">
          {!computerState.isRunning ? (
            <button
              onClick={() => handleStartTask('workspace_search')}
              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-cyan-600/20"
            >
              <Play className="w-3 h-3" /> Start Task
            </button>
          ) : computerState.isPaused ? (
            <button
              onClick={() => computerEngine.resume()}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Resume
            </button>
          ) : (
            <button
              onClick={() => computerEngine.pause()}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Pause className="w-3 h-3" /> Pause
            </button>
          )}

          {computerState.isRunning && (
            <button
              onClick={() => computerEngine.stop()}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Square className="w-3 h-3" /> Stop
            </button>
          )}

          <button
            onClick={() => computerEngine.captureScreenshot()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            title="Take Screenshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Body: Screen Viewport & Live Action Log Feed */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Visual Browser Screen Viewport */}
        {!hidePreview && (
          <div className="flex-1 bg-slate-950 p-4 flex flex-col items-center justify-center overflow-auto border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className={`transition-all duration-300 ${viewportWidths} h-full flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 shadow-inner overflow-hidden`}>
              {/* Browser Window Chrome */}
              <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-mono text-[11px] text-slate-300">{computerState.currentUrl}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-emerald-400">● Sandbox Active</span>
                </div>
              </div>

              {/* Rendered Viewport Sandbox */}
              <div className="flex-1 p-6 flex flex-col justify-between relative bg-gradient-to-b from-slate-900/60 to-slate-950 overflow-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-base text-slate-100">Suraj Rajput Workspace Internal Hub</h3>
                      <p className="text-xs text-slate-400">Radhe Krishna Live Computer Interface</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 text-xs font-mono border border-cyan-500/20">
                      DOM Node Tree Ready
                    </span>
                  </div>

                  {/* Representative Active UI Component in Sandbox */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-colors">
                      <div className="text-xs font-semibold text-slate-300 mb-1">Gmail Intelligence Status</div>
                      <div className="text-2xl font-bold text-cyan-400 font-mono">Synced</div>
                      <p className="text-[11px] text-slate-500 mt-1">Authorized scopes enabled for inbox scanning</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-colors">
                      <div className="text-xs font-semibold text-slate-300 mb-1">Calendar Scheduler</div>
                      <div className="text-2xl font-bold text-pink-400 font-mono">Active</div>
                      <p className="text-[11px] text-slate-500 mt-1">Ready for appointments & agenda synthesis</p>
                    </div>
                  </div>

                  {/* Interactive form element sandbox */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Quick Test Query Field</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search workspace assets..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                        defaultValue="Radhe Krishna AI production rollout"
                      />
                      <button
                        onClick={() => handleStartTask('workspace_search')}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
                      >
                        Inspect UI
                      </button>
                    </div>
                  </div>
                </div>

                {/* Screenshot preview overlay if captured */}
                {computerState.screenshotUrl && (
                  <div className="mt-4 p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-300">Latest Screen Capture ready</span>
                    </div>
                    <a
                      href={computerState.screenshotUrl}
                      download={`screenshot_${Date.now()}.png`}
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      Download <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Logs Feed (Clean, concise action status - NO hidden chain-of-thought slop) */}
        <div className="w-full lg:w-80 bg-slate-900/90 p-4 flex flex-col overflow-hidden border-t lg:border-t-0 border-slate-800">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Live Action Feed
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {computerState.actionLogs.length} Events
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {computerState.actionLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2"
              >
                {log.type === 'verify' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                ) : log.type === 'inspect' ? (
                  <Terminal className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-slate-200 text-[11px] leading-tight">{log.text}</p>
                  <span className="text-[9px] text-slate-500 mt-1 block">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
