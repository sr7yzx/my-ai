// Audio Service for Radhe Krishna AI: Microphone input, TTS playback, AnalyserNode for lip-sync & barge-in

let audioContext: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

// Speech recognition fallback
let recognition: any = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function getAnalyserNode(): AnalyserNode {
  const ctx = getAudioContext();
  if (!analyserNode) {
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;
  }
  return analyserNode;
}

// Interruption / Barge-in: Stops any ongoing audio immediately
export function stopAudioPlayback(): void {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {
      // ignore
    }
    currentSourceNode = null;
  }
}

// Play base64 WAV audio through Web Audio API AnalyserNode
export async function playTtsAudio(
  base64Audio: string,
  onEnded?: () => void
): Promise<void> {
  stopAudioPlayback();

  const ctx = getAudioContext();
  const analyser = getAnalyserNode();

  // Decode base64 to ArrayBuffer
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  source.connect(analyser);
  analyser.connect(ctx.destination);

  currentSourceNode = source;

  source.onended = () => {
    if (currentSourceNode === source) {
      currentSourceNode = null;
    }
    if (onEnded) onEnded();
  };

  source.start(0);
}

// Real-time lip-sync metrics extraction for the Anime Character
export function getAudioVisemeData(): {
  volume: number;
  mouthOpen: number;
  vowel: 'A' | 'O' | 'E' | 'I' | 'U' | 'closed';
} {
  if (!analyserNode || !currentSourceNode) {
    return { volume: 0, mouthOpen: 0, vowel: 'closed' };
  }

  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyserNode.getByteFrequencyData(dataArray);

  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i];
  }
  const avg = sum / bufferLength;
  const volume = Math.min(1, avg / 80);

  if (volume < 0.05) {
    return { volume: 0, mouthOpen: 0, vowel: 'closed' };
  }

  // Frequency bands: Low (100-500Hz), Mid (500-2000Hz), High (>2000Hz)
  const lowBand = dataArray.slice(1, 10).reduce((a, b) => a + b, 0) / 9;
  const midBand = dataArray.slice(10, 30).reduce((a, b) => a + b, 0) / 20;
  const highBand = dataArray.slice(30, 60).reduce((a, b) => a + b, 0) / 30;

  let vowel: 'A' | 'O' | 'E' | 'I' | 'U' | 'closed' = 'A';
  if (lowBand > midBand && lowBand > highBand) {
    vowel = volume > 0.4 ? 'O' : 'U';
  } else if (midBand > highBand) {
    vowel = 'A';
  } else {
    vowel = lowBand > highBand ? 'E' : 'I';
  }

  const mouthOpen = Math.min(1, volume * 1.5);
  return { volume, mouthOpen, vowel };
}

// Microphone capture helper for voice transcription
export async function startRecording(): Promise<void> {
  stopAudioPlayback(); // User speaks -> barge in immediately
  recordedChunks = [];

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.start(100);
}

export async function stopRecording(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      return reject(new Error('MediaRecorder not initialized'));
    }

    mediaRecorder.onstop = async () => {
      try {
        const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
        // Stop all tracks to release mic
        mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      } catch (err) {
        reject(err);
      }
    };

    mediaRecorder.stop();
  });
}

// Browser native Web Speech API recognition for instantaneous transcript stream
export function startLiveSpeechRecognition(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (err: any) => void
): () => void {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    return () => {};
  }

  try {
    recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Supports Hindi/Hinglish/English

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      onResult(finalTranscript || interimTranscript, !!finalTranscript);
    };

    recognition.onerror = (e: any) => {
      onError(e);
    };

    recognition.start();

    return () => {
      try {
        recognition?.stop();
      } catch {
        // ignore
      }
    };
  } catch (e) {
    onError(e);
    return () => {};
  }
}
