import React, { useEffect, useRef, useState } from 'react';
import { CharacterMood, CharacterGesture } from '../../types';
import {
  LipSyncFrame,
  subscribeLipSync,
  updateLipSyncMetrics,
} from '../../services/voiceConversationEngine';
import { geminiLiveEngine, VisemeState } from '../../services/geminiLiveVoiceEngine';

interface AnimeCharacterProps {
  mood: CharacterMood;
  gesture: CharacterGesture;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
  onClick?: () => void;
}

export const AnimeCharacter: React.FC<AnimeCharacterProps> = ({
  mood,
  gesture,
  isSpeaking,
  isListening,
  isThinking,
  size = 'md',
  className = '',
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [blinkState, setBlinkState] = useState(0); // 0 (open) to 1 (closed)
  const [breathPhase, setBreathPhase] = useState(0);
  const [headTilt, setHeadTilt] = useState(0);
  const [nodPhase, setNodPhase] = useState(0);

  const [lipSync, setLipSync] = useState<LipSyncFrame>({
    openRatio: 0,
    widthRatio: 1,
    roundRatio: 0,
    consonantPress: 0,
    teethVisible: false,
    tongueElevation: 0,
    viseme: 'closed',
    volume: 0,
    volumeDb: -100,
  });

  // Authoritative Gemini Live audio diagnostics
  const [liveDiag, setLiveDiag] = useState(geminiLiveEngine.getDiagnostics());

  useEffect(() => {
    const unsub = geminiLiveEngine.subscribe((d) => {
      setLiveDiag(d);
    });
    return unsub;
  }, []);

  // Track user mouse for natural gaze tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.35; // Eye height
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      setMousePos({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Subscribe to real lip-sync metrics
  useEffect(() => {
    const unsub = subscribeLipSync((frame) => {
      setLipSync(frame);
    });
    return unsub;
  }, []);

  // 60 FPS Physics & Animation Loop
  useEffect(() => {
    let animId: number;
    let nextBlinkTime = Date.now() + 2500 + Math.random() * 3000;
    let isBlinking = false;
    let blinkStartTime = 0;

    const tick = () => {
      const now = Date.now();

      // 1. Natural Breathing (gentle sinusoidal ribcage & collar movement)
      setBreathPhase(Math.sin(now / 950) * 2.2);

      // 2. Head Tilt & Attentive Nodding
      if (isListening) {
        // Attentive subtle nodding to user's voice
        setNodPhase(Math.sin(now / 450) * 2.5);
        setHeadTilt(2.5);
      } else if (isThinking) {
        // Thinking posture: head slightly tilted up and to the right
        setHeadTilt(-4.5);
        setNodPhase(Math.sin(now / 1300) * 1.2);
      } else if (isSpeaking) {
        // Expressive conversational rhythm
        setHeadTilt(Math.sin(now / 700) * 2.0);
        setNodPhase(Math.cos(now / 400) * 1.8);
      } else {
        // Resting posture
        setHeadTilt(Math.sin(now / 2200) * 1.2);
        setNodPhase(0);
      }

      // 3. Natural Human Blinking (with micro-blinks)
      if (!isBlinking && now > nextBlinkTime) {
        isBlinking = true;
        blinkStartTime = now;
        nextBlinkTime = now + 2800 + Math.random() * 4500;
      }

      if (isBlinking) {
        const elapsed = now - blinkStartTime;
        if (elapsed < 150) {
          const progress = elapsed / 150;
          const val = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
          setBlinkState(val);
        } else {
          isBlinking = false;
          setBlinkState(0);
        }
      }

      // 4. Update Formant-driven Lip-Sync Metrics
      updateLipSyncMetrics(isSpeaking);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isSpeaking, isListening, isThinking]);

  // Dimension classes
  const sizeClasses = {
    sm: 'w-48 h-64',
    md: 'w-72 h-[410px]',
    lg: 'w-96 h-[500px]',
    fullscreen: 'w-full h-full max-h-[720px]',
  }[size];

  // Gaze offset
  const eyeGazeX = isThinking ? 3.5 : mousePos.x * 4.5;
  const eyeGazeY = isThinking ? -3.0 : mousePos.y * 3.2;

  // Eyebrow dynamics based on state
  let browL_Y = 0;
  let browR_Y = 0;
  let browRot = 0;
  if (isThinking) {
    browL_Y = -3.5;
    browR_Y = -1.5;
    browRot = -4;
  } else if (mood === 'happy' || mood === 'greeting') {
    browL_Y = -2;
    browR_Y = -2;
    browRot = 2;
  } else if (isListening) {
    browL_Y = -1.5;
    browR_Y = -1.5;
    browRot = 1;
  }

  // =========================================================================
  // HIGH-END REALISTIC ANIME-HUMAN MOUTH RENDERING
  // Driven by the authoritative AI speech output audio stream
  // Stable Viseme States: closed, slight_open, A/E, I, O/U, wide_open, rounded, consonant_closed
  // =========================================================================
  const renderRealisticMouth = () => {
    const isCurrentlySpeaking = isSpeaking || liveDiag.aiSpeaking;
    const activeViseme = isCurrentlySpeaking
      ? (liveDiag.aiSpeaking ? liveDiag.currentViseme : lipSync.viseme)
      : 'closed';
    const effectiveOpenRatio = isCurrentlySpeaking
      ? (liveDiag.aiSpeaking ? liveDiag.mouthOpenRatio : lipSync.openRatio)
      : 0;

    // 1. STRICTLY CLOSED STATE: When AI is silent, mouth immediately returns to closed idle state
    if (!isCurrentlySpeaking || effectiveOpenRatio <= 0.04 || activeViseme === 'closed') {
      return (
        <g id="realistic-mouth-closed">
          {/* Subtle upper lip vermilion shadow */}
          <path
            d="M 90 148 Q 95 146 100 147.2 Q 105 146 110 148"
            fill="none"
            stroke="#b91c1c"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
          {/* Main lip line with gentle natural cupid's bow and soft corner commissures */}
          <path
            d="M 88.5 149 C 94 148.2, 97.5 149.3, 100 148.8 C 102.5 149.3, 106 148.2, 111.5 149"
            fill="none"
            stroke="#9f1239"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          {/* Lower lip soft volume highlight & shadow */}
          <path
            d="M 94 150.5 Q 100 153.2 106 150.5"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
          {/* Lower lip soft ambient shadow beneath */}
          <path
            d="M 96 154.5 Q 100 156 104 154.5"
            fill="none"
            stroke="#881337"
            strokeWidth="1.2"
            strokeOpacity="0.35"
          />
          {/* Gloss specular catchlight */}
          <ellipse cx="99" cy="151.2" rx="2.5" ry="0.8" fill="#ffffff" opacity="0.65" />
        </g>
      );
    }

    // 2. CONSONANT CLOSED STATE: Lips pressed together (/m/, /b/, /p/)
    if (activeViseme === 'consonant_closed') {
      return (
        <g id="realistic-mouth-consonant">
          <path
            d="M 87 149 Q 100 148 113 149"
            fill="none"
            stroke="#881337"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M 92 151 Q 100 153 108 151"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
        </g>
      );
    }

    // 3. I STATE: Spread front vowel lips with narrow vertical aperture and visible teeth (/i/, /ee/)
    if (activeViseme === 'I') {
      const halfW = 12.5;
      const openH = Math.max(3.0, effectiveOpenRatio * 6.5);
      return (
        <g id="realistic-mouth-i">
          <ellipse cx="100" cy="149" rx={halfW} ry={openH} fill="#4c0519" />
          {/* Upper and lower teeth rows visible */}
          <path
            d={`M 90 148.5 Q 100 147.5 110 148.5 L 109 149.8 Q 100 148.8 91 149.8 Z`}
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="0.4"
          />
          <path
            d={`M 87 148.5 Q 100 147.5 113 148.5`}
            fill="none"
            stroke="#9f1239"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d={`M 88 150.5 Q 100 151.8 112 150.5`}
            fill="none"
            stroke="#e11d48"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
        </g>
      );
    }

    // 4. ROUNDED / O/U STATE: Puckered lips for /o/, /u/, /w/
    if (activeViseme === 'rounded' || activeViseme === 'O/U') {
      const radiusX = Math.max(3.8, 6.2);
      const radiusY = Math.max(3.8, 7.5 * effectiveOpenRatio);
      return (
        <g id="realistic-mouth-rounded">
          {/* Oral Cavity Depth */}
          <ellipse cx="100" cy="149" rx={radiusX} ry={radiusY} fill="#4c0519" />
          <ellipse cx="100" cy="148" rx={radiusX * 0.7} ry={radiusY * 0.5} fill="#1f0208" />
          {/* Upper Rounded Lip Rim */}
          <path
            d={`M ${100 - radiusX - 2} 147 Q 100 ${147 - radiusY * 0.4} ${100 + radiusX + 2} 147`}
            fill="none"
            stroke="#be123c"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Lower Rounded Lip Rim */}
          <path
            d={`M ${100 - radiusX - 1} 150 Q 100 ${150 + radiusY * 0.7} ${100 + radiusX + 1} 150`}
            fill="none"
            stroke="#e11d48"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      );
    }

    // 5. SLIGHT OPEN STATE: Dental fricatives and sibilants (/s/, /z/, /t/, /d/)
    if (activeViseme === 'slight_open') {
      const halfW = 9.5;
      const openH = Math.max(3.2, effectiveOpenRatio * 6.0);
      return (
        <g id="realistic-mouth-slight">
          <ellipse cx="100" cy="149" rx={halfW} ry={openH} fill="#4c0519" />
          {/* Upper teeth row visible */}
          <path
            d="M 92 148 Q 100 147 108 148 L 107.5 149.8 Q 100 148.8 92.5 149.8 Z"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="0.4"
          />
          <path
            d="M 89 148 Q 100 147 111 148"
            fill="none"
            stroke="#9f1239"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 90 150.5 Q 100 152 110 150.5"
            fill="none"
            stroke="#e11d48"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      );
    }

    // 6. WIDE OPEN STATE & A/E VOWEL STATE (/a/, /e/, /æ/, /ai/)
    const halfWidth = activeViseme === 'wide_open' ? 12.0 : 10.5;
    const openH = Math.max(4.0, effectiveOpenRatio * (activeViseme === 'wide_open' ? 16.5 : 13.5));
    const topY = 148 - openH * 0.35;
    const botY = 148 + openH * 0.65;

    return (
      <g id="realistic-mouth-open">
        {/* Oral Cavity Dark Interior */}
        <path
          d={`M ${100 - halfWidth} ${topY}
              C ${100 - halfWidth * 0.5} ${topY - 2}, ${100 + halfWidth * 0.5} ${topY - 2}, ${100 + halfWidth} ${topY}
              C ${100 + halfWidth + 1} ${botY}, ${100 - halfWidth - 1} ${botY}, ${100 - halfWidth} ${topY} Z`}
          fill="#4c0519"
        />

        {/* Upper Teeth Row */}
        {openH > 4.5 && (
          <path
            d={`M ${100 - halfWidth * 0.65} ${topY + 1.2}
                Q 100 ${topY + 3.2} ${100 + halfWidth * 0.65} ${topY + 1.2}
                L ${100 + halfWidth * 0.6} ${topY + 3.8}
                Q 100 ${topY + 4.8} ${100 - halfWidth * 0.6} ${topY + 3.8} Z`}
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="0.4"
          />
        )}

        {/* Soft Tongue Bed */}
        {openH > 7 && (
          <ellipse
            cx="100"
            cy={botY - 1.5}
            rx={halfWidth * 0.55}
            ry={openH * 0.28}
            fill="#fb7185"
            opacity="0.85"
          />
        )}

        {/* Upper Lip Vermilion Arch */}
        <path
          d={`M ${100 - halfWidth - 2} ${topY}
              Q ${100 - halfWidth * 0.4} ${topY - 2.5} 100 ${topY - 1.2}
              Q ${100 + halfWidth * 0.4} ${topY - 2.5} ${100 + halfWidth + 2} ${topY}`}
          fill="none"
          stroke="#9f1239"
          strokeWidth="2.0"
          strokeLinecap="round"
        />

        {/* Lower Lip Contour */}
        <path
          d={`M ${100 - halfWidth} ${botY - 0.5}
              Q 100 ${botY + 2.5} ${100 + halfWidth} ${botY - 0.5}`}
          fill="none"
          stroke="#e11d48"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Gloss catch on lower lip */}
        <ellipse
          cx="100"
          cy={botY + 1.2}
          rx={halfWidth * 0.35}
          ry="0.9"
          fill="#ffffff"
          opacity="0.55"
        />
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative select-none flex items-center justify-center ${sizeClasses} ${className}`}
    >
      {/* Dynamic Ambient Cyber Aura Backlight */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
          isSpeaking
            ? 'bg-gradient-to-tr from-pink-500/30 via-purple-500/25 to-cyan-400/30 opacity-90 scale-105'
            : isListening
            ? 'bg-gradient-to-tr from-cyan-500/25 via-emerald-500/20 to-blue-500/25 opacity-85'
            : isThinking
            ? 'bg-gradient-to-tr from-purple-500/25 via-indigo-500/25 to-pink-500/20 opacity-80'
            : 'bg-gradient-to-tr from-indigo-500/15 to-pink-500/15 opacity-50'
        }`}
      />

      {/* SVG Canvas Anatomy: High-End Realistic Anime-Human Hybrid Girl */}
      <svg
        viewBox="0 0 200 270"
        className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] overflow-visible"
        style={{
          transform: `translateY(${breathPhase}px) rotate(${headTilt}deg)`,
          transformOrigin: '100px 230px',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <defs>
          {/* Realistic Skin Sub-Surface Scattering & Shading */}
          <radialGradient id="realSkinGlow" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#fff5f5" />
            <stop offset="65%" stopColor="#fee2e2" />
            <stop offset="88%" stopColor="#fecdd3" />
            <stop offset="100%" stopColor="#fda4af" />
          </radialGradient>

          <linearGradient id="skinShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fecdd3" stopOpacity="0" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.22" />
          </linearGradient>

          {/* Realistic Anime Hair: Deep Midnight Indigo with Subtle Violet-Pink Sheen */}
          <linearGradient id="realHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="35%" stopColor="#1e1b4b" />
            <stop offset="70%" stopColor="#2e1065" />
            <stop offset="100%" stopColor="#831843" />
          </linearGradient>

          {/* Anisotropic Hair Sheen Ribbon */}
          <linearGradient id="anisotropicSheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0" />
            <stop offset="50%" stopColor="#f472b6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>

          {/* Realistic Crystalline Anime-Human Eye (Sapphire to Cyan with Limbal Ring) */}
          <radialGradient id="irisGrad" cx="50%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="85%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#090d16" />
          </radialGradient>

          {/* Cyber Armor Kimono Shading */}
          <linearGradient id="cyberArmorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>

          {/* Holographic Conduit Glow */}
          <filter id="cyberGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. BACK HAIR FLOW & DEPTH */}
        <g id="back-hair">
          <path
            d="M 50 85 C 20 135 15 210 32 255 C 48 265 65 240 68 215 C 52 165 62 105 65 92 Z"
            fill="url(#realHairGrad)"
          />
          <path
            d="M 150 85 C 180 135 185 210 168 255 C 152 265 135 240 132 215 C 148 165 138 105 135 92 Z"
            fill="url(#realHairGrad)"
          />
          <path
            d="M 40 100 C 15 170 30 250 65 260 C 50 215 42 160 52 105 Z"
            fill="#090d16"
            opacity="0.85"
          />
          <path
            d="M 160 100 C 185 170 170 250 135 260 C 150 215 158 160 148 105 Z"
            fill="#090d16"
            opacity="0.85"
          />
        </g>

        {/* 2. BODY, SHOULDERS, AND CYBER-KIMONO OUTFIT */}
        <g id="body-structure" transform={`translate(0, ${breathPhase * 0.45})`}>
          {/* Chest & Shoulders */}
          <path
            d="M 55 212 C 75 198 125 198 145 212 L 172 270 L 28 270 Z"
            fill="url(#cyberArmorGrad)"
            stroke="#4338ca"
            strokeWidth="1.2"
          />
          {/* Cyber Collar Lapels */}
          <path
            d="M 82 185 L 100 205 L 118 185 L 112 218 L 88 218 Z"
            fill="#1e1b4b"
            stroke="#ec4899"
            strokeWidth="1.2"
          />
          {/* Glowing Cybernetic Chest Core */}
          <circle
            cx="100"
            cy="225"
            r="4.5"
            fill={
              isSpeaking
                ? '#ec4899'
                : isListening
                ? '#06b6d4'
                : isThinking
                ? '#a855f7'
                : '#6366f1'
            }
            filter="url(#cyberGlow)"
            className="transition-colors duration-300"
          />
        </g>

        {/* 3. NECK & CLAVICLES WITH REALISTIC PROPORTIONS */}
        <g id="neck">
          <path
            d="M 88 152 L 88 190 C 95 194 105 194 112 190 L 112 152 Z"
            fill="url(#realSkinGlow)"
          />
          {/* Ambient Neck Shadow beneath jaw */}
          <path
            d="M 88 152 C 94 162 106 162 112 152 L 112 165 C 105 170 95 170 88 165 Z"
            fill="url(#skinShadow)"
          />
          {/* Clavicle / Collarbone indent lines */}
          <path d="M 84 196 Q 96 198 100 202" stroke="#fda4af" strokeWidth="0.8" fill="none" />
          <path d="M 116 196 Q 104 198 100 202" stroke="#fda4af" strokeWidth="0.8" fill="none" />
        </g>

        {/* 4. HEAD BASE, FACIAL CONTOUR & REALISTIC EAR */}
        <g id="head" transform={`translate(0, ${nodPhase})`}>
          {/* Realistic Anime-Human Head Oval Contour */}
          <path
            d="M 66 90
               C 66 128 76 160 100 170
               C 124 160 134 128 134 90
               C 134 50 66 50 66 90 Z"
            fill="url(#realSkinGlow)"
            stroke="#fecdd3"
            strokeWidth="0.6"
          />

          {/* Ears with delicate cartilage & tech cyber-ring */}
          <path
            d="M 65 102 C 58 108 59 122 66 126 Z"
            fill="url(#realSkinGlow)"
            stroke="#fecdd3"
            strokeWidth="0.6"
          />
          <path
            d="M 135 102 C 142 108 141 122 134 126 Z"
            fill="url(#realSkinGlow)"
            stroke="#fecdd3"
            strokeWidth="0.6"
          />
          <circle cx="60" cy="116" r="2.2" fill="#38bdf8" filter="url(#cyberGlow)" />
          <circle cx="140" cy="116" r="2.2" fill="#ec4899" filter="url(#cyberGlow)" />

          {/* Natural Cheek Subsurface Rosy Blush */}
          <ellipse cx="78" cy="132" rx="7.5" ry="4" fill="#f43f5e" opacity="0.28" />
          <ellipse cx="122" cy="132" rx="7.5" ry="4" fill="#f43f5e" opacity="0.28" />

          {/* Realistic 3D Nose Bridge & Subtle Nostrils */}
          <g id="realistic-nose">
            {/* Soft vertical cartilage highlight */}
            <path
              d="M 99.5 116 L 99.5 129 L 100.8 131"
              stroke="#ffffff"
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity="0.65"
              fill="none"
            />
            {/* Soft bridge shading */}
            <path
              d="M 100.5 125 L 101.8 132 L 99 133"
              stroke="#fb7185"
              strokeWidth="1.1"
              strokeLinecap="round"
              fill="none"
            />
            {/* Subtle nostrils */}
            <ellipse cx="98.2" cy="133" rx="0.9" ry="0.6" fill="#881337" opacity="0.6" />
            <ellipse cx="102.2" cy="133" rx="0.9" ry="0.6" fill="#881337" opacity="0.6" />
          </g>

          {/* Left Eyebrow with natural arch */}
          <path
            d={`M 73 ${96 + browL_Y} Q 83 ${90 + browL_Y + browRot} 92 ${96 + browL_Y}`}
            stroke="#1e1b4b"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Right Eyebrow with natural arch */}
          <path
            d={`M 108 ${96 + browR_Y} Q 117 ${90 + browR_Y - browRot} 127 ${96 + browR_Y}`}
            stroke="#1e1b4b"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* 5. REALISTIC ANIME-HUMAN EYES (Left & Right) */}
          {/* Left Eye */}
          <g id="left-eye" transform="translate(82, 112)">
            {blinkState > 0.8 ? (
              // Natural closed eyelid with gentle curved lash line
              <path
                d="M -11 0 Q 0 4.5 11 0"
                stroke="#090d16"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <g>
                {/* Sclera (White) with ambient corner shadow */}
                <ellipse cx="0" cy="0" rx="10.5" ry={8.2 * (1 - blinkState)} fill="#f8fafc" />

                {/* Sclera ambient shadow beneath upper lid */}
                <path
                  d="M -10 -2 Q 0 -6 10 -2"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  fill="none"
                />

                {/* Crystalline Iris with Gaze Tracking */}
                <ellipse
                  cx={eyeGazeX * 0.4}
                  cy={eyeGazeY * 0.4}
                  rx="6.6"
                  ry={6.6 * (1 - blinkState)}
                  fill="url(#irisGrad)"
                />

                {/* Deep Pupil with subtle dilation */}
                <circle
                  cx={eyeGazeX * 0.4}
                  cy={eyeGazeY * 0.4}
                  r={(isThinking ? 3.6 : 3.0) * (1 - blinkState)}
                  fill="#030712"
                />

                {/* Primary Luminous Specular Catchlight */}
                <circle
                  cx={eyeGazeX * 0.4 - 2.2}
                  cy={eyeGazeY * 0.4 - 2.2}
                  r="2.0"
                  fill="#ffffff"
                />

                {/* Secondary Soft Fill Reflection */}
                <circle
                  cx={eyeGazeX * 0.4 + 2.5}
                  cy={eyeGazeY * 0.4 + 2.0}
                  r="1.2"
                  fill="#bae6fd"
                  opacity="0.85"
                />

                {/* Upper Double-Eyelid Crease (Epicanthic Fold) */}
                <path
                  d="M -9 -7 Q 0 -9.5 9 -7"
                  stroke="#e2e8f0"
                  strokeWidth="1.0"
                  strokeOpacity="0.7"
                  fill="none"
                />

                {/* Upper Eyelash Contour with fine wing */}
                <path
                  d="M -11.5 -2.5 Q 0 -8.5 12 -2"
                  stroke="#090d16"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            )}
          </g>

          {/* Right Eye */}
          <g id="right-eye" transform="translate(118, 112)">
            {blinkState > 0.8 ? (
              // Closed eyelid
              <path
                d="M -11 0 Q 0 4.5 11 0"
                stroke="#090d16"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <g>
                {/* Sclera */}
                <ellipse cx="0" cy="0" rx="10.5" ry={8.2 * (1 - blinkState)} fill="#f8fafc" />

                {/* Sclera ambient shadow */}
                <path
                  d="M -10 -2 Q 0 -6 10 -2"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  fill="none"
                />

                {/* Iris */}
                <ellipse
                  cx={eyeGazeX * 0.4}
                  cy={eyeGazeY * 0.4}
                  rx="6.6"
                  ry={6.6 * (1 - blinkState)}
                  fill="url(#irisGrad)"
                />

                {/* Pupil */}
                <circle
                  cx={eyeGazeX * 0.4}
                  cy={eyeGazeY * 0.4}
                  r={(isThinking ? 3.6 : 3.0) * (1 - blinkState)}
                  fill="#030712"
                />

                {/* Catchlight */}
                <circle
                  cx={eyeGazeX * 0.4 - 2.2}
                  cy={eyeGazeY * 0.4 - 2.2}
                  r="2.0"
                  fill="#ffffff"
                />
                <circle
                  cx={eyeGazeX * 0.4 + 2.5}
                  cy={eyeGazeY * 0.4 + 2.0}
                  r="1.2"
                  fill="#bae6fd"
                  opacity="0.85"
                />

                {/* Upper Double-Eyelid Crease */}
                <path
                  d="M -9 -7 Q 0 -9.5 9 -7"
                  stroke="#e2e8f0"
                  strokeWidth="1.0"
                  strokeOpacity="0.7"
                  fill="none"
                />

                {/* Eyelash */}
                <path
                  d="M -11.5 -2.5 Q 0 -8.5 12 -2"
                  stroke="#090d16"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            )}
          </g>

          {/* 6. REALISTIC ANIME-HUMAN MOUTH (Acoustic Phoneme Synchronized) */}
          {renderRealisticMouth()}

          {/* 7. FRONT HAIR BANGS & ANISOTROPIC SHEEN */}
          <g id="front-hair">
            {/* Crown Volume */}
            <path
              d="M 64 82 C 58 32 142 32 136 82 C 120 72 80 72 64 82 Z"
              fill="url(#realHairGrad)"
            />
            {/* Center Sweeping Bang */}
            <path
              d="M 74 65 Q 96 86 98 114 Q 106 88 126 65 Z"
              fill="url(#realHairGrad)"
            />
            {/* Left Face Framing Locks */}
            <path
              d="M 65 78 Q 58 120 67 150 Q 72 135 71 95 Z"
              fill="url(#realHairGrad)"
            />
            {/* Right Face Framing Locks */}
            <path
              d="M 135 78 Q 142 120 133 150 Q 128 135 129 95 Z"
              fill="url(#realHairGrad)"
            />
            {/* Anisotropic Sheen Ribbon across hair crown */}
            <path
              d="M 74 60 Q 100 50 126 60 Q 100 54 74 60 Z"
              fill="url(#anisotropicSheen)"
            />
            {/* Cyberpunk Magenta Hair Clip Accent */}
            <path
              d="M 126 52 Q 140 46 145 60 Q 135 58 126 52 Z"
              fill="#ec4899"
              filter="url(#cyberGlow)"
            />
          </g>
        </g>

        {/* 8. REALISTIC ARTICULATED HANDS AND GESTURES */}
        <g id="gestures">
          {gesture === 'namaste' && (
            // Respectful Namaste with Realistic Hands & Fingers
            <g transform="translate(100, 205) scale(0.95)" className="animate-pulse">
              {/* Left & Right Pressed Palms with realistic thumb & knuckles */}
              <path
                d="M -13 20 C -12 5, -8 -15, 0 -22 C 8 -15, 12 5, 13 20 C 6 15, -6 15, -13 20 Z"
                fill="url(#realSkinGlow)"
                stroke="#fda4af"
                strokeWidth="1.2"
              />
              {/* Center Finger Seam */}
              <path d="M 0 -22 L 0 15" stroke="#fb7185" strokeWidth="1.1" strokeLinecap="round" />
              {/* Subtle pink fingernail highlights */}
              <ellipse cx="0" cy="-21" rx="1.5" ry="1" fill="#f43f5e" opacity="0.6" />
            </g>
          )}

          {gesture === 'thinking_chin' && (
            // Thoughtful hand near cheek / chin with realistic index finger
            <g transform="translate(108, 162)">
              <path
                d="M 2 35 C 8 20, 10 5, 6 -4 C 1 -10, -5 -4, -2 4 C 0 14, -4 25, -6 35 Z"
                fill="url(#realSkinGlow)"
                stroke="#fda4af"
                strokeWidth="1.2"
              />
              <circle cx="5" cy="-4" r="3.2" fill="url(#realSkinGlow)" />
              <ellipse cx="5" cy="-5" rx="1.5" ry="1.0" fill="#f43f5e" opacity="0.6" />
            </g>
          )}

          {gesture === 'explaining_open' && (
            // Open-palm presenting gesture with natural fingers
            <g transform="translate(148, 185) rotate(-22)">
              <path
                d="M -10 32 C 6 14, 22 2, 28 -8 C 30 -12, 24 -15, 18 -10 C 10 -4, -4 12, -6 32 Z"
                fill="url(#realSkinGlow)"
                stroke="#fda4af"
                strokeWidth="1.2"
              />
            </g>
          )}

          {gesture === 'pointing_left' && (
            // Pointing to active project / chat content
            <g transform="translate(48, 175) rotate(30)">
              <path
                d="M 10 32 C -6 14, -22 2, -28 -8 C -30 -12, -24 -15, -18 -10 C -10 -4, 4 12, 6 32 Z"
                fill="url(#realSkinGlow)"
                stroke="#fda4af"
                strokeWidth="1.2"
              />
            </g>
          )}
        </g>
      </svg>

      {/* Floating Status Pill */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-[11px] font-medium tracking-wide">
        <span
          className={`w-2 h-2 rounded-full ${
            isSpeaking
              ? 'bg-pink-500 animate-ping'
              : isListening
              ? 'bg-cyan-400 animate-pulse'
              : isThinking
              ? 'bg-purple-400 animate-spin'
              : 'bg-emerald-400'
          }`}
        />
        <span className="text-slate-300 font-mono capitalize">
          {isSpeaking
            ? 'Radhe Speaking...'
            : isListening
            ? 'Listening to Suraj...'
            : isThinking
            ? 'Deep Reasoning...'
            : 'Radhe Ready'}
        </span>
      </div>
    </div>
  );
};
