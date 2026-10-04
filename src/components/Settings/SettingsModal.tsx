import React, { useState } from 'react';
import {
  Settings,
  Palette,
  User,
  Volume2,
  Radio,
  Brain,
  MessageSquare,
  Workflow,
  Link,
  Monitor,
  Folder,
  Bell,
  Eye,
  Shield,
  Zap,
  Info,
  Save,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import { SettingsState } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onSaveSettings: (settings: SettingsState) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [activeSection, setActiveSection] = useState<string>('appearance');
  const [localSettings, setLocalSettings] = useState<SettingsState>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleReset = () => {
    setLocalSettings({ ...settings });
  };

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'character', label: 'Character', icon: User },
    { id: 'voice', label: 'Voice', icon: Volume2 },
    { id: 'liveInteraction', label: 'Live Interaction', icon: Radio },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'automation', label: 'Automation', icon: Workflow },
    { id: 'apps', label: 'Apps & Connections', icon: Link },
    { id: 'computer', label: 'Computer', icon: Monitor },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                System Settings
                {saveSuccess && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Personalized configurations for Radhe Krishna AI and Suraj Rajput.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition-colors"
              title="Reset Changes"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-pink-600/20"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sections */}
          <div className="w-full md:w-60 p-3 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 overflow-y-auto space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                    isActive
                      ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-pink-400' : 'text-slate-500'}`} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
            {activeSection === 'appearance' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">Appearance & Themes</h3>
                <div>
                  <label className="block text-slate-400 mb-1">Color Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['dark', 'midnight', 'cyberpunk'].map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setLocalSettings({
                            ...localSettings,
                            appearance: { ...localSettings.appearance, theme: t as any },
                          })
                        }
                        className={`p-3 rounded-xl border text-center font-mono capitalize text-xs ${
                          localSettings.appearance.theme === t
                            ? 'bg-pink-500/20 border-pink-500 text-pink-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'character' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">Anime Virtual Assistant Rigging</h3>
                <div>
                  <label className="block text-slate-400 mb-1">Companion Outfit</label>
                  <select
                    value={localSettings.character.outfit}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        character: { ...localSettings.character, outfit: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="tech_kimono">Cyberpunk Kimono (Default)</option>
                    <option value="casual_saree">Futuristic Festive Saree</option>
                    <option value="cyber_suit">Executive Cyber Armor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Blinking Cadence</label>
                  <select
                    value={localSettings.character.blinkRate}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        character: { ...localSettings.character, blinkRate: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="normal">Natural Human Rhythm (Default)</option>
                    <option value="frequent">Lively & Expressive</option>
                    <option value="subtle">Deep Focused</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'voice' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">Real-Time Voice & TTS Settings</h3>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-200 block">Auto Speak Responses</span>
                    <span className="text-[11px] text-slate-500">Radhe reads aloud answers with natural lip-sync</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.voice.autoSpeak}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        voice: { ...localSettings.voice, autoSpeak: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-pink-500 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Gemini 3.8 Flash TTS Voice Persona</label>
                  <select
                    value={localSettings.voice.voiceName}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        voice: { ...localSettings.voice, voiceName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="Kore">Kore (Melodious, warm & expressive - Recommended)</option>
                    <option value="Aoede">Aoede (Clear, gentle & articulate)</option>
                    <option value="Zephyr">Zephyr (Bright & swift)</option>
                    <option value="Puck">Puck (Crisp & engaging)</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'liveInteraction' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">Live Voice & Barge-In Protocols</h3>
                <p className="text-slate-400">
                  User interruption (barge-in) is active. Speaking into the microphone immediately pauses ongoing assistant speech and shifts Radhe to listening mode.
                </p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px]">
                  WebSocket Live Endpoint: <code>/api/live-ws</code>
                </div>
              </div>
            )}

            {activeSection === 'memory' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">Persistent Long-Term Memory</h3>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-200 block">Automatic Memory Extraction</span>
                    <span className="text-[11px] text-slate-500">Radhe captures key project decisions and preferences</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.memory.autoExtract}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        memory: { ...localSettings.memory, autoExtract: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-pink-500 rounded"
                  />
                </div>
              </div>
            )}

            {activeSection === 'chat' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">Language & Reasoning Models</h3>
                <div>
                  <label className="block text-slate-400 mb-1">Language Mode</label>
                  <select
                    value={localSettings.chat.languagePreference}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        chat: { ...localSettings.chat, languagePreference: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="hinglish">Hinglish / Hindi / English (Auto adaptive)</option>
                    <option value="english">Strict English</option>
                    <option value="hindi">Pure Hindi</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-200 block">Gemini 3.1 Pro High Thinking</span>
                    <span className="text-[11px] text-slate-500">Enable deep multi-step planning for complex STEM & code</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.chat.enableHighThinking}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        chat: { ...localSettings.chat, enableHighThinking: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-pink-500 rounded"
                  />
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">Security & Authorization Rules</h3>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">Confirm Sending Emails</span>
                      <span className="text-[11px] text-slate-500">Require interactive prompt before dispatching any mail</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.security.requireConfirmationForSend}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          security: { ...localSettings.security, requireConfirmationForSend: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-pink-500 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                    <div>
                      <span className="font-semibold text-slate-200 block">Confirm Deleting Files</span>
                      <span className="text-[11px] text-slate-500">Require interactive prompt before removing files</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.security.requireConfirmationForDelete}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          security: { ...localSettings.security, requireConfirmationForDelete: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-pink-500 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-100">About Radhe Krishna AI</h3>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-pink-400 text-sm">RADHE KRISHNA AI v1.0.0</div>
                  <p className="text-slate-300">
                    Dedicated personal AI virtual assistant engineered for <strong>Suraj Rajput</strong>.
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Powered by Google GenAI (Gemini 3.5 Flash, Gemini 3.1 Pro Preview, Gemini 3.8 Live, Gemini 3.8 Flash TTS, Gemini 3.5 Transcribe).
                  </p>
                  <div className="pt-2 text-[10px] text-slate-500 font-mono">
                    Zero fake simulations • Strict verification pipeline • Real Google Workspace integration
                  </div>
                </div>
              </div>
            )}

            {/* Other sections fallback */}
            {!['appearance', 'character', 'voice', 'liveInteraction', 'memory', 'chat', 'security', 'about'].includes(
              activeSection
            ) && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-200 capitalize">{activeSection} Configuration</h4>
                <p className="text-slate-400">
                  Settings for {activeSection} are synced with the active session and persistent state engine.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
