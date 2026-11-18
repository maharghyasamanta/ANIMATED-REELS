import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Terminal, Sliders, AlertTriangle, Clock } from 'lucide-react';
import type { GenerationJob, ModelVariant, VideoSample } from '../types';

interface VideoGeneratorTabProps {
  models: ModelVariant[];
  samples: VideoSample[];
  initialPrompt?: string;
  initialMode?: 't2v' | 'i2v' | 'df';
}

export function VideoGeneratorTab({
  models,
  samples,
  initialPrompt,
  initialMode,
}: VideoGeneratorTabProps) {
  const [mode, setMode] = useState<'df' | 't2v' | 'i2v' | 'extend' | 'start_end'>(initialMode || 'df');
  const [modelId, setModelId] = useState<string>('Skywork/SkyReels-V2-DF-14B-540P');
  const [resolution, setResolution] = useState<'540P' | '720P'>('540P');
  const [prompt, setPrompt] = useState<string>(
    initialPrompt ||
      'A graceful white swan with a curved neck and delicate feathers swimming in a serene lake at dawn, its reflection perfectly mirrored in the still water as mist rises from the surface.',
  );
  const [numFrames, setNumFrames] = useState<number>(97);
  const [baseNumFrames, setBaseNumFrames] = useState<number>(97);
  const [inferenceSteps, setInferenceSteps] = useState<number>(30);
  const [guidanceScale, setGuidanceScale] = useState<number>(6.0);
  const [shift, setShift] = useState<number>(8.0);
  const [fps, setFps] = useState<number>(24);
  const [seed, setSeed] = useState<string>('');
  const [arStep, setArStep] = useState<number>(0);
  const [causalBlockSize, setCausalBlockSize] = useState<number>(5);
  const [overlapHistory, setOverlapHistory] = useState<string>('17');
  const [addnoiseCondition, setAddnoiseCondition] = useState<number>(20);
  const [promptEnhancer, setPromptEnhancer] = useState<boolean>(false);
  const [teacache, setTeacache] = useState<boolean>(true);
  const [teacacheThresh, setTeacacheThresh] = useState<number>(0.3);
  const [useRetSteps, setUseRetSteps] = useState<boolean>(true);
  const [offload, setOffload] = useState<boolean>(true);
  const [selectedSampleVideo, setSelectedSampleVideo] = useState<string>(samples[0]?.id || '1.mp4');

  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (initialMode) {
      handleModeChange(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.jobs)) setJobs(d.jobs);
      })
      .catch(() => {});
  }, []);

  const handleModeChange = (nextMode: 'df' | 't2v' | 'i2v' | 'extend' | 'start_end') => {
    setMode(nextMode);
    if (nextMode === 't2v') {
      setModelId('Skywork/SkyReels-V2-T2V-14B-540P');
      setGuidanceScale(6.0);
      setShift(8.0);
    } else if (nextMode === 'i2v') {
      setModelId('Skywork/SkyReels-V2-I2V-14B-540P');
      setGuidanceScale(5.0);
      setShift(3.0);
    } else {
      setModelId('Skywork/SkyReels-V2-DF-14B-540P');
      setGuidanceScale(6.0);
      setShift(8.0);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    setError(null);
    try {
      const res = await fetch('/api/prompt-enhancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prompt enhancement failed');
      setPrompt(data.enhancedPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          modelId,
          resolution,
          numFrames,
          baseNumFrames,
          inferenceSteps,
          guidanceScale,
          shift,
          fps,
          seed: seed ? Number(seed) : undefined,
          prompt,
          promptEnhancer,
          arStep,
          causalBlockSize,
          overlapHistory: overlapHistory ? Number(overlapHistory) : null,
          addnoiseCondition,
          teacache,
          teacacheThresh,
          useRetSteps,
          offload,
          sampleVideo: mode === 'extend' ? selectedSampleVideo : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setActiveJob(data.job);
      setJobs((prev) => [data.job, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const filteredModels = models.filter((m) =>
    mode === 't2v' ? m.mode === 't2v' : mode === 'i2v' ? m.mode === 'i2v' : m.mode === 'df',
  );

  const showDfControls = mode === 'df' || mode === 'extend' || mode === 'start_end';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">SkyReels-V2 Video Generation &amp; Diffusion Forcing</h2>
          <p className="text-sm text-slate-400">
            Configure T2V, I2V, or autoregressive Diffusion Forcing pipelines with TeaCache, Prompt Enhancer, and frame scheduling.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-800 bg-slate-900 p-1">
          {[
            { id: 'df', label: 'Diffusion Forcing' },
            { id: 't2v', label: 'Text-to-Video' },
            { id: 'i2v', label: 'Image-to-Video' },
            { id: 'extend', label: 'Video Extension' },
            { id: 'start_end', label: 'Start/End Frame' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleModeChange(item.id as typeof mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mode === item.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-200">Generation Prompt</label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={enhancing || !prompt.trim()}
                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {enhancing ? 'Enhancing...' : 'Run Prompt Enhancer'}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Describe the shot type, subject, action, environment, lighting, and camera motion..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Model Variant</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  {filteredModels.map((m) => (
                    <option key={m.modelId} value={m.modelId}>
                      {m.modelId} ({m.vramGb}GB VRAM)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as '540P' | '720P')}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  <option value="540P">540P (544 x 960)</option>
                  <option value="720P">720P (720 x 1280)</option>
                </select>
              </div>
            </div>

            {mode === 'extend' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Prefix Video to Extend</label>
                <select
                  value={selectedSampleVideo}
                  onChange={(e) => setSelectedSampleVideo(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  {samples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.filename} — {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs text-slate-400 mb-1">num_frames</label>
                <input
                  type="number"
                  value={numFrames}
                  onChange={(e) => setNumFrames(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">inference_steps</label>
                <input
                  type="number"
                  value={inferenceSteps}
                  onChange={(e) => setInferenceSteps(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">fps</label>
                <input
                  type="number"
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">guidance_scale</label>
                <input
                  type="number"
                  step="0.5"
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">shift</label>
                <input
                  type="number"
                  step="0.5"
                  value={shift}
                  onChange={(e) => setShift(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">seed (optional)</label>
                <input
                  type="text"
                  placeholder="Random"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
                />
              </div>
            </div>

            {showDfControls && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
                  <Sliders className="h-3.5 w-3.5" />
                  Diffusion Forcing Parameters
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">ar_step (0=sync, 5=async)</label>
                    <input
                      type="number"
                      value={arStep}
                      onChange={(e) => setArStep(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">causal_block_size</label>
                    <input
                      type="number"
                      value={causalBlockSize}
                      onChange={(e) => setCausalBlockSize(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">base_num_frames</label>
                    <input
                      type="number"
                      value={baseNumFrames}
                      onChange={(e) => setBaseNumFrames(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">overlap_history</label>
                    <input
                      type="number"
                      value={overlapHistory}
                      onChange={(e) => setOverlapHistory(e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">addnoise_condition</label>
                    <input
                      type="number"
                      value={addnoiseCondition}
                      onChange={(e) => setAddnoiseCondition(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-5 pt-1 text-sm text-slate-300">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offload}
                  onChange={(e) => setOffload(e.target.checked)}
                  className="accent-sky-500"
                />
                CPU Offload
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacache}
                  onChange={(e) => setTeacache(e.target.checked)}
                  className="accent-sky-500"
                />
                TeaCache (thresh {teacacheThresh})
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRetSteps}
                  onChange={(e) => setUseRetSteps(e.target.checked)}
                  className="accent-sky-500"
                />
                Retention Steps
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promptEnhancer}
                  onChange={(e) => setPromptEnhancer(e.target.checked)}
                  className="accent-sky-500"
                />
                Auto-Enhance Prompt
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-800/70 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4" />
              {generating ? 'Synthesizing Video Sequence...' : 'Run Pipeline'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">Output Preview</span>
              {activeJob && (
                <span className="text-xs text-slate-400">
                  {activeJob.width}x{activeJob.height} · {activeJob.numFrames}f @ {activeJob.fps}fps · seed {activeJob.seed}
                </span>
              )}
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black border border-slate-800 flex items-center justify-center">
              {activeJob ? (
                <video
                  key={activeJob.id}
                  src={activeJob.previewVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-center px-6 text-sm text-slate-500">
                  Configure parameters and click Run Pipeline to preview generated output and inspect the CLI configuration.
                </div>
              )}
            </div>

            {activeJob?.warnings && activeJob.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-700/60 bg-amber-950/50 p-3 text-xs text-amber-200 space-y-1">
                {activeJob.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {activeJob && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Terminal className="h-3.5 w-3.5" />
                  Equivalent Inference Command
                </div>
                <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-emerald-300">
                  {activeJob.cliCommand}
                </pre>
              </div>
            )}
          </div>

          {jobs.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Session History ({jobs.length})
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setActiveJob(job)}
                    className={`w-full rounded-lg border p-2.5 text-left text-xs transition-colors cursor-pointer ${
                      activeJob?.id === job.id
                        ? 'border-sky-500 bg-sky-500/10'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium text-slate-200">
                      <span>{job.modelId}</span>
                      <span className="text-slate-400">{job.resolution} · {job.numFrames}f</span>
                    </div>
                    <p className="text-slate-400 truncate mt-1">{job.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
