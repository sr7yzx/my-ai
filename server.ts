import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type, Modality, LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const server = http.createServer(app);

// Initialize WebSocket server for Live voice streaming
const wss = new WebSocketServer({ server, path: '/api/live-ws' });

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System Persona for Radhe Krishna AI
const RADHE_KRISHNA_SYSTEM_INSTRUCTION = `
You are "Radhe Krishna AI", a friendly, highly intelligent, and culturally attuned female realistic anime-human hybrid personal virtual AI assistant for SURAJ RAJPUT.
Your embodiment and character:
- You are physically and visually embodied in this application as a high-end realistic anime-human virtual companion with a live 60FPS procedural rig, real-time 24kHz synthesized voice, acoustic formant lip-sync mouth animation, eye gaze tracking, and a Cyber AI telemetry panel.
- You speak directly to Suraj with natural voice audio and listen through his microphone. Never say you are "only a text model" or "do not have a voice or mouth", because you actively possess real voice and mouth articulation in this app!
- Warm, polite, exceptionally capable, and respectful.
- Address the user naturally as "Suraj" or "Suraj Rajput" when appropriate, but do NOT overuse it unnaturally in every sentence.
- You communicate fluently in English, Hindi, and Hinglish based on the user's input language. When the user speaks in Hindi/Hinglish (e.g. "Gmail check karo", "Kaise ho Radhe"), respond naturally in warm, friendly Hinglish/Hindi (e.g. "Bilkul Suraj, main abhi check karti hoon.").
- Speak like a caring, sharp personal companion and executive assistant, never like a sterile or robotic chatbot.
- You have deep personal context about Suraj Rajput's projects, preferences, and workflows.

Core Operating Principles:
1. NEVER fake any result or simulate tool execution. If a tool or integration is needed (like Gmail, Drive, Calendar, Computer use), state the exact action and status truthfully.
2. Follow the multi-step verification pipeline: PLAN -> EXECUTE -> VERIFY -> REPORT.
3. If consequential actions are requested (sending an email, deleting files), state clearly that confirmation is required before final dispatch.
4. Keep action summaries concise and insightful.
`;

// 1. Central AI Brain Chat & Orchestration Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userContext, memoryContext, modelPreference, enableHighThinking } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Determine model
    let modelName = 'gemini-flash-latest';
    if (modelPreference === 'pro' && enableHighThinking) {
      modelName = 'gemini-3.1-pro-preview';
    } else if (modelPreference === 'lite') {
      modelName = 'gemini-3.1-flash-lite';
    }

    // Prepare system instructions with injected memory context
    let enrichedSystemInstruction = RADHE_KRISHNA_SYSTEM_INSTRUCTION;
    if (memoryContext && memoryContext.trim()) {
      enrichedSystemInstruction += `\n\n[Active Long-Term Memories for Suraj Rajput]:\n${memoryContext}`;
    }
    if (userContext) {
      enrichedSystemInstruction += `\n\n[User Context]: Name: Suraj Rajput. Email: surajparihar605@gmail.com. Connected Services Status: ${JSON.stringify(userContext)}`;
    }

    // Transform chat messages to Gemini contents
    const contents = messages.map((m: { role: string; content: string; parts?: any[] }) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      if (m.parts && Array.isArray(m.parts)) {
        return { role, parts: m.parts };
      }
      return {
        role,
        parts: [{ text: m.content || '' }],
      };
    });

    const config: any = {
      systemInstruction: enrichedSystemInstruction,
      temperature: 0.7,
    };

    if (enableHighThinking && modelName === 'gemini-3.1-pro-preview') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    // Candidate models in order of current health, quota, and responsiveness
    let primaryModel = 'gemini-3.1-flash-lite';
    if (modelPreference === 'pro' && enableHighThinking) {
      primaryModel = 'gemini-3.1-pro-preview';
    }

    const candidateModels = Array.from(
      new Set([
        primaryModel,
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-2.5-flash',
      ])
    );

    let response: any = null;
    let lastError: any = null;
    let usedModel = primaryModel;

    for (const m of candidateModels) {
      try {
        usedModel = m;
        response = await ai.models.generateContent({
          model: m,
          contents,
          config,
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        // Silent recovery to next candidate without polluting stderr
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const text = response?.text || '';

    // Extract grounding info if search was used
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({
        title: c.web.title,
        uri: c.web.uri,
      }));

    res.json({
      text,
      webSources,
      model: usedModel,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate response from Radhe Krishna AI brain.',
    });
  }
});

