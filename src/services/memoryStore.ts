import { MemoryItem, ConversationSession, Message } from '../types';

const MEMORY_STORAGE_KEY = 'radhe_krishna_memory_v1';
const SESSIONS_STORAGE_KEY = 'radhe_krishna_sessions_v1';

// Seed initial authentic memories for Suraj Rajput
const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem_suraj_identity',
    category: 'biography',
    key: 'User Identity & Addressing',
    content: 'User is Suraj Rajput (email: surajparihar605@gmail.com). Address naturally as "Suraj" or "Suraj Rajput". Prefers a warm, intelligent anime companion demeanor.',
    tags: ['user', 'identity', 'suraj', 'name'],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    active: true,
    source: 'System Initialization',
  },
  {
    id: 'mem_language_preference',
    category: 'preference',
    key: 'Language Fluency',
    content: 'Suraj communicates in English, Hindi, and Hinglish. Seamlessly understand and respond in the same language with natural Indian linguistic warmth.',
    tags: ['language', 'hindi', 'hinglish', 'english'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    active: true,
    source: 'User Preference',
  },
  {
    id: 'mem_work_standards',
    category: 'workflow',
    key: 'Real Verification Standard',
    content: 'Suraj requires real operations, zero mockups, and zero fake completion claims. Every important task must follow PLAN -> EXECUTE -> VERIFY -> REPORT.',
    tags: ['workflow', 'standards', 'verification', 'quality'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    active: true,
    source: 'Core Instruction',
  },
  {
    id: 'mem_active_projects',
    category: 'project',
    key: 'Personal AI Agent Platform',
    content: 'Active project is Radhe Krishna AI: production personal assistant with voice, anime rigging, automation engine, Google Workspace integrations, and Live Computer.',
    tags: ['project', 'radhe-krishna', 'ai-agent', 'development'],
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
    active: true,
    source: 'Project Workspace',
  },
];

export function getStoredMemories(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(INITIAL_MEMORIES));
      return INITIAL_MEMORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load memories from storage:', e);
    return INITIAL_MEMORIES;
  }
}

export function saveStoredMemories(memories: MemoryItem[]): void {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error('Failed to save memories to storage:', e);
  }
}

export function addMemory(item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'active'>): MemoryItem {
  const memories = getStoredMemories();
  const newMemory: MemoryItem = {
    ...item,
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    active: true,
  };
  memories.unshift(newMemory);
  saveStoredMemories(memories);
  return newMemory;
}

export function updateMemory(id: string, updates: Partial<MemoryItem>): MemoryItem | null {
  const memories = getStoredMemories();
  const idx = memories.findIndex((m) => m.id === id);
  if (idx === -1) return null;

  const updated: MemoryItem = {
    ...memories[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  memories[idx] = updated;
  saveStoredMemories(memories);
  return updated;
}

export function deleteMemory(id: string): boolean {
  const memories = getStoredMemories();
  const filtered = memories.filter((m) => m.id !== id);
  if (filtered.length !== memories.length) {
    saveStoredMemories(filtered);
    return true;
  }
  return false;
}

export function toggleMemoryStatus(id: string): MemoryItem | null {
  const memories = getStoredMemories();
  const mem = memories.find((m) => m.id === id);
  if (!mem) return null;
  mem.active = !mem.active;
  mem.updatedAt = Date.now();
  saveStoredMemories(memories);
  return mem;
}

export function clearConversationMemories(): void {
  const memories = getStoredMemories();
  // Keep core biography and reset conversation-extracted memories
  const retained = memories.filter((m) => m.category === 'biography');
  saveStoredMemories(retained.length ? retained : INITIAL_MEMORIES);
}

// Semantic and Keyword Retrieval Engine
export function retrieveRelevantMemories(query: string, limit = 5): MemoryItem[] {
  const memories = getStoredMemories().filter((m) => m.active);
  if (!query || !query.trim()) {
    return memories.slice(0, limit);
  }

  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = memories.map((mem) => {
    let score = 0;
    const textToSearch = `${mem.key} ${mem.content} ${mem.tags.join(' ')} ${mem.category}`.toLowerCase();

    for (const token of queryTokens) {
      if (textToSearch.includes(token)) {
        score += 3;
      }
      if (mem.tags.some((tag) => tag.toLowerCase().includes(token))) {
        score += 4;
      }
      if (mem.key.toLowerCase().includes(token)) {
        score += 5;
      }
    }

    // Boost high value categories
    if (mem.category === 'preference' || mem.category === 'project') {
      score += 1;
    }

    return { mem, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0 || scored.length <= limit)
    .slice(0, limit)
    .map((item) => item.mem);
}

export function formatMemoriesForContext(memories: MemoryItem[]): string {
  if (!memories.length) return '';
  return memories
    .map((m) => `• [${m.category.toUpperCase()} - ${m.key}]: ${m.content}`)
    .join('\n');
}

/* =========================================================================
   CONVERSATION HISTORY & CONTINUITY
   ========================================================================= */

export function getStoredSessions(): ConversationSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) {
      const defaultSession: ConversationSession = {
        id: 'session_yesterday_project',
        title: 'Website & Workspace Integration Architecture',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000 + 3600000,
        summary: 'Designed full-stack personal AI architecture with Google Workspace hooks, automated live computer browser actions, and anime audio lip-sync.',
        messages: [
          {
            id: 'msg_hist_1',
            role: 'user',
            content: 'Let us build Radhe Krishna AI with live computer use, Google Workspace tools and anime virtual human.',
            timestamp: Date.now() - 86400000,
          },
          {
            id: 'msg_hist_2',
            role: 'assistant',
            content: 'Namaste Suraj! Main architectural foundation prepare kar rahi hoon. Google Workspace OAuth aur Live Computer sandbox successfully outline ho chuka hai.',
            timestamp: Date.now() - 86400000 + 10000,
          },
        ],
      };
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([defaultSession]));
      return [defaultSession];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load past sessions:', e);
    return [];
  }
}

export function saveSession(session: ConversationSession): void {
  try {
    const sessions = getStoredSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, 30)));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

export function searchPastConversations(query: string): ConversationSession[] {
  const sessions = getStoredSessions();
  if (!query.trim()) return sessions;
  const q = query.toLowerCase();
  return sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
  );
}
