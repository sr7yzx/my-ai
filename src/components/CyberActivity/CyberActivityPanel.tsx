import React, { useEffect, useRef, useState } from 'react';
import {
  Radio,
  Activity,
  Cpu,
  Zap,
  ShieldAlert,
  Volume2,
  Mic,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  SystemActivityState,
  subscribeSystemActivity,
  LipSyncFrame,
  subscribeLipSync,
} from '../../services/voiceConversationEngine';
import { getAnalyserNode } from '../../services/audioService';

interface CyberActivityPanelProps {
  className?: string;
}

export const CyberActivityPanel: React.FC<CyberActivityPanelProps> = ({
  className = '',
}) => {
  const [activityState, setActivityState] = useState<SystemActivityState>('IDLE');
  const [lipSync, setLipSync] = useState<LipSyncFrame>({
    openRatio: 0,
    widthRatio: 1,
    roundRatio: 0,
    consonantPress: 0,
    teethVisible: false,
    tongueElevation: 0,
    viseme: 'closed',
    volume: 0,
    volumeDb: -100,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signalStrength, setSignalStrength] = useState(4); // 1-4 bars
  const [latencyMs, setLatencyMs] = useState(16);

  // Subscribe to real system state
  useEffect(() => {
    const unsubState = subscribeSystemActivity((st) => setActivityState(st));
    const unsubLipSync = subscribeLipSync((ls) => setLipSync(ls));
    return () => {
      unsubState();
      unsubLipSync();
    };
  }, []);

  // Live Waveform & Spectrum Canvas Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      phase += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle cyber grid
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 14;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw real FFT frequency spectrum bars
      const analyser = getAnalyserNode();
      const isVoiceActive = activityState === 'VOICE_OUTPUT' || activityState === 'VOICE_INPUT';

      if (analyser && isVoiceActive) {
        const bufferLength = 32;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 0.8;
        let x = 2;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height - 8);

          // Dynamic gradient based on state
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          if (activityState === 'VOICE_OUTPUT') {
            grad.addColorStop(0, '#ec4899');
            grad.addColorStop(1, '#818cf8');
          } else {
            grad.addColorStop(0, '#06b6d4');
            grad.addColorStop(1, '#10b981');
          }

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 2;
        }

        // Draw overlay oscilloscope sine line
        ctx.beginPath();
        ctx.strokeStyle = activityState === 'VOICE_OUTPUT' ? '#f472b6' : '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = activityState === 'VOICE_OUTPUT' ? '#ec4899' : '#06b6d4';
        ctx.shadowBlur = 6;

        const sliceWidth = width / bufferLength;
        let curX = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2.2;
          if (i === 0) ctx.moveTo(curX, y);
          else ctx.lineTo(curX, y);
          curX += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Idle / Processing ambient quantum wave
        ctx.beginPath();
        ctx.strokeStyle = activityState === 'AI_PROCESSING' ? '#a855f7' : '#0ea5e9';
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x++) {
          const waveHeight = activityState === 'AI_PROCESSING' ? 12 : 3;
          const y =
            height / 2 +
            Math.sin(x * 0.08 + phase) * waveHeight * Math.cos(x * 0.02 + phase * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activityState]);

  // Color & Badge per state
  const stateMeta = {
    IDLE: {
      label: 'IDLE • STANDBY',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      icon: Activity,
      glow: 'shadow-emerald-500/20',
      desc: 'Radhe ready for voice/text',
    },
    VOICE_INPUT: {
      label: 'VOICE INPUT [VAD]',
      color: 'text-cyan-400 animate-pulse',
      border: 'border-cyan-500/50',
      bg: 'bg-cyan-500/20',
      icon: Mic,
      glow: 'shadow-cyan-500/30',
      desc: 'Listening to Suraj Rajput...',
    },
    AI_PROCESSING: {
      label: 'AI PROCESSING',
      color: 'text-purple-400 animate-pulse',
      border: 'border-purple-500/50',
      bg: 'bg-purple-500/20',
      icon: Cpu,
      glow: 'shadow-purple-500/30',
      desc: 'Gemini reasoning & planning',
    },
    VOICE_OUTPUT: {
      label: 'VOICE OUTPUT [24kHz]',
      color: 'text-pink-400',
      border: 'border-pink-500/50',
      bg: 'bg-pink-500/20',
      icon: Volume2,
      glow: 'shadow-pink-500/30',
      desc: 'Formant lip-sync active',
    },
    TOOL_ACTIVE: {
      label: 'TOOL ACTIVE',
      color: 'text-amber-400',
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/20',
      icon: Zap,
      glow: 'shadow-amber-500/30',
      desc: 'Executing authorized action',
    },
    ERROR: {
      label: 'SYSTEM ALERT',
      color: 'text-rose-400',
      border: 'border-rose-500/50',
      bg: 'bg-rose-500/20',
      icon: ShieldAlert,
      glow: 'shadow-rose-500/30',
      desc: 'Reconnecting telemetry stream',
    },
  }[activityState];

  const StateIcon = stateMeta.icon;

  return (
    <div
      className={`w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3 shadow-xl backdrop-blur-md flex flex-col gap-2.5 font-mono select-none ${className}`}
    >
      {/* 1. Top Antenna & RF Signal Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider text-slate-300">CYBER TELEMETRY</span>
        </div>

        {/* Small Antenna Signal Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 font-mono">5.8GHz • {latencyMs}ms</span>
          <div className="flex items-end gap-0.5 h-3" title="Signal: -38 dBm (Optimal)">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={`w-1 rounded-sm transition-all duration-300 ${
                  bar <= signalStrength ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-700'
                }`}
                style={{ height: `${bar * 25}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Current Real System Activity State Badge */}
      <div
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border ${stateMeta.bg} ${stateMeta.border} shadow-md ${stateMeta.glow} transition-all duration-300`}
      >
        <div className="flex items-center gap-2">
          <StateIcon className={`w-3.5 h-3.5 ${stateMeta.color}`} />
          <span className={`text-[11px] font-extrabold tracking-wider ${stateMeta.color}`}>
            {stateMeta.label}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-sans truncate max-w-[130px]">
          {stateMeta.desc}
        </span>
      </div>

      {/* 3. Live Signal Waveform & Audio Spectrum Canvas */}
      <div className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
        <canvas
          ref={canvasRef}
          width={280}
          height={64}
          className="w-full h-16 block"
        />
        <div className="absolute top-1 left-2 flex items-center gap-2 text-[9px] text-slate-500">
          <span>OSCILLO / FFT SPECTRUM</span>
          {lipSync.volume > 0.05 && (
            <span className="text-pink-400 font-bold font-mono">
              {lipSync.volumeDb} dB
            </span>
          )}
        </div>
      </div>

      {/* 4. Real-Time Lip-Sync Formant Telemetry */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-500">MOUTH STATE:</span>
          <span
            className={`font-bold uppercase ${
              lipSync.viseme === 'closed'
                ? 'text-slate-400'
                : 'text-pink-400 animate-pulse font-mono'
            }`}
          >
            {lipSync.viseme.replace('_', ' ')}
          </span>
        </div>

        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-500">OPENNESS:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-pink-500 h-full transition-all duration-75"
                style={{ width: `${Math.round(lipSync.openRatio * 100)}%` }}
              />
            </div>
            <span className="text-slate-300 font-mono text-[9px]">
              {Math.round(lipSync.openRatio * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* 5. Neural Node Matrix Visualization */}
      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-slate-400">NEURAL BUS</span>
        </div>

        {/* Dynamic Nodes pulsing with actual state */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((node) => {
            const isPulsing =
              (activityState === 'AI_PROCESSING' && (node === 2 || node === 3 || node === 4)) ||
              (activityState === 'VOICE_OUTPUT' && (node === 1 || node === 5)) ||
              (activityState === 'VOICE_INPUT' && node === 1);

            return (
              <span
                key={node}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  isPulsing
                    ? 'bg-pink-400 scale-125 shadow-sm shadow-pink-400 animate-ping'
                    : activityState === 'AI_PROCESSING'
                    ? 'bg-purple-400 shadow-sm shadow-purple-400'
                    : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
