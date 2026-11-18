import React from 'react';
import type { ModelVariant } from '../types';

interface BenchmarksTabProps {
  models: ModelVariant[];
}

const CAPTIONER_METRICS = [
  { metric: 'Avg accuracy', q7b: '51.4%', q72b: '58.7%', tarsier: '49.4%', sky: '76.3%' },
  { metric: 'shot type', q7b: '76.8%', q72b: '82.5%', tarsier: '60.2%', sky: '93.7%' },
  { metric: 'shot angle', q7b: '60.0%', q72b: '73.7%', tarsier: '52.4%', sky: '89.8%' },
  { metric: 'shot position', q7b: '28.4%', q72b: '32.7%', tarsier: '23.6%', sky: '83.1%' },
  { metric: 'camera motion', q7b: '62.0%', q72b: '61.2%', tarsier: '45.3%', sky: '85.3%' },
  { metric: 'expression', q7b: '43.6%', q72b: '51.5%', tarsier: '54.3%', sky: '68.8%' },
  { metric: 'TYPES_type', q7b: '43.5%', q72b: '49.7%', tarsier: '47.6%', sky: '82.5%' },
  { metric: 'TYPES_sub_type', q7b: '38.9%', q72b: '44.9%', tarsier: '45.9%', sky: '75.4%' },
  { metric: 'action', q7b: '32.4%', q72b: '52.0%', tarsier: '69.8%', sky: '68.8%' },
  { metric: 'is_main_subject', q7b: '58.5%', q72b: '68.7%', tarsier: '69.7%', sky: '80.9%' },
];

const VBENCH_METRICS = [
  { model: 'OpenSora 2.0', total: '81.5%', quality: '82.1%', semantic: '78.2%' },
  { model: 'CogVideoX1.5-5B', total: '80.3%', quality: '80.9%', semantic: '77.9%' },
  { model: 'HunyuanVideo-13B', total: '82.7%', quality: '84.4%', semantic: '76.2%' },
  { model: 'Wan2.1-14B', total: '83.7%', quality: '84.2%', semantic: '81.4%' },
  { model: 'SkyReels-V2', total: '83.9%', quality: '84.7%', semantic: '80.8%' },
];

export function BenchmarksTab({ models }: BenchmarksTabProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">SkyReels-V2 Architecture Pipeline</h2>
          <p className="text-sm text-slate-400">
            Data processing via SkyCaptioner-V1, multi-task pretraining, RL motion optimization, and Diffusion Forcing for infinite-length film synthesis.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-white">
          <img
            src="/assets/main_pipeline.jpg"
            alt="SkyReels-V2 Main Pipeline Architecture"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <h3 className="text-base font-semibold text-white">SkyCaptioner-V1 Benchmark Accuracy</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 px-2">Qwen2.5-VL-7B</th>
                  <th className="py-2 px-2">Qwen2.5-VL-72B</th>
                  <th className="py-2 px-2">Tarsier2-7B</th>
                  <th className="py-2 pl-2 text-sky-400">SkyCaptioner-V1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {CAPTIONER_METRICS.map((row) => (
                  <tr key={row.metric}>
                    <td className="py-2 pr-3 font-medium text-slate-200">{row.metric}</td>
                    <td className="py-2 px-2">{row.q7b}</td>
                    <td className="py-2 px-2">{row.q72b}</td>
                    <td className="py-2 px-2">{row.tarsier}</td>
                    <td className="py-2 pl-2 font-semibold text-sky-300">{row.sky}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
            <h3 className="text-base font-semibold text-white">VBench Automated Evaluation</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">Model</th>
                    <th className="py-2 px-2">Total Score</th>
                    <th className="py-2 px-2">Quality Score</th>
                    <th className="py-2 pl-2">Semantic Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {VBENCH_METRICS.map((row) => (
                    <tr key={row.model} className={row.model === 'SkyReels-V2' ? 'text-sky-300 font-semibold' : ''}>
                      <td className="py-2 pr-3">{row.model}</td>
                      <td className="py-2 px-2">{row.total}</td>
                      <td className="py-2 px-2">{row.quality}</td>
                      <td className="py-2 pl-2">{row.semantic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
            <h3 className="text-base font-semibold text-white">Supported Model Variants</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 px-2">Model ID</th>
                    <th className="py-2 px-2">Spec</th>
                    <th className="py-2 pl-2">VRAM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {models.map((m) => (
                    <tr key={m.modelId}>
                      <td className="py-2 pr-3 text-slate-400">{m.type}</td>
                      <td className="py-2 px-2 font-mono text-[11px] text-slate-200">{m.modelId}</td>
                      <td className="py-2 px-2">
                        {m.recommendedHeight}x{m.recommendedWidth} ({m.recommendedFrames}f)
                      </td>
                      <td className="py-2 pl-2">{m.vramGb} GB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
