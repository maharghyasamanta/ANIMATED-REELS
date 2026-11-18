import React, { useState, useEffect } from 'react';
import { Captions, GitMerge, Video, BarChart3 } from 'lucide-react';
import type { ModelVariant, VideoSample } from './types';
import { StructCaptionTab } from './components/StructCaptionTab';
import { FusionCaptionTab, DEFAULT_FUSION_JSON } from './components/FusionCaptionTab';
import { VideoGeneratorTab } from './components/VideoGeneratorTab';
import { BenchmarksTab } from './components/BenchmarksTab';

type ActiveTab = 'struct' | 'fusion' | 'generate' | 'benchmarks';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('struct');
  const [samples, setSamples] = useState<VideoSample[]>([]);
  const [models, setModels] = useState<ModelVariant[]>([]);
  const [fusionJson, setFusionJson] = useState<string>(DEFAULT_FUSION_JSON);
  const [generatorPrompt, setGeneratorPrompt] = useState<string | undefined>(undefined);
  const [generatorMode, setGeneratorMode] = useState<'t2v' | 'i2v' | 'df' | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/samples').then((r) => r.json()),
      fetch('/api/models').then((r) => r.json()),
    ])
      .then(([samplesRes, modelsRes]) => {
        if (Array.isArray(samplesRes.samples)) setSamples(samplesRes.samples);
        if (Array.isArray(modelsRes.models)) setModels(modelsRes.models);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSendToFusion = (jsonText: string) => {
    setFusionJson(jsonText);
    setActiveTab('fusion');
  };

  const handleUseInGenerator = (prompt: string, task: 't2v' | 'i2v') => {
    setGeneratorPrompt(prompt);
    setGeneratorMode(task);
    setActiveTab('generate');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/assets/logo2.png" alt="SkyReels V2 Logo" className="h-9 w-auto rounded bg-white/95 px-2 py-1" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">SkyReels V2 &amp; SkyCaptioner</h1>
              <p className="text-xs text-slate-400">Structural Video Captioning · Caption Fusion · Diffusion Forcing</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1.5">
            {[
              { id: 'struct', label: 'Structural Captioner', icon: Captions },
              { id: 'fusion', label: 'Caption Fusion', icon: GitMerge },
              { id: 'generate', label: 'Video Generator', icon: Video },
              { id: 'benchmarks', label: 'Pipeline & Benchmarks', icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-slate-400">
            Loading SkyReels V2 &amp; SkyCaptioner workspace...
          </div>
        ) : (
          <>
            {activeTab === 'struct' && (
              <StructCaptionTab samples={samples} onSendToFusion={handleSendToFusion} />
            )}
            {activeTab === 'fusion' && (
              <FusionCaptionTab
                jsonInput={fusionJson}
                onJsonInputChange={setFusionJson}
                onUseInGenerator={handleUseInGenerator}
              />
            )}
            {activeTab === 'generate' && (
              <VideoGeneratorTab
                models={models}
                samples={samples}
                initialPrompt={generatorPrompt}
                initialMode={generatorMode}
              />
            )}
            {activeTab === 'benchmarks' && <BenchmarksTab models={models} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
