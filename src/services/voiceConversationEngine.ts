/**
 * Voice Conversation & Formant Lip-Sync Engine for Radhe Krishna AI
 * Real microphone input -> Voice Activity Detection -> Gemini Brain -> 24kHz TTS audio -> Formant Viseme Lip-Sync -> Barge-In
 */

import { getAudioContext, getAnalyserNode, stopAudioPlayback, playTtsAudio } from './audioService';
import { geminiLiveEngine } from './geminiLiveVoiceEngine';

export type SystemActivityState =
  | 'IDLE'
  | 'VOICE_INPUT'
  | 'AI_PROCESSING'
  | 'VOICE_OUTPUT'
  | 'TOOL_ACTIVE'
  | 'ERROR';

export type VisemeType =
  | 'closed'
  | 'slight_open'
  | 'vowel_open'
  | 'wide_open'
  | 'rounded'
  | 'consonant_closed';

export interface LipSyncFrame {
  openRatio: number; // 0.0 (closed) to 1.0 (wide open)
  widthRatio: number; // 0.7 (pursed) to 1.3 (wide spread)
  roundRatio: number; // 0.0 (flat) to 1.0 (puckered/rounded)
  consonantPress: number; // 0.0 to 1.0 (lips pressed together)
  teethVisible: boolean;
  tongueElevation: number; // 0.0 to 1.0
  viseme: VisemeType;
  volume: number; // 0.0 to 1.0
  volumeDb: number;
}

// Current smoothed lip-sync frame (shared across components)
let currentLipSync: LipSyncFrame = {
  openRatio: 0,
  widthRatio: 1,
  roundRatio: 0,
  consonantPress: 0,
  teethVisible: false,
  tongueElevation: 0,
  viseme: 'closed',
  volume: 0,
  volumeDb: -100,
};

let currentActivityState: SystemActivityState = 'IDLE';
const stateListeners: ((state: SystemActivityState) => void)[] = [];
const lipSyncListeners: ((frame: LipSyncFrame) => void)[] = [];

// Speech recognition handle
let activeRecognition: any = null;
let micStream: MediaStream | null = null;
let micSourceNode: MediaStreamAudioSourceNode | null = null;
let micAnalyserNode: AnalyserNode | null = null;
let isVoiceConversationActive = false;
let vadSilenceTimer: any = null;
let lastVoiceDetectedTime = 0;
let accumulatedTranscript = '';

export function getSystemActivityState(): SystemActivityState {
  return currentActivityState;
}

export function setSystemActivityState(state: SystemActivityState): void {
  currentActivityState = state;
  stateListeners.forEach((l) => l(state));
}

export function subscribeSystemActivity(listener: (state: SystemActivityState) => void): () => void {
  stateListeners.push(listener);
  listener(currentActivityState);
  return () => {
    const idx = stateListeners.indexOf(listener);
    if (idx >= 0) stateListeners.splice(idx, 1);
  };
}

export function getLipSyncFrame(): LipSyncFrame {
  return currentLipSync;
}

export function subscribeLipSync(listener: (frame: LipSyncFrame) => void): () => void {
  lipSyncListeners.push(listener);
  listener(currentLipSync);
  return () => {
    const idx = lipSyncListeners.indexOf(listener);
    if (idx >= 0) lipSyncListeners.splice(idx, 1);
  };
}