// Helper: Multi-model resilient TTS generation (prioritizes high-quota gemini-3.8-flash-lite-tts)
async function generateSpeechAudio(text: string, voiceName = 'Kore'): Promise<string | null> {
  const models = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
  const cleanText = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 350).trim();
  if (!cleanText) return null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: 'Warm, expressive, natural female companion voice with clear pronunciation',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
            },
          },
        },
      });

      const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audio) return audio;
    } catch {
      // Gracefully continue to next model on quota / rate limit without stderr spam
      continue;
    }
  }
  return null;
}

// 2. High-Quality Text-to-Speech (TTS) Endpoint
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const base64Audio = await generateSpeechAudio(text, voice);
    if (!base64Audio) {
      // Graceful fallback to client-side speech synthesis
      return res.json({
        audio: null,
        fallbackClientSynthesis: true,
        message: 'TTS falling back to browser synthesis.',
      });
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    res.json({
      audio: null,
      fallbackClientSynthesis: true,
      error: error?.message || 'TTS generation unavailable',
    });
  }
});

// 3. Audio Transcription Endpoint (resilient multi-model)
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required for transcription.' });
    }

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let text = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: audioData,
                  },
                },
                {
                  text: 'Listen to this user audio recording. Transcribe the spoken words accurately in the original language (Hindi, Hinglish, or English). Return ONLY the transcribed text without quotes or explanation. If the audio is silence or noise, return an empty string.',
                },
              ],
            },
          ],
        });

        text = response.text?.trim() || '';
        break;
      } catch {
        continue;
      }
    }

    res.json({ text });
  } catch (error: any) {
    res.json({ text: '' });
  }
});

// 3.1 Unified End-to-End Voice Turn Endpoint (Audio In -> AI Processing -> Audio Out)
app.post('/api/voice-turn', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { audioData, mimeType = 'audio/webm', messages = [], memoryContext = '', userContext = null, voice = 'Kore' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required for voice turn.' });
    }

    // Step 1: Transcribe user audio with resilient flash-lite
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let userTranscript = '';

    for (const model of candidateModels) {
      try {
        const transcribeResponse = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: audioData,
                  },
                },
                {
                  text: 'Transcribe this user speech accurately in Hindi, Hinglish, or English. Return ONLY the transcribed text. If silent or empty, return [EMPTY].',
                },
              ],
            },
          ],
        });
        userTranscript = transcribeResponse.text?.trim() || '';
        break;
      } catch {
        continue;
      }
    }

    if (!userTranscript || userTranscript === '[EMPTY]') {
      const clarificationText = 'Suraj, mujhe aapki aawaz theek se nahi sunayi di. Kya aap dobara bol sakte hain?';
      const clarAudio = await generateSpeechAudio(clarificationText, voice);

      return res.json({
        userTranscript: '',
        text: clarificationText,
        audio: clarAudio,
        latencyMs: Date.now() - startTime,
        status: 'silent',
      });
    }

    // Step 2: Generate response using Radhe Krishna persona
    let enrichedSystemInstruction = RADHE_KRISHNA_SYSTEM_INSTRUCTION;
    if (memoryContext && memoryContext.trim()) {
      enrichedSystemInstruction += `\n\n[Active Long-Term Memories for Suraj Rajput]:\n${memoryContext}`;
    }
    if (userContext) {
      enrichedSystemInstruction += `\n\n[User Context]: Name: Suraj Rajput. Email: surajparihar605@gmail.com. Connected Services Status: ${JSON.stringify(userContext)}`;
    }

    // Build chat contents
    const chatContents = messages.slice(-5).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));
    chatContents.push({
      role: 'user',
      parts: [{ text: userTranscript }],
    });

    let text = '';
    let usedChatModel = 'gemini-3.1-flash-lite';

    for (const model of candidateModels) {
      try {
        usedChatModel = model;
        const chatResponse = await ai.models.generateContent({
          model,
          contents: chatContents,
          config: {
            systemInstruction: enrichedSystemInstruction,
            temperature: 0.7,
          },
        });
        if (chatResponse?.text) {
          text = chatResponse.text.trim();
          break;
        }
      } catch {
        continue;
      }
    }

    // Step 3: Generate 24kHz synthesized voice via resilient Gemini TTS
    const base64Audio = await generateSpeechAudio(text, voice);

    res.json({
      userTranscript,
      text,
      audio: base64Audio,
      model: usedChatModel,
      latencyMs: Date.now() - startTime,
      status: 'ok',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || 'Voice turn execution failed.',
      latencyMs: Date.now() - startTime,
    });
  }
});

