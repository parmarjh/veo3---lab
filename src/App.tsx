/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';

// Extend Window interface for AI Studio integration
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
import { GoogleGenAI } from "@google/genai";
import {
  Upload,
  Play,
  Loader2,
  Sparkles,
  Info,
  ChevronRight,
  Video,
  Image as ImageIcon,
  AlertCircle,
  Lightbulb,
  Check,
  Settings,
  Globe,
  Zap,
  ShieldAlert,
  Clock,
  Gauge,
  Move,
  Maximize,
  Minimize,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCw,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for the application
interface VideoGenerationResult {
  url: string;
  prompt: string;
}

const PROMPT_EXAMPLES = [
  {
    title: "Cyberpunk City",
    prompt: "A futuristic cyberpunk city with neon signs, flying vehicles, and rain-slicked streets at night.",
    icon: "🌃",
    type: 'scene'
  },
  {
    title: "Enchanted Forest",
    prompt: "A magical forest with glowing plants, mystical fog, and tiny floating fireflies.",
    icon: "🧚",
    type: 'scene'
  },
  {
    title: "Cinematic Pan",
    prompt: "A slow, cinematic pan across the scene, revealing hidden details with dramatic lighting.",
    icon: "🎥",
    type: 'motion'
  },
  {
    title: "Time-Lapse",
    prompt: "A fast-paced time-lapse showing the passage of time, with shifting shadows and changing light.",
    icon: "⏳",
    type: 'motion'
  },
  {
    title: "Dynamic Action",
    prompt: "High-energy motion with fast camera tracking and vibrant, fluid movement throughout the frame.",
    icon: "⚡",
    type: 'motion'
  },
  {
    title: "Ethereal Glow",
    prompt: "Soft, pulsing light effects with gentle floating particles and a dreamlike, slow-motion atmosphere.",
    icon: "✨",
    type: 'motion'
  }
];

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [contentDescription, setContentDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<VideoGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('720p');
  const [duration, setDuration] = useState<number>(8);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [motionIntensity, setMotionIntensity] = useState<number>(5);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [cameraMovements, setCameraMovements] = useState<string[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [provider, setProvider] = useState<'google' | 'openrouter'>('google');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const sceneRef = useRef<HTMLTextAreaElement>(null);
  const motionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // Check if we have a server-side key or AI Studio key
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
      // In standalone/Cloud Run mode, we assume the server has the key
      setHasKey(true);
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    } else {
      setShowSettings(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end' = 'start') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'start') {
          setImage(reader.result as string);
        } else {
          setLastFrame(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCameraMovement = (movement: string) => {
    setCameraMovements(prev =>
      prev.includes(movement)
        ? prev.filter(m => m !== movement)
        : [...prev, movement]
    );
  };

  const handleExampleClick = (example: any, index: number) => {
    if (example.type === 'scene') {
      setContentDescription(example.prompt);
      sceneRef.current?.focus();
      sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setPrompt(example.prompt);
      motionRef.current?.focus();
      motionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setAppliedIndex(index);
    setTimeout(() => setAppliedIndex(null), 2000);
  };

  const generateVideo = async () => {
    if (!image && !contentDescription) {
      setError("Please provide either an image or a scene description.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const motionAdjectives = [
        motionIntensity <= 3 ? 'subtle' : motionIntensity >= 8 ? 'intense' : 'steady',
        ...cameraMovements
      ].filter(Boolean).join(', ');

      const combinedPrompt = [
        contentDescription,
        motionAdjectives ? `${motionAdjectives} motion` : '',
        prompt
      ].filter(Boolean).join('. ');

      const finalPrompt = combinedPrompt || 'Animate this scene with cinematic motion';

      const videoConfig: any = {
        model: provider === 'google' ? 'veo-3.1-fast-generate-preview' : 'google/gemini-2.0-flash-exp:free',
        prompt: finalPrompt,
        config: {
          numberOfVideos: 1,
          aspectRatio: aspectRatio,
          durationSeconds: duration
        }
      };

      if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1];
        videoConfig.image = {
          imageBytes: base64Data,
          mimeType: mimeType,
        };
      }

      if (lastFrame) {
        const base64Data = lastFrame.split(',')[1];
        const mimeType = lastFrame.split(';')[0].split(':')[1];
        videoConfig.config.lastFrame = {
          imageBytes: base64Data,
          mimeType: mimeType,
        };
      }

      // Call Backend for generation
      const genResponse = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoConfig })
      });

      let genResponseText = await genResponse.text();

      if (!genResponse.ok) {
        throw new Error(`Server error: ${genResponse.status} - ${genResponseText}`);
      }

      let genData;
      try {
        genData = JSON.parse(genResponseText);
      } catch {
        throw new Error(`Failed to parse generation response: ${genResponseText}`);
      }

      let { operation } = genData;

      // Poll for completion via backend
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const pollResponse = await fetch('/api/get-operation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation })
        });

        let pollResponseText = await pollResponse.text();

        if (!pollResponse.ok) {
          throw new Error(`Failed to get operation status: ${pollResponse.status} - ${pollResponseText}`);
        }

        try {
          operation = JSON.parse(pollResponseText);
        } catch (parseError) {
          throw new Error(`Failed to parse operation response: ${pollResponseText}`);
        }
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

      if (downloadLink) {
        // Use backend proxy for download to avoid CORS issues
        const response = await fetch(`/api/download-video?url=${encodeURIComponent(downloadLink)}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to download video: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        setResult({ url: videoUrl, prompt: prompt || 'Cinematic animation' });
      } else {
        throw new Error('No video URL returned from the model.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during video generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-[#0a0502] text-[#f5f2ed] flex items-center justify-center p-6 font-serif">
        <div className="max-w-md w-full space-y-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-20 h-20 bg-[#ff4e00]/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <Sparkles className="w-10 h-10 text-[#ff4e00]" />
            </div>
            <h1 className="text-4xl font-light tracking-tight">Veo Video Lab</h1>
            <div className="space-y-4 text-[#f5f2ed]/60 text-sm leading-relaxed max-w-sm mx-auto">
              <p>
                This application uses <span className="text-[#ff4e00] font-medium">Google's Gemini API</span> to power advanced video generation models like Veo.
              </p>
              <p>
                An API key is required to authenticate your requests and manage usage costs for these high-performance AI services.
              </p>
              <p className="text-xs italic opacity-70">
                Don't have a Google Cloud key? You can also configure <span className="text-[#ff4e00] font-medium">OpenRouter</span> as a fallback in the settings once you're inside.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={handleOpenKeySelector}
                className="w-full py-4 bg-[#ff4e00] text-white rounded-full font-sans font-medium hover:bg-[#ff4e00]/90 transition-all flex items-center justify-center gap-2 group"
              >
                Select API Key
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="mt-4 text-xs text-[#f5f2ed]/40">
                Requires a Google Cloud project with billing enabled.
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-1">Learn more</a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0502] text-[#f5f2ed] font-sans selection:bg-[#ff4e00]/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ff4e00]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3a1510]/20 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#ff4e00] text-xs font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-4 h-4" />
              <span>Experimental Lab</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-serif font-light tracking-tight leading-none">
              Animate your <br />
              <span className="italic text-[#ff4e00]">imagination.</span>
            </h1>
            <p className="text-lg text-[#f5f2ed]/60 max-w-xl font-light leading-relaxed">
              Upload a static image and let Google's Veo model bring it to life with cinematic motion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-full">
              <button
                onClick={() => setProvider('google')}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${provider === 'google' ? 'bg-[#ff4e00] text-white' : 'text-[#f5f2ed]/40 hover:text-[#f5f2ed]/60'
                  }`}
              >
                Google
              </button>
              <button
                onClick={() => setProvider('openrouter')}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${provider === 'openrouter' ? 'bg-[#ff4e00] text-white' : 'text-[#f5f2ed]/40 hover:text-[#f5f2ed]/60'
                  }`}
              >
                OpenRouter
              </button>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${showSettings ? 'bg-[#ff4e00] text-white' : 'bg-white/5 border border-white/10 text-[#f5f2ed]/40 hover:text-[#ff4e00]'
                }`}
            >
              <Settings className="w-3 h-3" />
              Settings
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#ff4e00]">
                    <Zap className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Active Provider</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-[#f5f2ed]/40 leading-relaxed">
                      We support multiple AI backends to ensure reliability.
                    </p>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff4e00]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Google Gemini</span>
                      </div>
                      <p className="text-[10px] text-[#f5f2ed]/40">
                        Primary provider for Veo 3.1. Requires a Google Cloud API key with billing enabled.
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">OpenRouter</span>
                      </div>
                      <p className="text-[10px] text-[#f5f2ed]/40">
                        A universal API aggregator. Use this as a fallback if you hit Google's quota limits or prefer third-party routing.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button
                      onClick={() => setProvider('google')}
                      className={`flex-1 p-4 rounded-2xl border transition-all text-left ${provider === 'google' ? 'border-[#ff4e00] bg-[#ff4e00]/5' : 'border-white/10 hover:border-white/30'
                        }`}
                    >
                      <span className="block text-xs font-bold mb-1">Google Native</span>
                      <span className="block text-[10px] text-[#f5f2ed]/40">Direct access to Veo 3.1 Fast</span>
                    </button>
                    <button
                      onClick={() => setProvider('openrouter')}
                      className={`flex-1 p-4 rounded-2xl border transition-all text-left ${provider === 'openrouter' ? 'border-[#ff4e00] bg-[#ff4e00]/5' : 'border-white/10 hover:border-white/30'
                        }`}
                    >
                      <span className="block text-xs font-bold mb-1">OpenRouter</span>
                      <span className="block text-[10px] text-[#f5f2ed]/40">Fallback for LLM tasks & Proxying</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#ff4e00]">
                    <Globe className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">OpenRouter Configuration</h3>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#f5f2ed]/40">API Key</label>
                    <input
                      type="password"
                      value={openRouterKey}
                      onChange={(e) => setOpenRouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-[#ff4e00]/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] text-blue-400">
                    <Info className="w-3 h-3 shrink-0" />
                    <p>OpenRouter keys are stored in session memory only.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Controls Section */}
          <section className="space-y-8">
            <div className="bg-[#f5f2ed]/5 border border-[#f5f2ed]/10 rounded-[32px] p-8 backdrop-blur-xl">
              <div className="space-y-6">
                {/* Keyframes Section */}
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Keyframes (Start & End)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Start Frame */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-[#f5f2ed]/40 uppercase tracking-wider">Start Frame</span>
                      <div
                        className={`relative group cursor-pointer aspect-video rounded-xl border-2 border-dashed transition-all overflow-hidden ${image ? 'border-transparent' : 'border-[#f5f2ed]/10 hover:border-[#ff4e00]/50'
                          }`}
                      >
                        {image ? (
                          <>
                            <img src={image} alt="Start" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setImage(null)} className="p-2 bg-white/10 backdrop-blur-md rounded-full"><Upload className="w-4 h-4" /></button>
                            </div>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                            <Upload className="w-4 h-4 text-[#f5f2ed]/20 mb-1" />
                            <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'start')} accept="image/*" />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* End Frame */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-[#f5f2ed]/40 uppercase tracking-wider">End Frame (Optional)</span>
                      <div
                        className={`relative group cursor-pointer aspect-video rounded-xl border-2 border-dashed transition-all overflow-hidden ${lastFrame ? 'border-transparent' : 'border-[#f5f2ed]/10 hover:border-[#ff4e00]/50'
                          }`}
                      >
                        {lastFrame ? (
                          <>
                            <img src={lastFrame} alt="End" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setLastFrame(null)} className="p-2 bg-white/10 backdrop-blur-md rounded-full"><Upload className="w-4 h-4" /></button>
                            </div>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                            <Upload className="w-4 h-4 text-[#f5f2ed]/20 mb-1" />
                            <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'end')} accept="image/*" />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Motion Controls */}
                <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                      <Move className="w-3 h-3" />
                      Camera Path Builder
                    </label>
                    <span className="text-[10px] text-[#ff4e00] font-mono">{motionIntensity}/10 Intensity</span>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={motionIntensity}
                      onChange={(e) => setMotionIntensity(parseInt(e.target.value))}
                      className="w-full accent-[#ff4e00]"
                    />

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'zoom in', icon: <Maximize className="w-3 h-3" />, label: 'Zoom In', description: 'Gradually zooms the camera closer to the subject' },
                        { id: 'zoom out', icon: <Minimize className="w-3 h-3" />, label: 'Zoom Out', description: 'Gradually pulls the camera away from the subject' },
                        { id: 'pan left', icon: <ArrowDownLeft className="w-3 h-3 rotate-45" />, label: 'Pan L', description: 'Moves the camera horizontally to the left' },
                        { id: 'pan right', icon: <ArrowUpRight className="w-3 h-3 -rotate-45" />, label: 'Pan R', description: 'Moves the camera horizontally to the right' },
                        { id: 'tilt up', icon: <ArrowUpRight className="w-3 h-3" />, label: 'Tilt U', description: 'Rotates the camera lens upwards' },
                        { id: 'tilt down', icon: <ArrowDownLeft className="w-3 h-3" />, label: 'Tilt D', description: 'Rotates the camera lens downwards' },
                        { id: 'dolly in', icon: <Maximize className="w-3 h-3 scale-75" />, label: 'Dolly In', description: 'Physically moves the camera closer for an immersive feel' },
                        { id: 'orbit', icon: <RotateCw className="w-3 h-3" />, label: 'Orbit', description: 'Rotates the camera around the subject in a circular path' },
                      ].map((move) => (
                        <button
                          key={move.id}
                          onClick={() => toggleCameraMovement(move.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all group relative ${cameraMovements.includes(move.id)
                            ? 'bg-[#ff4e00] border-[#ff4e00] text-white'
                            : 'bg-white/5 border-white/10 text-[#f5f2ed]/40 hover:border-white/30'
                            }`}
                        >
                          {move.icon}
                          <span className="text-[8px] font-bold uppercase tracking-tighter">{move.label}</span>

                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 p-2 bg-black/90 border border-white/10 rounded-lg text-[8px] leading-tight text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                            {move.description}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Description */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    Scene Content
                  </label>
                  <textarea
                    ref={sceneRef}
                    value={contentDescription}
                    onChange={(e) => setContentDescription(e.target.value)}
                    placeholder="Describe what is in the video (e.g., 'A futuristic city with neon lights and flying cars')"
                    className="w-full bg-black/20 border border-[#f5f2ed]/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#ff4e00]/50 min-h-[80px] resize-none transition-colors"
                  />
                </div>

                {/* Prompt Input */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Motion & Style
                  </label>
                  <textarea
                    ref={motionRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the motion (e.g., 'Gentle waves crashing on the shore with a slow zoom')"
                    className="w-full bg-black/20 border border-[#f5f2ed]/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#ff4e00]/50 min-h-[100px] resize-none transition-colors"
                  />
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                    <Video className="w-3 h-3" />
                    Aspect Ratio
                  </label>
                  <div className="flex gap-3">
                    {(['16:9', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`flex-1 py-3 rounded-xl text-xs font-medium border transition-all ${aspectRatio === ratio
                          ? 'bg-[#ff4e00] border-[#ff4e00] text-white'
                          : 'bg-white/5 border-[#f5f2ed]/10 text-[#f5f2ed]/60 hover:border-[#f5f2ed]/30'
                          }`}
                      >
                        {ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Quality */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Video Quality
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: '720p', label: '720p (HD)' },
                      { id: '1080p', label: '1080p (Full HD)' },
                      { id: '4k', label: '4K (Ultra HD)' }
                    ].map((quality) => (
                      <button
                        key={quality.id}
                        onClick={() => setResolution(quality.id as any)}
                        className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${resolution === quality.id
                          ? 'bg-[#ff4e00] border-[#ff4e00] text-white'
                          : 'bg-white/5 border-[#f5f2ed]/10 text-[#f5f2ed]/60 hover:border-[#f5f2ed]/30'
                          }`}
                      >
                        {quality.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#f5f2ed]/30 italic">
                    * Note: 1080p and 4K may require higher tier API access.
                  </p>
                </div>

                {/* Duration & Audio */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Duration
                    </label>
                    <div className="flex gap-2">
                      {[4, 6, 8].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${duration === d
                            ? 'bg-[#ff4e00] border-[#ff4e00] text-white'
                            : 'bg-white/5 border-[#f5f2ed]/10 text-[#f5f2ed]/40 hover:border-[#f5f2ed]/30'
                            }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                      <Gauge className="w-3 h-3" />
                      Audio Generation
                    </label>
                    <button
                      onClick={() => setGenerateAudio(!generateAudio)}
                      className={`w-full py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-2 ${generateAudio
                        ? 'bg-[#ff4e00] border-[#ff4e00] text-white'
                        : 'bg-white/5 border-[#f5f2ed]/10 text-[#f5f2ed]/40 hover:border-[#f5f2ed]/30'
                        }`}
                    >
                      {generateAudio ? <Check className="w-3 h-3" /> : null}
                      {generateAudio ? 'Audio Enabled' : 'No Audio'}
                    </button>
                    <p className="text-[10px] text-[#f5f2ed]/30 italic">
                      Veo 3+ generates native audio synced to video
                    </p>
                  </div>
                </div>

                {/* Negative Prompt */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#f5f2ed]/40 flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3" />
                    Negative Prompt (Optional)
                  </label>
                  <input
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Things to avoid (e.g., 'blurry, low quality, text, watermark')"
                    className="w-full bg-black/20 border border-[#f5f2ed]/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#ff4e00]/50 transition-colors"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateVideo}
                  disabled={(!image && !contentDescription) || isGenerating}
                  className={`w-full py-5 rounded-full font-bold text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${(!image && !contentDescription) || isGenerating
                    ? 'bg-[#f5f2ed]/5 text-[#f5f2ed]/20 cursor-not-allowed'
                    : 'bg-[#ff4e00] text-white hover:bg-[#ff4e00]/90 shadow-[0_0_40px_rgba(255,78,0,0.2)]'
                    }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Cinematic Video...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Generate Video
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3">
                    <div className="flex items-start gap-3 text-red-400 text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p>{error}</p>
                    </div>
                    {error.includes("429") && (
                      <button
                        onClick={() => {
                          setProvider('openrouter');
                          setShowSettings(true);
                          setError(null);
                        }}
                        className="w-full py-2 bg-[#ff4e00]/20 hover:bg-[#ff4e00]/30 text-[#ff4e00] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Zap className="w-3 h-3" />
                        Switch to OpenRouter Fallback
                      </button>
                    )}
                    {(error.includes("403") || error.includes("expired")) && (
                      <button
                        onClick={handleOpenKeySelector}
                        className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-colors"
                      >
                        Try a Different API Key
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-[#ff4e00]/5 border border-[#ff4e00]/10 rounded-3xl">
              <Info className="w-5 h-5 text-[#ff4e00] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#ff4e00]">Generation Tip</h4>
                <p className="text-xs text-[#f5f2ed]/60 leading-relaxed">
                  Video generation can take 1-3 minutes. For best results, use high-resolution images and describe specific camera movements like "panning," "zooming," or "tracking shot."
                </p>
              </div>
            </div>

            {/* Example Prompts Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#f5f2ed]/40 text-xs font-bold uppercase tracking-widest">
                <Lightbulb className="w-3 h-3" />
                <span>Example Prompts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROMPT_EXAMPLES.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example, index)}
                    className={`text-left p-4 bg-white/5 border rounded-2xl transition-all group relative overflow-hidden ${appliedIndex === index
                      ? 'border-[#ff4e00] bg-[#ff4e00]/10'
                      : 'border-[#f5f2ed]/10 hover:border-[#ff4e00]/50 hover:bg-[#ff4e00]/5'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{example.icon}</span>
                        <span className={`text-xs font-bold transition-colors ${appliedIndex === index ? 'text-[#ff4e00]' : 'text-[#f5f2ed]/80 group-hover:text-[#ff4e00]'
                          }`}>
                          {example.title}
                        </span>
                      </div>
                      {appliedIndex === index && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-[#ff4e00]"
                        >
                          <Check className="w-3 h-3" />
                        </motion.div>
                      )}
                    </div>
                    <p className="text-[10px] text-[#f5f2ed]/40 line-clamp-2 leading-relaxed">
                      {example.prompt}
                    </p>
                    {appliedIndex === index && (
                      <motion.div
                        layoutId="applied-bg"
                        className="absolute inset-0 bg-[#ff4e00]/5 pointer-events-none"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Output Section */}
          <section className="sticky top-12">
            <div className="relative aspect-[16/9] bg-black/40 rounded-[32px] border border-[#f5f2ed]/10 overflow-hidden flex items-center justify-center group">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full"
                  >
                    <video
                      src={result.url}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Resulting Prompt</p>
                      <p className="text-sm text-white font-light italic">"{result.prompt}"</p>
                    </div>
                  </motion.div>
                ) : isGenerating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-6 px-12"
                  >
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-[#ff4e00]/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[#ff4e00] rounded-full border-t-transparent animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-[#ff4e00] animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-serif italic">Crafting your scene...</h3>
                      <p className="text-sm text-[#f5f2ed]/40 leading-relaxed">
                        Veo is analyzing your image and simulating light, physics, and motion. This usually takes about 60-90 seconds.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center space-y-4 px-12">
                    <div className="w-16 h-16 bg-[#f5f2ed]/5 rounded-full flex items-center justify-center mx-auto">
                      <Video className="w-8 h-8 text-[#f5f2ed]/20" />
                    </div>
                    <p className="text-[#f5f2ed]/40 font-light italic">Your cinematic generation will appear here.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-[#f5f2ed]/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[#f5f2ed]/40 text-xs tracking-widest uppercase font-bold">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Powered by Google Veo 3.1</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-[#ff4e00] transition-colors">Documentation</a>
          <a href="#" className="hover:text-[#ff4e00] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[#ff4e00] transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
}
