import React, { useState } from 'react';
import { Upload, Sparkles, ArrowRight, Film, Copy, Check } from 'lucide-react';
import type { VideoSample } from '../types';

interface StructCaptionTabProps {
  samples: VideoSample[];
  onSendToFusion: (jsonText: string) => void;
}

export function StructCaptionTab({ samples, onSendToFusion }: StructCaptionTabProps) {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(samples[0]?.id || '1.mp4');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(samples[0]?.videoUrl || '/assets/1.mp4');
  const [jsonOutput, setJsonOutput] = useState<string>(
    samples[0] ? JSON.stringify(samples[0].structuralCaption, null, 4) : '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSample = samples.find((s) => s.id === selectedSampleId);

  const handleSelectExample = (sample: VideoSample) => {
    setUploadedFile(null);
    setSelectedSampleId(sample.id);
    setPreviewUrl(sample.videoUrl);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setSelectedSampleId('');
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append('video', uploadedFile);
      } else if (selectedSampleId) {
        formData.append('sampleId', selectedSampleId);
      }

      const res = await fetch('/api/struct-caption', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate structural caption');
      }
      setJsonOutput(data.formattedJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!jsonOutput) return;
    await navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">SkyCaptioner-V1: Structural Video Captioning</h2>
          <p className="text-sm text-slate-400">
            Extracts hierarchical subjects, shot type, shot angle, shot position, camera motion, environment, and lighting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {jsonOutput && (
            <button
              type="button"
              onClick={() => onSendToFusion(jsonOutput)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              Send to Caption Fusion
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Film className="h-4 w-4 text-indigo-400" />
                Input Video {uploadedFile ? `(${uploadedFile.name})` : activeSample ? `(${activeSample.filename})` : ''}
              </span>
              <label className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                Upload MP4
                <input type="file" accept="video/mp4,video/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black border border-slate-800">
              <video
                key={previewUrl}
                src={previewUrl}
                controls
                loop
                playsInline
                className="h-full w-full object-contain"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Analyzing Video Frames...' : 'Generate Structural Caption'}
            </button>

            {error && (
              <div className="rounded-lg border border-rose-800/70 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Example Videos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {samples.map((sample) => {
                const isActive = !uploadedFile && selectedSampleId === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectExample(sample)}
                    className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-sky-500 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{sample.filename}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{sample.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-200">Structural JSON Caption</span>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!jsonOutput}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre className="flex-1 min-h-[420px] max-h-[540px] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
            {jsonOutput || '// Select a video and click Generate Structural Caption'}
          </pre>
        </div>
      </div>
    </div>
  );
}