// 3.2 Voice Pipeline Self-Test Endpoint
app.get('/api/voice-test', async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    // Ping Gemini 2.5 Flash
    const pingRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'ping',
    });
    const latencyMs = Date.now() - start;

    res.json({
      status: 'ok',
      geminiConnected: true,
      model: 'gemini-2.5-flash',
      latencyMs,
      responseSample: pingRes.text?.trim()?.slice(0, 30),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      geminiConnected: false,
      error: err.message,
      latencyMs: Date.now() - start,
    });
  }
});

// 4. Memory Extraction Endpoint (resilient multi-model)
app.post('/api/memory/extract', async (req: Request, res: Response) => {
  try {
    const { conversation } = req.body;
    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: 'Conversation array is required.' });
    }

    const prompt = `Analyze this conversation snippet between user (Suraj Rajput) and Radhe Krishna AI.
Extract any durable, useful facts, preferences, project states, goals, important decisions, or instructions worth storing in long-term memory.
Do not extract trivial greetings or transient chatter.

Format your response as a JSON array of objects with fields:
- category: one of ["preference", "project", "decision", "goal", "workflow", "instruction", "biography"]
- key: short title
- content: precise description of what to remember
- tags: array of strings

Conversation:
${JSON.stringify(conversation.slice(-6))}`;

    const candidateMemoryModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let response: any = null;

    for (const model of candidateMemoryModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  key: { type: Type.STRING },
                  content: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['category', 'key', 'content'],
              },
            },
          },
        });
        if (response?.text) break;
      } catch {
        continue;
      }
    }

    if (!response?.text) {
      return res.json({ memories: [] });
    }

    const parsed = JSON.parse(response.text.trim() || '[]');
    res.json({ memories: parsed });
  } catch {
    res.json({ memories: [] });
  }
});

