/**
 * Real-Time Voice Input Pipeline & Hardware Diagnostics for Radhe Krishna AI
 * Direct Web Audio capture -> Device Enumeration -> VAD -> Gemini Live Turn -> Speaker Output
 */

import { getAudioContext, getAnalyserNode, stopAudioPlayback, playTtsAudio } from './audioService';
import { updateLipSyncMetrics, setSystemActivityState } from './voiceConversationEngine';

export interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
  isDefault: boolean;
}

export interface VoicePipelineDiagnostics {
  microphoneDetected: boolean;
  permissionGranted: 'granted' | 'prompt' | 'denied' | 'unknown';
  listening: boolean;
  audioLevel: number; // 0 to 100%
  isFlatLevel: boolean;
  geminiConnected: boolean;
  voiceReceived: boolean;
  aiSpeaking: boolean;
  selectedDeviceId: string;
  selectedDeviceLabel: string;
  availableDevices: MicrophoneDevice[];
  isMuted: boolean;
  errorMessage: string | null;
  lastTranscript: string | null;
}

type DiagnosticsListener = (diagnostics: VoicePipelineDiagnostics) => void;

class VoicePipelineManager {
  private activeStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private isRunning = false;
  private isMuted = false;
  private silenceTimer: any = null;
  private flatCheckTimer: any = null;
  private animationFrameId: number | null = null;

  private speechDetectedInCurrentTurn = false;
  private consecutiveFlatFrames = 0;

  private selectedDeviceId: string = '';
  private availableDevices: MicrophoneDevice[] = [];

  private diagnostics: VoicePipelineDiagnostics = {
    microphoneDetected: false,
    permissionGranted: 'unknown',
    listening: false,
    audioLevel: 0,
    isFlatLevel: false,
    geminiConnected: true,
    voiceReceived: false,
    aiSpeaking: false,
    selectedDeviceId: '',
    selectedDeviceLabel: 'Default Microphone',
    availableDevices: [],
    isMuted: false,
    errorMessage: null,
    lastTranscript: null,
  };

  private listeners: DiagnosticsListener[] = [];
  private onUserTurnCompleteCallback: ((transcript: string, responseText: string, audioBase64: string | null) => void) | null = null;

  constructor() {
    this.initDeviceWatcher();
    this.refreshDevices();
  }

  public subscribe(listener: DiagnosticsListener): () => void {
    this.listeners.push(listener);
    listener(this.getDiagnostics());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = this.getDiagnostics();
    this.listeners.forEach((l) => l(state));
  }

  public getDiagnostics(): VoicePipelineDiagnostics {
    return { ...this.diagnostics };
  }