// Continuous Formant & Acoustic Frequency Analyzer for True Phoneme Lip-Sync
export function updateLipSyncMetrics(isSpeaking: boolean): LipSyncFrame {
  if (!isSpeaking) {
    // When no voice is playing, mouth MUST remain naturally closed
    currentLipSync = {
      openRatio: 0,
      widthRatio: 1,
      roundRatio: 0,
      consonantPress: 0,
      teethVisible: false,
      tongueElevation: 0,
      viseme: 'closed',
      volume: 0,
      volumeDb: -100,
    };
    return currentLipSync;
  }

  const analyser = getAnalyserNode();
  if (!analyser) {
    return currentLipSync;
  }

  const bufferLength = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(freqData);

  // Overall amplitude
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += freqData[i];
  }
  const avg = sum / bufferLength;
  const rawVolume = Math.min(1, avg / 70);

  // Volume in decibels
  const volumeDb = rawVolume > 0.001 ? 20 * Math.log10(rawVolume) : -100;

  // If resting silence between words or pause
  if (rawVolume < 0.035) {
    // Smooth decay to closed
    currentLipSync.openRatio = Math.max(0, currentLipSync.openRatio * 0.55);
    currentLipSync.consonantPress = 0;
    currentLipSync.volume = 0;
    currentLipSync.volumeDb = -100;
    if (currentLipSync.openRatio < 0.05) {
      currentLipSync.openRatio = 0;
      currentLipSync.viseme = 'closed';
    }
    return currentLipSync;
  }

  // Band calculations for Formant Form
  // F1 (200 - 800 Hz): bin index approx 2 to 10 at 48kHz
  const f1Energy = freqData.slice(2, 10).reduce((a, b) => a + b, 0) / 8;
  // F2 (800 - 2400 Hz): bin index approx 10 to 28
  const f2Energy = freqData.slice(10, 28).reduce((a, b) => a + b, 0) / 18;
  // High Frequency (2400 - 6500 Hz): bin index 28 to 75 (dental fricatives /s/, /t/, /z/)
  const highEnergy = freqData.slice(28, 75).reduce((a, b) => a + b, 0) / 47;

  // Determine Viseme based on formant ratios
  let targetViseme: VisemeType = 'vowel_open';
  let targetOpen = 0;
  let targetWidth = 1.0;
  let targetRound = 0.0;
  let targetConsonantPress = 0.0;
  let teeth = false;
  let tongue = 0.2;

  // 1. High frequency dominant: Sibilants / dental fricatives (/s/, /sh/, /z/, /t/, /d/)
  if (highEnergy > f1Energy * 1.1 && highEnergy > 35) {
    targetViseme = 'slight_open';
    targetOpen = 0.2 + rawVolume * 0.15;
    targetWidth = 1.15;
    teeth = true;
    tongue = 0.7;
  }
  // 2. Low F2 relative to F1 + strong low band: Rounded vowels (/o/, /u/, /w/, /oo/)
  else if (f1Energy > 30 && f2Energy < f1Energy * 0.75) {
    targetViseme = 'rounded';
    targetOpen = 0.45 + rawVolume * 0.35;
    targetWidth = 0.72; // puckered narrow width
    targetRound = 0.85;
    teeth = false;
    tongue = 0.3;
  }
  // 3. High F1 + High F2: Wide open vowels (/a/, /æ/, /ai/)
  else if (f1Energy > 45 && rawVolume > 0.45) {
    targetViseme = 'wide_open';
    targetOpen = 0.7 + rawVolume * 0.3;
    targetWidth = 1.2;
    teeth = true;
    tongue = 0.4;
  }
  // 4. Moderate F1 & F2: Standard open vowel (/e/, /ʌ/, /ah/)
  else if (f1Energy > 25) {
    targetViseme = 'vowel_open';
    targetOpen = 0.4 + rawVolume * 0.35;
    targetWidth = 1.05;
    teeth = rawVolume > 0.5;
    tongue = 0.3;
  }
  // 5. Bilabial consonant / low volume drop after syllable (/m/, /b/, /p/)
  else if (rawVolume < 0.12 && f1Energy < 20) {
    targetViseme = 'consonant_closed';
    targetOpen = 0.03;
    targetWidth = 0.95;
    targetConsonantPress = 0.8;
  } else {
    targetViseme = 'slight_open';
    targetOpen = 0.25;
    targetWidth = 1.0;
  }

  // Smooth interpolation (spring-damper attack & decay)
  const attack = 0.38;
  const decay = 0.22;
  const openRate = targetOpen > currentLipSync.openRatio ? attack : decay;

  currentLipSync.openRatio += (targetOpen - currentLipSync.openRatio) * openRate;
  currentLipSync.widthRatio += (targetWidth - currentLipSync.widthRatio) * 0.25;
  currentLipSync.roundRatio += (targetRound - currentLipSync.roundRatio) * 0.25;
  currentLipSync.consonantPress += (targetConsonantPress - currentLipSync.consonantPress) * 0.3;
  currentLipSync.teethVisible = teeth;
  currentLipSync.tongueElevation = tongue;
  currentLipSync.viseme = targetViseme;
  currentLipSync.volume = rawVolume;
  currentLipSync.volumeDb = Math.round(volumeDb);

  lipSyncListeners.forEach((l) => l(currentLipSync));
  return currentLipSync;
}

// BARGE-IN INTERRUPTION PROTOCOL
// Immediately stop assistant speaking when user interrupts
export function triggerBargeIn(): void {
  stopAudioPlayback();
  currentLipSync = {
    openRatio: 0,
    widthRatio: 1,
    roundRatio: 0,
    consonantPress: 0,
    teethVisible: false,
    tongueElevation: 0,
    viseme: 'closed',
    volume: 0,
    volumeDb: -100,
  };
  setSystemActivityState('VOICE_INPUT');
}

