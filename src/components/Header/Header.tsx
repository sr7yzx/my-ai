import React from 'react';
import {
  Brain,
  Monitor,
  Workflow,
  Code2,
  FolderOpen,
  Radio,
  Settings,
  Maximize2,
  Minimize2,
  Sparkles,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onOpenMemory: () => void;
  onOpenComputer: () => void;
  onOpenAutomations: () => void;
  onOpenProjects: () => void;
  onOpenFiles: () => void;
  onOpenConnections: () => void;
  onOpenSettings: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onOpenMemory,
  onOpenComputer,
  onOpenAutomations,
  onOpenProjects,
  onOpenFiles,
  onOpenConnections,
  onOpenSettings,
  isFocusMode,
  onToggleFocusMode,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between shadow-sm">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-pink-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent font-['Outfit']">
              RADHE KRISHNA AI
            </span>
            <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
              VIRTUAL AGENT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <span>Companion for</span>
            <span className="text-pink-300 font-semibold">Suraj Rajput</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px]">Online</span>
          </p>
        </div>
      </div>

      {/* Center Tool Navigation Bar */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
        <button
          onClick={onOpenMemory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Long-Term Memory Center"
        >
          <Brain className="w-4 h-4 text-purple-400" />
          <span>Memory Center</span>
        </button>

        <button
          onClick={onOpenComputer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Live Computer Sandbox"
        >
          <Monitor className="w-4 h-4 text-cyan-400" />
          <span>Live Computer</span>
        </button>

        <button
          onClick={onOpenAutomations}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Real Automation Workflows"
        >
          <Workflow className="w-4 h-4 text-amber-400" />
          <span>Automations</span>
        </button>

        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Project Code Workspace"
        >
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span>Projects</span>
        </button>

        <button
          onClick={onOpenFiles}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Files & Documents"
        >
          <FolderOpen className="w-4 h-4 text-blue-400" />
          <span>Files</span>
        </button>

        <button
          onClick={onOpenConnections}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Google Workspace & Apps"
        >
          <Radio className="w-4 h-4 text-pink-400" />
          <span>Connections</span>
        </button>
      </nav>

      {/* Right Controls: Sign In, Focus Mode, Settings */}
      <div className="flex items-center gap-2">
        {/* Google Workspace Sign-In Button */}
        {user ? (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1">
            <img
              src={user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Suraj'}
              alt={user.displayName || 'Suraj'}
              className="w-6 h-6 rounded-full border border-pink-500/40"
            />
            <div className="text-left hidden sm:block">
              <p className="text-[11px] font-semibold text-slate-200 leading-tight">
                {user.displayName || 'Suraj Rajput'}
              </p>
              <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Workspace Connected
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition-colors ml-1"
              title="Sign out of Google Workspace"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl font-medium text-xs shadow-md transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
          >
            {/* Official Google G Icon */}
            <svg className="w-4 h-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>
        )}

        {/* Focus Mode Toggle */}
        <button
          onClick={onToggleFocusMode}
          className={`p-2 rounded-xl border transition-colors ${
            isFocusMode
              ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="System Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
