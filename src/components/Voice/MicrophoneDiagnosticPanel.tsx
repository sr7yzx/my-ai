import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  Cpu,
  Activity,
  Zap,
} from 'lucide-react';
import {
  geminiLiveEngine,
  LiveVoiceDiagnostics,
} from '../../services/geminiLiveVoiceEngine';

interface MicrophoneDiagnosticPanelProps {
  className?: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
}

export const MicrophoneDiagnosticPanel: React.FC<MicrophoneDiagnosticPanelProps> = ({
  className = '',
  onTranscript,
}) => {
  const [diag, setDiag] = useState<LiveVoiceDiagnostics>(geminiLiveEngine.getDiagnostics());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    permission: boolean;
    micDetected: boolean;
    audioLevel: number;
    geminiLiveConnected: boolean;
    details: string;
  } | null>(null);

  useEffect(() => {
    const unsub = geminiLiveEngine.subscribe((d) => {
      setDiag(d);
    });
    return unsub;
  }, []);

  const handleToggleVoice = async () => {
    if (diag.listening) {
      geminiLiveEngine.stopLiveSession();
    } else {
      setTestResult(null);
      try {
        await geminiLiveEngine.startLiveSession((text, role) => {
          if (onTranscript) {
            onTranscript(text, role);
          }
        });
      } catch {
        // error captured in state
      }
    }
  };

  const handleToggleMute = () => {
    geminiLiveEngine.setMute(!diag.isMuted);
  };

  const handleReconnect = async () => {
    geminiLiveEngine.stopLiveSession();
    await geminiLiveEngine.refreshDevices();
    try {
      await geminiLiveEngine.startLiveSession((text, role) => {
        if (onTranscript) {
          onTranscript(text, role);
        }
      });
    } catch {
      // error captured in state
    }
  };

  const handleSelectMic = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    await geminiLiveEngine.setSelectedMicrophone(deviceId);
  };

  const handleRunSelfTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await geminiLiveEngine.runFullPipelineTest();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        permission: false,
        micDetected: false,
        audioLevel: 0,
        geminiLiveConnected: false,
        details: err.message || 'Self test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      className={`w-full bg-slate-950/95 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md font-sans text-slate-100 flex flex-col gap-3 ${className}`}
    >
      {/* 1. Header with Real Backend State Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wide flex items-center gap-2">
              <span>REAL-TIME GEMINI LIVE VOICE PIPELINE</span>
              {diag.geminiSession === 'LIVE_CONNECTED' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 font-mono text-emerald-400 border border-emerald-500/30 font-bold">
                  LIVE SESSION ACTIVE
                </span>
              )}
              {diag.geminiSession === 'FALLBACK_MODE' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 font-mono text-amber-400 border border-amber-500/30 font-bold">
                  FALLBACK (TURN-BASED)
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Model: {diag.model} • Audio: 16kHz In / 24kHz Out
            </div>
          </div>
        </div>

        {/* Global Connection Status */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              diag.geminiSession === 'LIVE_CONNECTED'
                ? 'bg-emerald-400 animate-ping shadow-sm shadow-emerald-400'
                : diag.geminiSession === 'CONNECTING'
                ? 'bg-amber-400 animate-pulse'
                : diag.geminiSession === 'FALLBACK_MODE'
                ? 'bg-amber-400'
                : 'bg-slate-600'
            }`}
          />
          <span
            className={
              diag.geminiSession === 'LIVE_CONNECTED'
                ? 'text-emerald-400 font-bold'
                : diag.geminiSession === 'CONNECTING'
                ? 'text-amber-300 font-bold'
                : diag.geminiSession === 'FALLBACK_MODE'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400'
            }
          >
            {diag.geminiSession === 'LIVE_CONNECTED'
              ? 'CONNECTED'
              : diag.geminiSession === 'CONNECTING'
              ? 'CONNECTING...'
              : diag.geminiSession === 'FALLBACK_MODE'
              ? 'FALLBACK'
              : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Visual Flow: MIC → STREAMING → GEMINI CONNECTED → AUDIO RECEIVED → SPEAKING */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-mono overflow-x-auto gap-1">
        {/* Stage 1: MIC */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              diag.micDetected && diag.permissionGranted === 'granted'
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                : 'bg-rose-500'
            }`}
          />
          <span className={diag.micDetected ? 'text-slate-200 font-bold' : 'text-slate-500'}>MIC</span>
        </div>
        <span className="text-slate-600">→</span>

        {/* Stage 2: STREAMING */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              diag.listening ? 'bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400' : 'bg-slate-700'
            }`}
          />
          <span className={diag.listening ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
            STREAMING {diag.audioFramesSent > 0 ? `(${diag.audioFramesSent})` : ''}
          </span>
        </div>
        <span className="text-slate-600">→</span>

        {/* Stage 3: GEMINI CONNECTED */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              diag.geminiSession === 'LIVE_CONNECTED'
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                : diag.geminiSession === 'CONNECTING'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-700'
            }`}
          />
          <span
            className={
              diag.geminiSession === 'LIVE_CONNECTED'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-500'
            }
          >
            GEMINI CONNECTED
          </span>
        </div>
        <span className="text-slate-600">→</span>

        {/* Stage 4: AUDIO RECEIVED */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              diag.audioChunksReceived > 0
                ? 'bg-pink-400 shadow-sm shadow-pink-400'
                : 'bg-slate-700'
            }`}
          />
          <span
            className={
              diag.audioChunksReceived > 0 ? 'text-pink-300 font-bold' : 'text-slate-500'
            }
          >
            AUDIO RECEIVED {diag.audioChunksReceived > 0 ? `(${diag.audioChunksReceived})` : ''}
          </span>
        </div>
        <span className="text-slate-600">→</span>

        {/* Stage 5: SPEAKING */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              diag.aiSpeaking ? 'bg-pink-500 animate-bounce' : 'bg-slate-700'
            }`}
          />
          <span className={diag.aiSpeaking ? 'text-pink-400 font-bold' : 'text-slate-500'}>
            SPEAKING
          </span>
        </div>
      </div>

      {/* 2. Error / Warning Banner */}
      {diag.errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] leading-relaxed">
            <span className="font-semibold block text-rose-300">Live Connection Status:</span>
            {diag.errorMessage}
          </div>
        </div>
      )}

      {/* Flat-Line Warning during active mic capture */}
      {diag.listening && diag.isFlatLevel && !diag.isMuted && (
        <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-700/60 text-amber-200 text-[11px] flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Audio level is flat (0%).</strong> Check your hardware microphone switch or select another microphone below.
          </span>
        </div>
      )}

      {/* 3. The 8 Required Real Diagnostics Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {/* 1. MIC DETECTED */}
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-mono">MIC DETECTED</span>
          <div className="flex items-center gap-1.5 mt-1">
            {diag.micDetected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-400 truncate">
                  {diag.availableDevices.length} Input{diag.availableDevices.length > 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="font-semibold text-rose-400">Not Detected</span>
              </>
            )}
          </div>
        </div>

        {/* 2. MIC PERMISSION */}
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-mono">MIC PERMISSION</span>
          <div className="flex items-center gap-1.5 mt-1">
            {diag.permissionGranted === 'granted' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-400">Granted</span>
              </>
            ) : diag.permissionGranted === 'denied' ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="font-semibold text-rose-400">Denied</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-amber-400">Prompt</span>
              </>
            )}
          </div>
        </div>

        {/* 3. GEMINI SESSION (Real Backend State) */}
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-mono">GEMINI SESSION</span>
          <div className="flex items-center gap-1.5 mt-1">
            {diag.geminiSession === 'LIVE_CONNECTED' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-400 font-mono text-[10px]">Live Session</span>
              </>
            ) : diag.geminiSession === 'CONNECTING' ? (
              <>
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                <span className="font-semibold text-amber-300 font-mono text-[10px]">Negotiating</span>
              </>
            ) : diag.geminiSession === 'FALLBACK_MODE' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-amber-300 font-mono text-[10px]">Fallback Mode</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="font-semibold text-slate-500 font-mono text-[10px]">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* 4. AUDIO SENT (Real Frame Count) */}
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-mono">AUDIO SENT</span>
          <div className="flex items-center gap-1.5 mt-1 font-mono">
            <Zap className={`w-3.5 h-3.5 ${diag.audioFramesSent > 0 ? 'text-cyan-400' : 'text-slate-600'}`} />
            <span className="font-bold text-cyan-300 text-xs">
              {diag.audioFramesSent} frames
            </span>
          </div>
        </div>

        {/* 5. AUDIO RECEIVED (Real Output Chunk Count) */}
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-mono">AUDIO RECEIVED</span>
          <div className="flex items-center gap-1.5 mt-1 font-mono">
            <Radio className={`w-3.5 h-3.5 ${diag.audioChunksReceived > 0 ? 'text-pink-400' : 'text-slate-600'}`} />
            <span className="font-bold text-pink-300 text-xs">
              {diag.audioChunksReceived} chunks
            </span>
          </div>
        </div>

        {/* 6. AI SPEAKING (Authoritative Playback State) */}
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-mono">AI SPEAKING</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Volume2 className={`w-3.5 h-3.5 ${diag.aiSpeaking ? 'text-pink-400 animate-bounce' : 'text-slate-600'}`} />
            <span className={`font-semibold ${diag.aiSpeaking ? 'text-pink-400' : 'text-slate-500'}`}>
              {diag.aiSpeaking ? 'Playing 24kHz' : 'Silent'}
            </span>
          </div>
        </div>

        {/* 7. REAL-TIME AUDIO LEVEL VU METER */}
        <div className="col-span-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>AUDIO LEVEL (MIC)</span>
            <span className={`font-bold ${diag.audioLevel > 5 ? 'text-cyan-400' : 'text-slate-500'}`}>
              {diag.audioLevel}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800 mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                diag.audioLevel > 65
                  ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-rose-500'
                  : diag.audioLevel > 5
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  : 'bg-slate-700'
              }`}
              style={{ width: `${diag.audioLevel}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Controls: Start Voice, Mute, Reconnect, Select Mic & Self-Test */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* 🎙️ Start / Stop Real-Time Voice */}
        <button
          onClick={handleToggleVoice}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
            diag.listening
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
          }`}
        >
          {diag.listening ? (
            <>
              <MicOff className="w-4 h-4" />
              <span>Stop Voice</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 animate-bounce" />
              <span>🎙️ Start Voice</span>
            </>
          )}
        </button>

        {/* 🔇 Mute / Unmute Button */}
        <button
          onClick={handleToggleMute}
          disabled={!diag.listening}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
            diag.isMuted
              ? 'bg-amber-600/20 border-amber-500 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          } disabled:opacity-40`}
          title={diag.isMuted ? 'Microphone is Muted - Click to Unmute' : 'Mute Microphone'}
        >
          {diag.isMuted ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Unmute</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-slate-400" />
              <span>🔇 Mute</span>
            </>
          )}
        </button>

        {/* 🔄 Reconnect Button */}
        <button
          onClick={handleReconnect}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all"
          title="Reset stream and reconnect Gemini Live session"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>🔄 Reconnect</span>
        </button>

        {/* 🧪 Test Microphone Controls */}
        <button
          onClick={handleRunSelfTest}
          disabled={isTesting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all disabled:opacity-50"
        >
          <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Testing Pipeline...' : 'Test Microphone'}</span>
        </button>

        {/* 🎤 Select Microphone Dropdown */}
        <div className="flex-1 min-w-[200px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={diag.selectedDeviceId}
            onChange={handleSelectMic}
            className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer truncate"
          >
            {diag.availableDevices.length > 0 ? (
              diag.availableDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-slate-200">
                  {d.label || 'Default Microphone'}
                </option>
              ))
            ) : (
              <option value="" className="bg-slate-900 text-slate-400">
                Default System Microphone
              </option>
            )}
          </select>
        </div>
      </div>

      {/* 5. Self-Test Result Box */}
      {testResult && (
        <div
          className={`p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
            testResult.permission && testResult.geminiLiveConnected
              ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
              : 'bg-amber-950/50 border-amber-700/60 text-amber-200'
          }`}
        >
          {testResult.permission && testResult.geminiLiveConnected ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold block">
              {testResult.permission && testResult.geminiLiveConnected
                ? 'End-to-End Pipeline Verified:'
                : 'Pipeline Diagnostic Notice:'}
            </span>
            <span>{testResult.details}</span>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
              <span>Permission: {testResult.permission ? 'OK' : 'FAIL'}</span>
              <span>•</span>
              <span>Mic: {testResult.micDetected ? 'DETECTED' : 'NOT FOUND'}</span>
              <span>•</span>
              <span>Level: {testResult.audioLevel}%</span>
              <span>•</span>
              <span>Gemini Live: {testResult.geminiLiveConnected ? 'ESTABLISHED' : 'FALLBACK'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