// REAL MICROPHONE VOICE CONVERSATION MANAGER (Direct Gemini Live Engine)
export async function startContinuousVoiceConversation(
  onTranscriptReceived: (transcript: string) => void,
  onStateChanged?: (state: SystemActivityState) => void
): Promise<void> {
  setSystemActivityState('VOICE_INPUT');
  if (onStateChanged) onStateChanged('VOICE_INPUT');

  await geminiLiveEngine.startLiveSession((text, role) => {
    if (role === 'user' || role === 'assistant') {
      onTranscriptReceived(text);
    }
  });
}

export function stopContinuousVoiceConversation(): void {
  geminiLiveEngine.stopLiveSession();
  setSystemActivityState('IDLE');
}

// Speak Real Audio via Gemini TTS with Web Audio Lip-Sync and State Synchronization
export async function speakRealTtsResponse(
  text: string,
  voiceName = 'Kore',
  onStarted?: () => void,
  onCompleted?: () => void
): Promise<void> {
  // If user speaks or triggers barge-in, abort immediately
  stopAudioPlayback();
  setSystemActivityState('AI_PROCESSING');

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: voiceName || 'Kore',
      }),
    });

    if (!res.ok) {
      throw new Error(`TTS server responded with ${res.status}`);
    }

    const data = await res.json();
    if (!data.audio) {
      // Graceful browser speech synthesis fallback without throwing
      if ('speechSynthesis' in window) {
        const cleanText = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 300);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;

        const voices = window.speechSynthesis.getVoices();
        const femaleVoice =
          voices.find(
            (v) =>
              v.name.includes('Female') ||
              v.name.includes('Samantha') ||
              v.name.includes('Google UK English Female') ||
              v.lang.startsWith('hi')
          ) || voices[0];
        if (femaleVoice) utterance.voice = femaleVoice;

        utterance.onstart = () => {
          setSystemActivityState('VOICE_OUTPUT');
          if (onStarted) onStarted();
        };

        utterance.onend = () => {
          currentLipSync = {
            openRatio: 0,
            widthRatio: 1,
            roundRatio: 0,
            consonantPress: 0,
            teethVisible: false,
            tongueElevation: 0,
            viseme: 'closed',
            volume: 0,
            volumeDb: -100,
          };
          setSystemActivityState(isVoiceConversationActive ? 'VOICE_INPUT' : 'IDLE');
          if (onCompleted) onCompleted();
        };

        window.speechSynthesis.speak(utterance);
        return;
      } else {
        setSystemActivityState(isVoiceConversationActive ? 'VOICE_INPUT' : 'IDLE');
        if (onCompleted) onCompleted();
        return;
      }
    }

    setSystemActivityState('VOICE_OUTPUT');
    if (onStarted) onStarted();

    // Play through Web Audio API AnalyserNode -> device speakers
    await playTtsAudio(data.audio, () => {
      // Audio playback finished
      currentLipSync = {
        openRatio: 0,
        widthRatio: 1,
        roundRatio: 0,
        consonantPress: 0,
        teethVisible: false,
        tongueElevation: 0,
        viseme: 'closed',
        volume: 0,
        volumeDb: -100,
      };
      setSystemActivityState(isVoiceConversationActive ? 'VOICE_INPUT' : 'IDLE');
      if (onCompleted) onCompleted();
    });
  } catch (err: any) {
    console.warn('TTS streaming fallback notice:', err.message);
    // Graceful browser speech synthesis fallback if network latency occurs
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      // Select natural female voice
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice =
        voices.find((v) => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.lang.startsWith('hi')) ||
        voices[0];
      if (femaleVoice) utterance.voice = femaleVoice;

      utterance.onstart = () => {
        setSystemActivityState('VOICE_OUTPUT');
        if (onStarted) onStarted();
      };

      utterance.onend = () => {
        currentLipSync = {
          openRatio: 0,
          widthRatio: 1,
          roundRatio: 0,
          consonantPress: 0,
          teethVisible: false,
          tongueElevation: 0,
          viseme: 'closed',
          volume: 0,
          volumeDb: -100,
        };
        setSystemActivityState(isVoiceConversationActive ? 'VOICE_INPUT' : 'IDLE');
        if (onCompleted) onCompleted();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setSystemActivityState(isVoiceConversationActive ? 'VOICE_INPUT' : 'IDLE');
      if (onCompleted) onCompleted();
    }
  }
}
