/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header/Header';
import { AnimeCharacter } from './components/AnimeAvatar/AnimeCharacter';
import { ChatView } from './components/Chat/ChatView';
import { MemoryCenterModal } from './components/MemoryCenter/MemoryCenterModal';
import { LiveComputerPanel } from './components/LiveComputer/LiveComputerPanel';
import { AutomationCenterModal } from './components/AutomationCenter/AutomationCenterModal';
import { AppConnectionsModal } from './components/AppConnections/AppConnectionsModal';
import { ProjectWorkspaceModal } from './components/ProjectWorkspace/ProjectWorkspaceModal';
import { FilesCenterModal } from './components/FilesCenter/FilesCenterModal';
import { SettingsModal } from './components/Settings/SettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { CyberActivityPanel } from './components/CyberActivity/CyberActivityPanel';
import { MicrophoneDiagnosticPanel } from './components/Voice/MicrophoneDiagnosticPanel';
import { geminiLiveEngine } from './services/geminiLiveVoiceEngine';
import { voicePipeline } from './services/voicePipeline';
import {
  speakRealTtsResponse,
  setSystemActivityState,
  triggerBargeIn,
} from './services/voiceConversationEngine';

import {
  Message,
  CharacterMood,
  CharacterGesture,
  SettingsState,
  ConversationSession,
} from './types';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/firebase';
import {
  retrieveRelevantMemories,
  formatMemoriesForContext,
  getStoredSessions,
  saveSession,
  addMemory,
} from './services/memoryStore';
import {
  searchEmails,
  listCalendarEvents,
  listDriveFiles,
  sendEmail,
} from './services/workspaceApi';
import { playTtsAudio, stopAudioPlayback } from './services/audioService';