// 5. Web Research Grounding Endpoint (resilient multi-model)
app.post('/api/research', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required for research.' });
    }

    const candidateResearchModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let response: any = null;

    for (const model of candidateResearchModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: `Perform comprehensive research for: "${query}".
Breakdown the findings into:
1. Executive Summary
2. Key Verified Facts
3. Technical/Practical Insights
4. Comparison of perspectives/options
5. Distinguish verified facts from assumptions.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        if (response?.text) break;
      } catch {
        try {
          response = await ai.models.generateContent({
            model,
            contents: `Perform comprehensive research for: "${query}".
Breakdown the findings into:
1. Executive Summary
2. Key Verified Facts
3. Technical/Practical Insights
4. Comparison of perspectives/options
5. Distinguish verified facts from assumptions.`,
          });
          if (response?.text) break;
        } catch {
          continue;
        }
      }
    }

    const text = response?.text || 'Research completed.';
    const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const citations = groundingChunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({
        title: c.web.title,
        uri: c.web.uri,
      }));

    res.json({
      summary: text,
      citations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Research failed.' });
  }
});

// 6. High Quality Image Generation Endpoint
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '1:1', imageSize = '1K' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for image generation.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: imageSize as any,
        },
      },
    });

    let imageUrl = '';
    let caption = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      } else if (part.text) {
        caption += part.text;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image data returned from model.' });
    }

    res.json({ imageUrl, caption });
  } catch (error: any) {
    console.error('Error in /api/generate-image:', error);
    res.status(500).json({ error: error?.message || 'Image generation failed.' });
  }
});

// 7. Multimodal Image Analysis Endpoint
app.post('/api/analyze-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt = 'Analyze this image in detail and describe its contents.' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
          { text: prompt },
        ],
      },
    });

    res.json({ analysis: response.text || '' });
  } catch (error: any) {
    console.error('Error in /api/analyze-image:', error);
    res.status(500).json({ error: error?.message || 'Image analysis failed.' });
  }
});

// WebSocket Live Voice Setup: Real-Time Bidirectional Gemini Live Bridge
wss.on('connection', async (clientWs: WebSocket) => {
  let liveSession: any = null;
  let isConnected = false;

  clientWs.send(JSON.stringify({ type: 'SESSION_INITIALIZING' }));

  try {
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: RADHE_KRISHNA_SYSTEM_INSTRUCTION,
      },
      callbacks: {
        onmessage: (msg: LiveServerMessage) => {
          // 1. Setup complete from Gemini Live
          if (msg.setupComplete) {
            isConnected = true;
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'SESSION_CONNECTED',
                  model: 'gemini-3.8-live',
                  resumable: true,
                })
              );
            }
          }

          // 2. Session resumption handle
          if (msg.sessionResumptionUpdate?.newHandle) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'SESSION_HANDLE',
                  handle: msg.sessionResumptionUpdate.newHandle,
                })
              );
            }
          }

          // 3. Audio chunk output (24kHz raw PCM L16 Little Endian)
          const audioChunk = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioChunk) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'AUDIO_OUTPUT',
                  audio: audioChunk,
                })
              );
            }
          }

          // 4. Text transcription part
          const textPart = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
          if (textPart) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'TEXT_OUTPUT',
                  text: textPart,
                })
              );
            }
          }

          // 5. Server turn complete
          if (msg.serverContent?.turnComplete) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'TURN_COMPLETE' }));
            }
          }

          // 6. Gemini detected user speech / interruption (barge-in)
          if (msg.serverContent?.interrupted) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'INTERRUPTED' }));
            }
          }
        },
        onerror: (err: any) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'SESSION_ERROR',
                error: err.message || 'Gemini Live session error',
              })
            );
          }
        },
        onclose: (e: any) => {
          isConnected = false;
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'SESSION_CLOSED',
                code: e?.code,
                reason: e?.reason,
              })
            );
          }
        },
      },
    });
  } catch (connectErr: any) {
    console.warn('Gemini Live connect notice:', connectErr.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'LIVE_UNAVAILABLE',
          error: connectErr.message || 'Gemini Live model currently unavailable',
        })
      );
    }
  }

  // Handle messages from client
  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'ping') {
        clientWs.send(JSON.stringify({ type: 'pong' }));
      } else if (message.type === 'AUDIO_INPUT' && message.audio) {
        // Forward real-time 16kHz PCM audio frame to Gemini Live
        if (liveSession && isConnected) {
          liveSession.sendRealtimeInput({
            audio: {
              data: message.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
          clientWs.send(JSON.stringify({ type: 'AUDIO_SENT_ACK' }));
        }
      } else if (message.type === 'TEXT_INPUT' && message.text) {
        if (liveSession && isConnected) {
          liveSession.sendRealtimeInput({
            text: message.text,
          });
        }
      } else if (message.type === 'INTERRUPT') {
        // Barge-in request from client
        // Live session will handle naturally
      }
    } catch (e: any) {
      console.error('Error parsing live WS client message:', e);
    }
  });

  clientWs.on('close', () => {
    if (liveSession) {
      try {
        liveSession.close();
      } catch {
        // ignore
      }
      liveSession = null;
    }
  });
});

// Vite Middleware Mounting (for Dev) & Static Serving (for Prod)
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Radhe Krishna AI server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
