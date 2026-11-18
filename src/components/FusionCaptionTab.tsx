import React, { useState } from 'react';
import { Wand2, ArrowRight, Copy, Check } from 'lucide-react';

export const DEFAULT_FUSION_JSON = `{
    "subjects": [
        {
            "TYPES": {
                "type": "Human",
                "sub_type": "Woman"
            },
            "appearance": "Long, straight black hair with bangs, wearing a sparkling choker necklace and a dark-colored top or dress with a visible strap over her shoulder.",
            "action": "A woman wearing a sparkling choker necklace and earrings is sitting in a car, looking to her left and speaking. A man, dressed in a suit, is sitting next to her, attentively watching her.",
            "expression": "The individual in the video exhibits a neutral facial expression, characterized by slightly open lips and a gentle, soft-focus gaze. There are no noticeable signs of sadness or distress evident in their demeanor.",
            "position": "Seated in the foreground of the car, facing slightly to the right.",
            "is_main_subject": true
        },
        {
            "TYPES": {
                "type": "Human",
                "sub_type": "Man"
            },
            "appearance": "Short hair, wearing a dark-colored suit with a white shirt.",
            "action": "",
            "expression": "",
            "position": "Seated in the background of the car, facing the woman.",
            "is_main_subject": false
        }
    ],
    "shot_type": "close_up",
    "shot_angle": "eye_level",
    "shot_position": "side_view",
    "camera_motion": "",
    "environment": "Interior of a car with a dark color scheme.",
    "lighting": "Soft and natural lighting, suggesting daytime."
}`;

interface FusionCaptionTabProps {
  jsonInput: string;
  onJsonInputChange: (val: string) => void;
  onUseInGenerator: (prompt: string, task: 't2v' | 'i2v') => void;
}

export function FusionCaptionTab({
  jsonInput,
  onJsonInputChange,
  onUseInGenerator,
}: FusionCaptionTabProps) {
  const [task, setTask] = useState<'t2v' | 'i2v'>('t2v');
  const [fusionOutput, setFusionOutput] = useState<string>('');
  const [cleanedPreview, setCleanedPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fusion-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuralCaption: jsonInput,
          task,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fusion failed');
      }
      setFusionOutput(data.caption);
      setCleanedPreview(JSON.stringify(data.cleaned, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!fusionOutput) return;
    await navigator.clipboard.writeText(fusionOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Dynamic Caption Fusion (T2V / I2V)</h2>
          <p className="text-sm text-slate-400">
            Cleans and composes structured JSON fields into natural prompts tailored for Text-to-Video (dense) or Image-to-Video (action-focused).
          </p>
        </div>
        {fusionOutput && (
          <button
            type="button"
            onClick={() => onUseInGenerator(fusionOutput, task)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            Use in Video Generator
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-200">Structural Caption JSON</label>
            <button
              type="button"
              onClick={() => onJsonInputChange(DEFAULT_FUSION_JSON)}
              className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer"
            >
              Load Example Input
            </button>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => onJsonInputChange(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-300">Task:</span>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="fusion-task"
                  value="t2v"
                  checked={task === 't2v'}
                  onChange={() => setTask('t2v')}
                  className="accent-sky-500"
                />
                t2v (Dense Caption)
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="fusion-task"
                  value="i2v"
                  checked={task === 'i2v'}
                  onChange={() => setTask('i2v')}
                  className="accent-sky-500"
                />
                i2v (Action &amp; Expression)
              </label>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Wand2 className="h-4 w-4" />
              {loading ? 'Composing...' : 'Generate Fusion Caption'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-800/70 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">Fusion Caption ({task.toUpperCase()})</span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!fusionOutput}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="min-h-[160px] rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100">
              {fusionOutput || 'Click "Generate Fusion Caption" to synthesize a natural prompt from the structured fields.'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cleaned Structural Payload ({task.toUpperCase()} Filter)
            </div>
            <pre className="max-h-[260px] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-sky-300">
              {cleanedPreview || '// Filtered fields produced by clean_struct_caption() will appear here'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