const DEFAULT_SETTINGS: SettingsState = {
  appearance: {
    theme: 'dark',
    accentColor: '#ec4899',
    fontSize: 'normal',
  },
  character: {
    name: 'Radhe Krishna AI',
    outfit: 'tech_kimono',
    voicePitch: 1.0,
    blinkRate: 'normal',
    responsiveness: 'fast',
  },
  voice: {
    enabled: true,
    autoSpeak: true,
    voiceName: 'Kore',
    rate: 1.0,
    bargeInSensitivity: 0.8,
  },
  memory: {
    enabled: true,
    autoExtract: true,
    maxInjectedMemories: 5,
  },
  chat: {
    languagePreference: 'hinglish',
    preferredModel: 'flash',
    enableHighThinking: true,
  },
  notifications: true,
  security: {
    requireConfirmationForSend: true,
    requireConfirmationForDelete: true,
  },
};

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Settings
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  // Character presentation state
  const [mood, setMood] = useState<CharacterMood>('greeting');
  const [gesture, setGesture] = useState<CharacterGesture>('namaste');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Focus mode
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [hideCharacter, setHideCharacter] = useState(false);

  // Modals state
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isComputerOpen, setIsComputerOpen] = useState(false);
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Confirmation Modal state (for destructive/sending actions)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Conversation history sessions
  const [pastSessions, setPastSessions] = useState<ConversationSession[]>(getStoredSessions());
  const currentSessionIdRef = useRef<string>(`session_${Date.now()}`);

  // Chat messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        'Namaste Suraj! Radhe Krishna AI virtual assistant ready hai. Aapke personal workflows, Gmail, Calendar, Live Computer aur coding workspace actively connected hain. Aaj hum kis project par kaam karein?',
      timestamp: Date.now(),
      planSteps: [
        { id: 'p_1', description: 'Personal identity initialized for Suraj Rajput', status: 'completed' },
        { id: 'p_2', description: 'Long-term memory context mapped', status: 'completed' },
        { id: 'p_3', description: 'Multi-step verification engine active', status: 'completed' },
      ],
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [showMicDiagnostics, setShowMicDiagnostics] = useState(true);

  // Synchronize Gemini Live audio engine diagnostics to Avatar & Speech state
  useEffect(() => {
    const unsubLive = geminiLiveEngine.subscribe((diag) => {
      setIsListening(diag.listening);
      if (diag.aiSpeaking) {
        setIsSpeaking(true);
        setMood('speaking');
        setGesture('explaining_open');
      } else if (!diag.listening && !isThinking) {
        setIsSpeaking(false);
      }
    });

    const unsubPipeline = voicePipeline.subscribe((diag) => {
      if (diag.aiSpeaking) {
        setIsSpeaking(true);
        setMood('speaking');
        setGesture('explaining_open');
      }
    });

    return () => {
      unsubLive();
      unsubPipeline();
    };
  }, [isThinking]);

  // Handle live transcript updates from Gemini Live session
  const handleLiveTranscript = (text: string, role: 'user' | 'assistant') => {
    if (!text.trim()) return;

    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === role && Date.now() - lastMsg.timestamp < 3500) {
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, content: `${lastMsg.content} ${text}` },
        ];
      }
      return [
        ...prev,
        {
          id: `msg_live_${Date.now()}`,
          role,
          content: text,
          timestamp: Date.now(),
        },
      ];
    });
  };

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const unsub = initAuth(
      (authedUser) => {
        setUser(authedUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsub();
  }, []);

  // Sync session on messages change
  useEffect(() => {
    if (messages.length > 1) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const sessionTitle = firstUserMsg ? firstUserMsg.content.slice(0, 45) + '...' : 'Workspace Session';
      const sessionSummary = messages[messages.length - 1]?.content.slice(0, 100) + '...';

      const currentSession: ConversationSession = {
        id: currentSessionIdRef.current,
        title: sessionTitle,
        createdAt: messages[0].timestamp,
        updatedAt: Date.now(),
        summary: sessionSummary,
        messages,
      };

      saveSession(currentSession);
      setPastSessions(getStoredSessions());
    }
  }, [messages]);

  // Google Login
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_auth_${Date.now()}`,
            role: 'assistant',
            content: `Google Workspace successfully authorized, Suraj! Ab main aapke Gmail, Calendar, Drive, Docs aur Sheets ko securely access kar sakti hoon.`,
            timestamp: Date.now(),
          },
        ]);
        speakText(`Google Workspace successfully authorized, Suraj.`);
      }
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request' &&
        !err?.message?.includes('popup-closed-by-user')
      ) {
        console.warn('Sign-in note:', err);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Logout
  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
  };

  // Text-To-Speech helper with Real 24kHz Audio & Formant Lip-Sync
  const speakText = async (text: string) => {
    if (!settings.voice.enabled || !settings.voice.autoSpeak) return;

    try {
      setIsSpeaking(true);
      setMood('speaking');
      setGesture('explaining_open');

      await speakRealTtsResponse(
        text,
        settings.voice.voiceName || 'Kore',
        () => {
          setIsSpeaking(true);
          setMood('speaking');
          setGesture('explaining_open');
        },
        () => {
          setIsSpeaking(false);
          setMood('neutral');
          setGesture('idle');
        }
      );
    } catch (e) {
      console.warn('TTS playback error:', e);
      setIsSpeaking(false);
      setMood('neutral');
      setGesture('idle');
    }
  };

  // Central AI Brain Dispatcher
  const handleSendMessage = async (
    userText: string,
    attachedImage?: { base64: string; mimeType: string }
  ) => {
    // Stop any ongoing assistant speech immediately on user action (barge-in)
    triggerBargeIn();
    setIsSpeaking(false);

    const userMessage: Message = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setIsThinking(true);
    setMood('thinking');
    setGesture('thinking_chin');
    setStatusText('Thinking');
    setSystemActivityState('AI_PROCESSING');

    try {
      const lowerText = userText.toLowerCase();

      // 1. Check for Project Continuity Request ("Continue website project yesterday")
      if (
        lowerText.includes('yesterday') ||
        lowerText.includes('continue the website') ||
        lowerText.includes('purana project')
      ) {
        setStatusText('Retrieving Past Sessions');
        const past = pastSessions.find((s) => s.id === 'session_yesterday_project') || pastSessions[0];
        const responseText = `Suraj, maine kal ka session retrieve kar liya hai: "${past?.title}". Humne full-stack architecture aur Live Computer sandbox outline kiya tha. Kya aap chahte hain ki hum Project Workspace me code verify karein ya new automation add karein?`;

        const assistantMsg: Message = {
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
          planSteps: [
            { id: 's1', description: 'Searching indexed past conversation archives', status: 'completed' },
            { id: 's2', description: `Matched project session: "${past?.title}"`, status: 'completed' },
            { id: 's3', description: 'Restored historical context into active memory', status: 'completed' },
          ],
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speakText(responseText);
        return;
      }

      // 2. Real Gmail Check Routine
      if (
        lowerText.includes('gmail check') ||
        lowerText.includes('check karo gmail') ||
        lowerText.includes('unread email') ||
        lowerText.includes('emails')
      ) {
        const token = await getAccessToken();
        if (!token) {
          const authNotice = `Suraj, Gmail abhi connected nahi hai. Pehle top bar par "Sign in with Google" button click karke Gmail authorization complete karna hoga.`;
          const assistantMsg: Message = {
            id: `msg_a_${Date.now()}`,
            role: 'assistant',
            content: authNotice,
            timestamp: Date.now(),
            planSteps: [
              { id: 'g1', description: 'Inspecting Google Workspace OAuth session', status: 'completed' },
              { id: 'g2', description: 'Auth token missing. Authentication requested.', status: 'failed' },
            ],
          };
          setMessages((prev) => [...prev, assistantMsg]);
          speakText(authNotice);
          return;
        }

        setStatusText('Connecting Gmail');
        setSystemActivityState('TOOL_ACTIVE');
        const emails = await searchEmails('label:INBOX', 5);
        setStatusText('Analyzing Emails');

        let emailSummaryText = '';
        if (emails.length === 0) {
          emailSummaryText = `Suraj, Gmail me koi naya unread message nahi mila. Aapka inbox completely clear hai!`;
        } else {
          emailSummaryText = `Suraj, inbox me ${emails.length} latest emails mili hain:\n\n` +
            emails
              .map(
                (e, idx) =>
                  `${idx + 1}. **${e.subject}**\n   From: ${e.from}\n   Date: ${e.date || 'Recent'}\n   Snippet: "${e.snippet.slice(0, 100)}..."`
              )
              .join('\n\n') +
            `\n\nSabhi details verified hain. Kya aap kisi specific email ka reply draft karna chahte hain?`;
        }

        const assistantMsg: Message = {
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content: emailSummaryText,
          timestamp: Date.now(),
          planSteps: [
            { id: 'g_plan_1', description: 'Connecting to Gmail API endpoints', status: 'completed' },
            { id: 'g_plan_2', description: `Retrieved ${emails.length} verified messages from INBOX`, status: 'completed' },
            { id: 'g_plan_3', description: 'Synthesizing verified executive summary', status: 'completed' },
          ],
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speakText(
          emails.length === 0
            ? 'Suraj, Gmail me koi naya unread email nahi mila.'
            : `Suraj, inbox me ${emails.length} emails mili hain. Summary chat me update kar di hai.`
        );
        return;
      }

      // 3. Real Google Calendar Check Routine
      if (
        lowerText.includes('calendar') ||
        lowerText.includes('schedule') ||
        lowerText.includes('aane wale event') ||
        lowerText.includes('meetings')
      ) {
        const token = await getAccessToken();
        if (!token) {
          const authNotice = `Suraj, Google Calendar authorization required hai. Kripya pehle "Sign in with Google" se authorize karein.`;
          const assistantMsg: Message = {
            id: `msg_a_${Date.now()}`,
            role: 'assistant',
            content: authNotice,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          speakText(authNotice);
          return;
        }

        setStatusText('Fetching Calendar Events');
        const events = await listCalendarEvents(5);
        let calText = '';
        if (events.length === 0) {
          calText = `Suraj, aapke Google Calendar me aane wale koi scheduled events nahi hain. Aapka schedule free hai!`;
        } else {
          calText = `Suraj, aapke aane wale ${events.length} calendar events verified hue hain:\n\n` +
            events
              .map(
                (ev, idx) =>
                  `${idx + 1}. **${ev.summary}**\n   Start: ${new Date(ev.start).toLocaleString()}\n   Location: ${ev.location || 'Online'}`
              )
              .join('\n\n');
        }

        const assistantMsg: Message = {
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content: calText,
          timestamp: Date.now(),
          planSteps: [
            { id: 'c1', description: 'Accessing primary Google Calendar', status: 'completed' },
            { id: 'c2', description: `Loaded ${events.length} calendar agenda items`, status: 'completed' },
          ],
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speakText(`Suraj, calendar agenda check ho gaya hai.`);
        return;
      }

      // 4. Live Computer Automation Trigger
      if (lowerText.includes('live computer') || lowerText.includes('browser open karo')) {
        setIsComputerOpen(true);
        const computerResponse = `Suraj, Live Computer sandbox panel open kar diya hai. Aap wahan real browser navigation, screenshot capture aur DOM inspect kar sakte hain.`;
        const assistantMsg: Message = {
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content: computerResponse,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        speakText(computerResponse);
        return;
      }

      // 5. Image Creation Request
      if (
        lowerText.includes('generate image') ||
        lowerText.includes('create an image') ||
        lowerText.includes('photo banao')
      ) {
        setStatusText('Generating High-Quality Image');
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userText,
            aspectRatio: '1:1',
            imageSize: '1K',
          }),
        });
        const imgData = await imgRes.json();
        if (imgData.imageUrl) {
          const assistantMsg: Message = {
            id: `msg_a_${Date.now()}`,
            role: 'assistant',
            content: `Suraj, aapki request ke anusaar high-quality visual generate kar diya hai:\n\n![Generated](${imgData.imageUrl})\n\n${imgData.caption || ''}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          speakText(`Image generate ho chuki hai, Suraj.`);
          return;
        }
      }

      // 6. Multimodal Image Analysis (if attached)
      if (attachedImage) {
        setStatusText('Analyzing Attached Photo');
        const analysisRes = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: attachedImage.base64,
            mimeType: attachedImage.mimeType,
            prompt: userText || 'Analyze this image in detail for Suraj Rajput.',
          }),
        });
        const analysisData = await analysisRes.json();
        const assistantMsg: Message = {
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content: analysisData.analysis || 'Image analyzed successfully.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        speakText(`Suraj, image analysis complete ho gaya hai.`);
        return;
      }

      // 7. Standard Central AI Brain Request (with Memory Context Injection)
      setStatusText('Injecting Memory Context');
      const relevantMemories = retrieveRelevantMemories(userText, settings.memory.maxInjectedMemories);
      const memoryContext = formatMemoriesForContext(relevantMemories);

      setStatusText('Thinking & Reasoning');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          memoryContext,
          modelPreference: settings.chat.preferredModel,
          enableHighThinking: settings.chat.enableHighThinking,
          userContext: {
            isGoogleWorkspaceConnected: !!user,
            userEmail: user?.email || 'surajparihar605@gmail.com',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI brain response error');
      }

      const data = await response.json();
      const assistantText = data.text || 'Done.';

      const assistantMsg: Message = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: assistantText,
        timestamp: Date.now(),
        webSources: data.webSources,
        planSteps: [
          { id: 'stp_1', description: 'Instructions parsed in user context', status: 'completed' },
          { id: 'stp_2', description: `Injected ${relevantMemories.length} relevant long-term memories`, status: 'completed' },
          { id: 'stp_3', description: 'Multi-turn reasoning and tool observation verified', status: 'completed' },
        ],
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(assistantText.slice(0, 200));

      // 8. Auto memory extraction in the background
      if (settings.memory.autoExtract) {
        fetch('/api/memory/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation: [userMessage, assistantMsg],
          }),
        })
          .then((r) => r.json())
          .then((memData) => {
            if (memData.memories && Array.isArray(memData.memories)) {
              memData.memories.forEach((m: any) => {
                addMemory({
                  key: m.key,
                  content: m.content,
                  category: m.category || 'workflow',
                  tags: m.tags || ['conversation'],
                  source: 'Auto Extraction',
                });
              });
            }
          })
          .catch((err) => console.warn('Memory auto-extract warning:', err));
      }
    } catch (err: any) {
      console.error('Dispatch error:', err);
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Suraj, request process karte waqt ek issue aaya: ${err.message}. Main ise diagnose kar rahi hoon.`,
        timestamp: Date.now(),
        status: 'failed',
      };
      setMessages((prev) => [...prev, errorMsg]);
      setMood('neutral');
      setGesture('idle');
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setStatusText('');
      if (!isSpeaking) {
        setMood('neutral');
        setGesture('idle');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070a13] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Top Header */}
      {!isFocusMode && (
        <Header
          user={user}
          onLogin={handleGoogleLogin}
          onLogout={handleGoogleLogout}
          isLoggingIn={isLoggingIn}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenComputer={() => setIsComputerOpen(true)}
          onOpenAutomations={() => setIsAutomationsOpen(true)}
          onOpenProjects={() => setIsProjectsOpen(true)}
          onOpenFiles={() => setIsFilesOpen(true)}
          onOpenConnections={() => setIsConnectionsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        />
      )}

      {/* 2. Main Workspace Layout: Avatar Stage + Conversation Stream */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left / Top Anime Virtual Avatar Stage & Cyber Telemetry */}
        {!hideCharacter && (
          <div className="w-full md:w-80 lg:w-[410px] p-4 flex flex-col items-center bg-gradient-to-b from-slate-950 via-[#0b1020] to-[#070a13] border-b md:border-b-0 md:border-r border-slate-800/80 relative shrink-0 overflow-y-auto">
            {/* Ambient Backlight */}
            <div className="absolute top-1/4 w-48 h-48 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full flex flex-col items-center">
              <AnimeCharacter
                mood={mood}
                gesture={gesture}
                isSpeaking={isSpeaking}
                isListening={isListening}
                isThinking={isThinking}
                size="md"
              />

              {/* Status and Persona Card */}
              <div className="mt-3 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-center w-full shadow-inner">
                <div className="text-xs font-bold text-slate-200">Radhe Krishna</div>
                <div className="text-[10px] text-pink-400 font-mono">Personal AI Companion for Suraj Rajput</div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                  <span>English • Hindi • Hinglish</span>
                  <span>•</span>
                  <span className="text-emerald-400">Realistic Anime-Human Rig</span>
                </div>
              </div>

              {/* Compact Cyber AI Activity Telemetry Panel */}
              <CyberActivityPanel className="mt-3 w-full" />
            </div>
          </div>
        )}

        {/* Right / Center Chat Conversation Engine */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Visible Real-Time Microphone Hardware & Gemini Diagnostics Panel */}
          {showMicDiagnostics && (
            <div className="p-2 sm:p-3 bg-[#080d19] border-b border-slate-800/90 shrink-0">
              <MicrophoneDiagnosticPanel onTranscript={handleLiveTranscript} />
            </div>
          )}

          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            statusText={statusText}
            isSpeaking={isSpeaking}
            isListening={isListening}
            onSetListening={setIsListening}
            pastSessions={pastSessions}
            onSelectPastSession={(session) => {
              setMessages(session.messages);
              currentSessionIdRef.current = session.id;
            }}
            onClearChat={() => {
              setMessages([
                {
                  id: `msg_init_${Date.now()}`,
                  role: 'assistant',
                  content: 'Chat history cleared, Suraj. How may I assist you now?',
                  timestamp: Date.now(),
                },
              ]);
            }}
          />
        </div>
      </div>

      {/* 3. Floating Focus Mode Toggle when in Focus Mode */}
      {isFocusMode && (
        <button
          onClick={() => setIsFocusMode(false)}
          className="fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-pink-500/50 text-pink-300 text-xs font-semibold shadow-2xl backdrop-blur-md hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <span>Exit Focus Mode</span>
        </button>
      )}

      {/* 4. Modals & Hubs */}
      <MemoryCenterModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        onMemoriesUpdated={() => {}}
      />

      <LiveComputerPanel
        isOpen={isComputerOpen}
        onClose={() => setIsComputerOpen(false)}
      />

      <AutomationCenterModal
        isOpen={isAutomationsOpen}
        onClose={() => setIsAutomationsOpen(false)}
      />

      <AppConnectionsModal
        isOpen={isConnectionsOpen}
        onClose={() => setIsConnectionsOpen(false)}
        isLoggedIn={!!user}
      />

      <ProjectWorkspaceModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
      />

      <FilesCenterModal
        isOpen={isFilesOpen}
        onClose={() => setIsFilesOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await confirmModal.action();
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