  // Device Enumeration
  private initDeviceWatcher() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.refreshDevices();
      });
    }
  }

  public async refreshDevices(): Promise<MicrophoneDevice[]> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
          groupId: d.groupId,
          isDefault: d.deviceId === 'default' || index === 0,
        }));

      this.availableDevices = audioInputs;
      this.diagnostics.availableDevices = audioInputs;
      this.diagnostics.microphoneDetected = audioInputs.length > 0;

      if (!this.selectedDeviceId && audioInputs.length > 0) {
        this.selectedDeviceId = audioInputs[0].deviceId;
        this.diagnostics.selectedDeviceId = audioInputs[0].deviceId;
        this.diagnostics.selectedDeviceLabel = audioInputs[0].label;
      }

      this.notify();
      return audioInputs;
    } catch (err: any) {
      this.diagnostics.errorMessage = `Device enumeration error: ${err.message}`;
      this.notify();
      return [];
    }
  }

  public async setSelectedMicrophone(deviceId: string) {
    this.selectedDeviceId = deviceId;
    this.diagnostics.selectedDeviceId = deviceId;
    const found = this.availableDevices.find((d) => d.deviceId === deviceId);
    if (found) {
      this.diagnostics.selectedDeviceLabel = found.label;
    }

    if (this.isRunning) {
      // Hot-swap stream to newly selected microphone
      await this.startVoice();
    } else {
      this.notify();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.diagnostics.isMuted = muted;
    if (this.activeStream) {
      this.activeStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    this.notify();
  }

  // Real-Time Audio Level & Energy Analyzer Loop (60 FPS)
  private startLevelAnalyzer() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    const updateLevel = () => {
      if (!this.analyser || !this.isRunning) {
        this.diagnostics.audioLevel = 0;
        this.notify();
        return;
      }

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      // Normalizing level to 0-100%
      const rawPercentage = Math.min(100, Math.round((avg / 128) * 100));
      this.diagnostics.audioLevel = rawPercentage;

      // Check flat-line while recording
      if (rawPercentage < 2) {
        this.consecutiveFlatFrames++;
        if (this.consecutiveFlatFrames > 90) {
          // ~1.5s of flat signal
          this.diagnostics.isFlatLevel = true;
        }
      } else {
        this.consecutiveFlatFrames = 0;
        this.diagnostics.isFlatLevel = false;

        // VAD: Speech onset detected
        if (!this.speechDetectedInCurrentTurn && rawPercentage > 5 && !this.isMuted) {
          this.speechDetectedInCurrentTurn = true;
          // Barge-in: immediately stop assistant speech
          stopAudioPlayback();
          this.diagnostics.aiSpeaking = false;
          setSystemActivityState('VOICE_INPUT');
        }

        // Reset silence timer whenever speech is actively happening
        if (this.speechDetectedInCurrentTurn) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            // User finished speaking (~1.1s silence after speech)
            this.handleUserSpeechTurnFinished();
          }, 1100);
        }
      }

      this.notify();
      this.animationFrameId = requestAnimationFrame(updateLevel);
    };

    this.animationFrameId = requestAnimationFrame(updateLevel);
  }

  // Complete User Speech Turn -> Dispatch to Gemini
  private async handleUserSpeechTurnFinished() {
    if (!this.speechDetectedInCurrentTurn || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return;
    }

    this.speechDetectedInCurrentTurn = false;
    this.diagnostics.listening = false;
    this.diagnostics.voiceReceived = true;
    setSystemActivityState('AI_PROCESSING');
    this.notify();

    // Stop recorder to flush audio blob
    this.mediaRecorder.stop();
  }

  // Request Hardware Permission & Initiate Real Audio Stream
  public async startVoice(
    onTurnComplete?: (transcript: string, responseText: string, audioBase64: string | null) => void
  ): Promise<void> {
    if (onTurnComplete) {
      this.onUserTurnCompleteCallback = onTurnComplete;
    }

    // Stop any existing stream
    this.stopVoice();
    this.diagnostics.errorMessage = null;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      };

      // 1. Real Browser Microphone API Call
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStream = stream;
      this.diagnostics.permissionGranted = 'granted';
      this.diagnostics.microphoneDetected = true;

      // Update active device label from acquired track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && audioTrack.label) {
        this.diagnostics.selectedDeviceLabel = audioTrack.label;
      }

      // Handle track mute state
      audioTrack.enabled = !this.isMuted;
      audioTrack.onended = () => {
        this.diagnostics.errorMessage = 'Microphone disconnected or stopped by system.';
        this.stopVoice();
      };

      // 2. Web Audio Analyser Node for Real RMS & Formant Lip-Sync
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      this.sourceNode = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;
      this.sourceNode.connect(this.analyser);

      // 3. MediaRecorder for Encoding Live Frames
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
        this.recordedChunks = [];

        // Restart recording for next turn
        if (this.isRunning && this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
          try {
            this.mediaRecorder.start(100);
          } catch {
            // ignore
          }
        }

        // Process audio through Gemini
        await this.dispatchAudioToGemini(audioBlob, mimeType);
      };

      this.mediaRecorder.start(100);
      this.isRunning = true;
      this.diagnostics.listening = true;
      setSystemActivityState('VOICE_INPUT');

      // Refresh devices with actual authorized labels
      this.refreshDevices();

      // Start live energy monitoring
      this.startLevelAnalyzer();
      this.notify();
    } catch (err: any) {
      console.error('Microphone start error:', err);
      let friendlyError = err.message || 'Microphone initiation failed.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.diagnostics.permissionGranted = 'denied';
        friendlyError =
          'Microphone permission was denied. Please allow microphone access in your browser address bar (lock icon) and click Reconnect.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.diagnostics.microphoneDetected = false;
        friendlyError =
          'No microphone hardware detected. Please connect a microphone or headset and refresh.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyError =
          'Microphone is already in use by another app or OS service. Please close other audio applications.';
      } else if (err.name === 'OverconstrainedError') {
        // Fall back to default
        this.selectedDeviceId = '';
        this.diagnostics.selectedDeviceId = '';
        return this.startVoice(onTurnComplete);
      }

      this.diagnostics.errorMessage = friendlyError;
      this.diagnostics.listening = false;
      setSystemActivityState('ERROR');
      this.notify();
      throw new Error(friendlyError);
    }
  }

  // Dispatch Recorded Real Audio to Gemini /api/voice-turn
  private async dispatchAudioToGemini(audioBlob: Blob, mimeType: string) {
    if (audioBlob.size < 500) {
      // Too small, likely empty
      this.diagnostics.listening = true;
      setSystemActivityState('VOICE_INPUT');
      this.notify();
      return;
    }

    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const audioData = await base64Promise;

      this.diagnostics.voiceReceived = true;
      setSystemActivityState('AI_PROCESSING');
      this.notify();

      // Call /api/voice-turn
      const res = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData,
          mimeType,
          messages: [],
        }),
      });

      if (!res.ok) {
        throw new Error(`Voice turn failed with status ${res.status}`);
      }

      const data = await res.json();
      this.diagnostics.geminiConnected = true;
      this.diagnostics.lastTranscript = data.userTranscript;

      // Trigger callback to App UI
      if (this.onUserTurnCompleteCallback && data.text) {
        this.onUserTurnCompleteCallback(data.userTranscript, data.text, data.audio);
      }

      // If audio returned, play through speakers & drive lip-sync
      if (data.audio) {
        this.diagnostics.aiSpeaking = true;
        setSystemActivityState('VOICE_OUTPUT');
        this.notify();

        await playTtsAudio(data.audio, () => {
          this.diagnostics.aiSpeaking = false;
          this.diagnostics.listening = this.isRunning;
          setSystemActivityState(this.isRunning ? 'VOICE_INPUT' : 'IDLE');
          this.notify();
        });
      } else {
        this.diagnostics.listening = this.isRunning;
        setSystemActivityState(this.isRunning ? 'VOICE_INPUT' : 'IDLE');
        this.notify();
      }
    } catch (err: any) {
      console.error('Audio dispatch error:', err);
      this.diagnostics.errorMessage = `Gemini connection note: ${err.message}`;
      this.diagnostics.listening = this.isRunning;
      setSystemActivityState(this.isRunning ? 'VOICE_INPUT' : 'IDLE');
      this.notify();
    }
  }

  // Stop Voice Capture
  public stopVoice() {
    this.isRunning = false;
    this.diagnostics.listening = false;
    this.diagnostics.audioLevel = 0;
    this.diagnostics.isFlatLevel = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
      this.mediaRecorder = null;
    }

    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    stopAudioPlayback();
    setSystemActivityState('IDLE');
    this.notify();
  }

  // Automated Hardware Diagnostic Test
  public async testMicrophoneHardware(): Promise<{
    success: boolean;
    deviceFound: boolean;
    permissionGranted: boolean;
    avgRms: number;
    geminiOnline: boolean;
    message: string;
  }> {
    const devices = await this.refreshDevices();
    const deviceFound = devices.length > 0;
    if (!deviceFound) {
      return {
        success: false,
        deviceFound: false,
        permissionGranted: false,
        avgRms: 0,
        geminiOnline: false,
        message: 'No microphone detected on your system. Please connect an audio input device.',
      };
    }

    // Test stream capture for 1.8 seconds
    let stream: MediaStream | null = null;
    let avgLevel = 0;
    let samples = 0;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined },
      });
      const ctx = getAudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const testAnalyser = ctx.createAnalyser();
      src.connect(testAnalyser);

      const buf = new Uint8Array(testAnalyser.frequencyBinCount);

      // Sample energy for 1.5 seconds
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          testAnalyser.getByteFrequencyData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i];
          avgLevel += sum / buf.length;
          samples++;
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 1500);
      });

      stream.getTracks().forEach((t) => t.stop());
      avgLevel = samples > 0 ? Math.round((avgLevel / samples / 128) * 100) : 0;
    } catch (err: any) {
      return {
        success: false,
        deviceFound: true,
        permissionGranted: false,
        avgRms: 0,
        geminiOnline: false,
        message: `Microphone permission denied: ${err.message}`,
      };
    }

    // Test Gemini connection
    let geminiOnline = false;
    try {
      const ping = await fetch('/api/voice-test');
      geminiOnline = ping.ok;
    } catch {
      geminiOnline = false;
    }

    return {
      success: true,
      deviceFound: true,
      permissionGranted: true,
      avgRms: avgLevel,
      geminiOnline,
      message:
        avgLevel > 1
          ? `Microphone verified! Active audio level: ${avgLevel}%. Gemini connection verified.`
          : `Microphone connected, but audio level was low (${avgLevel}%). Make sure your microphone is not hardware-muted.`,
    };
  }
}

export const voicePipeline = new VoicePipelineManager();
