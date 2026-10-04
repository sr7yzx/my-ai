export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'sending' | 'thinking' | 'executing' | 'verifying' | 'completed' | 'failed';
  planSteps?: {
    id: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    detail?: string;
  }[];
  toolCalls?: ToolExecution[];
  webSources?: {
    title: string;
    uri: string;
  }[];
  audioBase64?: string;
}

export interface ToolExecution {
  id: string;
  toolName: string;
  args: Record<string, any>;
  status: 'executing' | 'verifying' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'project' | 'decision' | 'goal' | 'workflow' | 'instruction' | 'biography';
  key: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  active: boolean;
  source?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  summary: string;
  messages: Message[];
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerType: 'scheduled' | 'interval' | 'condition' | 'manual';
  triggerConfig: {
    time?: string; // e.g. "09:00"
    intervalMinutes?: number;
    condition?: string;
  };
  actions: {
    id: string;
    type: 'check_gmail' | 'summarize' | 'calendar_agenda' | 'backup_project' | 'web_monitor' | 'custom_agent_task';
    description: string;
    params?: Record<string, any>;
  }[];
  status: 'active' | 'paused' | 'running' | 'failed';
  nextRun?: number;
  lastRun?: number;
  runHistory: {
    id: string;
    timestamp: number;
    status: 'success' | 'failed';
    logs: string[];
    verification: string;
  }[];
  errorState?: string;
}

export type LiveComputerStatus = 'LIVE' | 'THINKING' | 'ACTION' | 'WAITING' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export interface ComputerActionLog {
  id: string;
  timestamp: number;
  text: string;
  type: 'nav' | 'click' | 'type' | 'scroll' | 'inspect' | 'verify';
}

export interface LiveComputerState {
  status: LiveComputerStatus;
  currentUrl: string;
  actionLogs: ComputerActionLog[];
  isRunning: boolean;
  isPaused: boolean;
  screenshotUrl?: string;
  activeViewport: 'desktop' | 'tablet' | 'mobile';
  domTreeSummary?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isFolder?: boolean;
  isFavorite?: boolean;
  isTrash?: boolean;
  updatedAt: number;
  size: number;
}

export type ConnectionStatus = 'not_connected' | 'connecting' | 'connected' | 'needs_reconnect' | 'error';

export interface AppConnection {
  id: string;
  name: string;
  serviceType:
    | 'gmail'
    | 'calendar'
    | 'drive'
    | 'docs'
    | 'sheets'
    | 'slides'
    | 'tasks'
    | 'contacts'
    | 'github'
    | 'webhook'
    | 'weather';
  status: ConnectionStatus;
  lastSync?: number;
  permissions: string[];
  activityLogs: {
    id: string;
    timestamp: number;
    event: string;
    status: 'success' | 'error';
  }[];
  error?: string;
}

export type CharacterMood = 'neutral' | 'speaking' | 'listening' | 'thinking' | 'explaining' | 'greeting' | 'happy';

export type CharacterGesture =
  | 'idle'
  | 'greeting_wave'
  | 'namaste'
  | 'thinking_chin'
  | 'explaining_open'
  | 'pointing_left'
  | 'attentive_listen';

export interface SettingsState {
  appearance: {
    theme: 'dark' | 'midnight' | 'cyberpunk';
    accentColor: string;
    fontSize: 'normal' | 'large';
  };
  character: {
    name: string;
    outfit: 'tech_kimono' | 'cyber_suit' | 'casual_saree';
    voicePitch: number;
    blinkRate: 'normal' | 'frequent' | 'subtle';
    responsiveness: 'fast' | 'balanced' | 'relaxed';
  };
  voice: {
    enabled: boolean;
    autoSpeak: boolean;
    voiceName: string;
    rate: number;
    bargeInSensitivity: number;
  };
  memory: {
    enabled: boolean;
    autoExtract: boolean;
    maxInjectedMemories: number;
  };
  chat: {
    languagePreference: 'hinglish' | 'hindi' | 'english' | 'auto';
    preferredModel: 'flash' | 'pro' | 'lite';
    enableHighThinking: boolean;
  };
  notifications: boolean;
  security: {
    requireConfirmationForSend: boolean;
    requireConfirmationForDelete: boolean;
  };
}
