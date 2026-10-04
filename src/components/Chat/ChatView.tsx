import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Search,
  Volume2,
  VolumeX,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Terminal,
  Paperclip,
  Image as ImageIcon,
  History,
  Trash2,
  Play,
  RotateCw,
  Radio,
  Headphones,
} from 'lucide-react';
import { Message, ConversationSession, ToolExecution } from '../../types';
import { geminiLiveEngine } from '../../services/geminiLiveVoiceEngine';
import {
  startContinuousVoiceConversation,
  stopContinuousVoiceConversation,
  triggerBargeIn,
  speakRealTtsResponse,
  setSystemActivityState,
} from '../../services/voiceConversationEngine';
import { stopAudioPlayback } from '../../services/audioService';

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (text: string, attachedImage?: { base64: string; mimeType: string }) => void;
  isLoading: boolean;
  statusText: string;
  isSpeaking: boolean;
  isListening: boolean;
  onSetListening: (listening: boolean) => void;
  onSelectPastSession: (session: ConversationSession) => void;
  pastSessions: ConversationSession[];
  onClearChat: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  statusText,
  isSpeaking,
  isListening,
  onSetListening,
  onSelectPastSession,
  pastSessions,
  onClearChat,
}) => {
  const [inputText, setInputText] = useState('');
  const [isVoiceConversationActive, setIsVoiceConversationActive] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || isLoading) return;

    // Barge in / stop speech when sending new message
    triggerBargeIn();
    onSendMessage(inputText.trim(), attachedImage ? { base64: attachedImage.base64, mimeType: attachedImage.mimeType } : undefined);
    setInputText('');
    setAttachedImage(null);
  };

  // Synchronize mic state from geminiLiveEngine
  useEffect(() => {
    const unsub = geminiLiveEngine.subscribe((d) => {
      setIsVoiceConversationActive(d.listening);
    });
    return unsub;
  }, []);

  // Toggle Hands-Free Real-Time Voice Conversation Mode via Gemini Live
  const handleToggleVoiceConversation = async () => {
    const diag = geminiLiveEngine.getDiagnostics();
    if (diag.listening) {
      geminiLiveEngine.stopLiveSession();
      setIsVoiceConversationActive(false);
      onSetListening(false);
    } else {
      triggerBargeIn();
      setIsVoiceConversationActive(true);
      onSetListening(true);

      try {
        await geminiLiveEngine.startLiveSession((spokenText, role) => {
          if (role === 'user' && spokenText.trim()) {
            onSendMessage(spokenText.trim());
          }
        });
      } catch {
        setIsVoiceConversationActive(false);
        onSetListening(false);
      }
    }
  };

  const handlePlayAudio = (msg: Message) => {
    if (playingMessageId === msg.id) {
      stopAudioPlayback();
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(msg.id);
    speakRealTtsResponse(
      msg.content.slice(0, 300),
      'Kore',
      () => setPlayingMessageId(msg.id),
      () => setPlayingMessageId(null)
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setAttachedImage({
        base64,
        mimeType: file.type || 'image/jpeg',
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const quickPrompts = [
    { label: 'Gmail check karo', prompt: 'Radhe Krishna, Gmail check karo aur jo important emails hain unka summary batao.' },
    { label: 'Calendar Agenda', prompt: 'Google Calendar me aane wale events check karo aur mera schedule batao.' },
    { label: 'Continue Yesterday\'s Project', prompt: 'Continue the website project we worked on yesterday.' },
    { label: 'Live Computer Search', prompt: 'Live Computer me internal workspace open karke latest components inspect karo.' },
    { label: 'Research AI Breakthroughs', prompt: 'Research the latest multimodal AI developments with source citations.' },
  ];

  const filteredSessions = pastSessions.filter((s) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative overflow-hidden">
      {/* Session Header / Continuity Bar */}
      <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-slate-300">Active Conversation with Suraj Rajput</span>
          {statusText && (
            <span className="font-mono text-[11px] text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
              {statusText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[11px] flex items-center gap-1.5 transition-colors"
            title="Past Conversation History & Project Continuity"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Continuity History</span>
          </button>
          <button
            onClick={onClearChat}
            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
            title="Clear Chat Stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* History Continuity Drawer */}
      {showHistoryDrawer && (
        <div className="absolute top-10 right-4 z-40 w-80 max-h-96 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-4 flex flex-col backdrop-blur-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-purple-400" />
              Conversation Continuity
            </span>
            <button onClick={() => setShowHistoryDrawer(false)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search previous project sessions..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {filteredSessions.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-[11px]">No sessions found.</p>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectPastSession(session);
                    setShowHistoryDrawer(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-colors space-y-1"
                >
                  <div className="font-semibold text-slate-200 truncate">{session.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{session.summary}</p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                isUser ? 'ml-auto' : 'mr-auto'
              }`}
            >
              {/* Message Bubble Container */}
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-2 shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-sm backdrop-blur-md'
                }`}
              >
                {/* Assistant Label */}
                {!isUser && (
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800/80">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-pink-400 font-['Outfit'] flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-pink-400" /> Radhe Krishna AI
                    </span>
                    {msg.audioBase64 && (
                      <button
                        onClick={() => handlePlayAudio(msg)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-pink-300 text-[10px] flex items-center gap-1 font-mono transition-colors"
                        title="Play AI Voice"
                      >
                        {playingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-pink-400" /> Stop
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-pink-400" /> Voice
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Plan Steps Pipeline (PLAN -> EXECUTE -> VERIFY -> REPORT) */}
                {msg.planSteps && msg.planSteps.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1.5 mb-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-pink-400" />
                      Verified Plan Execution:
                    </div>
                    {msg.planSteps.map((step) => (
                      <div key={step.id} className="flex items-center gap-2 text-[11px]">
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : step.status === 'running' ? (
                          <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className={step.status === 'completed' ? 'text-slate-300' : 'text-slate-400'}>
                          {step.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tool Executions Chips */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="space-y-1.5 my-2">
                    {msg.toolCalls.map((tc) => (
                      <div
                        key={tc.id}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between"
                      >
                        <span className="text-slate-400">Tool: {tc.toolName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            tc.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {tc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Message Content */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Web Research Sources */}
                {msg.webSources && msg.webSources.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-800 text-[11px] space-y-1">
                    <span className="text-slate-500 font-mono block">Verified Grounding Sources:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.webSources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 flex items-center gap-1 font-mono text-[10px] transition-colors"
                        >
                          <span>{s.title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div
                  className={`text-[9px] font-mono pt-1 text-right ${
                    isUser ? 'text-pink-200/70' : 'text-slate-500'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 w-fit text-xs text-slate-400 animate-pulse font-mono">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
            <span>Radhe Krishna AI is synthesizing verified plan...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto bg-slate-950/60 border-t border-slate-800/80">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(qp.prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-2.5 h-2.5 text-pink-400" />
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        {/* Image Attachment Preview */}
        {attachedImage && (
          <div className="flex items-center gap-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800 w-fit">
            <img src={attachedImage.previewUrl} alt="Attachment" className="w-10 h-10 object-cover rounded-lg" />
            <span className="text-[11px] text-slate-300 font-mono">Photo attached for analysis</span>
            <button onClick={() => setAttachedImage(null)} className="text-slate-500 hover:text-rose-400 p-1">
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Attach image for visual analysis"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Real-Time Live Voice Conversation Toggle */}
          <button
            type="button"
            onClick={handleToggleVoiceConversation}
            className={`px-3 py-2 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all ${
              isVoiceConversationActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
            }`}
            title={
              isVoiceConversationActive
                ? 'Live Voice Conversation Active - Click to Stop'
                : 'Start Hands-Free Real-Time Voice Conversation'
            }
          >
            {isVoiceConversationActive ? (
              <>
                <Mic className="w-4 h-4 text-cyan-400 animate-bounce" />
                <span className="hidden sm:inline font-mono text-[11px]">VOICE LIVE</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline font-mono text-[11px]">VOICE MODE</span>
              </>
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              isVoiceConversationActive
                ? '🎤 Radhe is listening... speak naturally or type here...'
                : 'Instruct Radhe Krishna AI (e.g. Gmail check karo, analyze data, continue website)...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !attachedImage) || isLoading}
            className="p-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-md shadow-pink-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
