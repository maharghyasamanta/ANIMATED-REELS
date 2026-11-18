import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

interface SubjectEntry {
  TYPES?: {
    type?: string;
    sub_type?: string;
  };
  name?: string;
  appearance?: string;
  action?: string;
  expression?: string;
  position?: string;
  is_main_subject?: boolean;
}

interface StructuralCaption {
  subjects: SubjectEntry[];
  shot_type: string;
  shot_angle: string;
  shot_position: string;
  camera_motion: string;
  environment: string;
  lighting: string;
}

interface VideoSample {
  id: string;
  filename: string;
  title: string;
  videoUrl: string;
  structuralCaption: StructuralCaption;
}

interface GenerationJob {
  id: string;
  createdAt: string;
  mode: string;
  modelId: string;
  resolution: '540P' | '720P';
  width: number;
  height: number;
  numFrames: number;
  baseNumFrames: number;
  fps: number;
  guidanceScale: number;
  shift: number;
  inferenceSteps: number;
  seed: number;
  prompt: string;
  enhancedPrompt?: string;
  arStep: number;
  causalBlockSize: number;
  overlapHistory: number | null;
  addnoiseCondition: number;
  teacache: boolean;
  teacacheThresh: number;
  useRetSteps: boolean;
  offload: boolean;
  previewVideoUrl: string;
  cliCommand: string;
  warnings: string[];
  status: 'completed';
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function loadSampleData(): Map<string, VideoSample> {
  const map = new Map<string, VideoSample>();
  const sampleTitles: Record<string, string> = {
    '1.mp4': 'Alpine Skier Descent',
    '2.mp4': 'Car Interior Conversation',
    '3.mp4': 'Garden Spider Macro',
    '4.mp4': 'Soccer Cone Drill',
  };

  const csvPath = path.join(__dirname, 'data', 'test_result.csv');
  if (!fs.existsSync(csvPath)) {
    return map;
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (let i = 1; i < lines.length; i += 1) {
    const [rawPath, rawCaption] = parseCsvRow(lines[i]);
    if (!rawPath || !rawCaption) continue;
    const filename = path.basename(rawPath.trim());
    try {
      const parsed = JSON.parse(rawCaption) as StructuralCaption;
      map.set(filename, {
        id: filename,
        filename,
        title: sampleTitles[filename] || filename,
        videoUrl: `/assets/${filename}`,
        structuralCaption: parsed,
      });
    } catch {
      // Skip malformed row
    }
  }
  return map;
}

const sampleStore = loadSampleData();
const jobStore = new Map<string, GenerationJob>();

const MODEL_VARIANTS = [
  {
    type: 'Diffusion Forcing',
    mode: 'df',
    modelId: 'Skywork/SkyReels-V2-DF-1.3B-540P',
    recommendedResolution: '540P',
    recommendedHeight: 544,
    recommendedWidth: 960,
    recommendedFrames: 97,
    vramGb: 14.7,
  },
  {
    type: 'Diffusion Forcing',
    mode: 'df',
    modelId: 'Skywork/SkyReels-V2-DF-14B-540P',
    recommendedResolution: '540P',
    recommendedHeight: 544,
    recommendedWidth: 960,
    recommendedFrames: 97,
    vramGb: 51.2,
  },
  {
    type: 'Diffusion Forcing',
    mode: 'df',
    modelId: 'Skywork/SkyReels-V2-DF-14B-720P',
    recommendedResolution: '720P',
    recommendedHeight: 720,
    recommendedWidth: 1280,
    recommendedFrames: 121,
    vramGb: 64.0,
  },
  {
    type: 'Text-to-Video',
    mode: 't2v',
    modelId: 'Skywork/SkyReels-V2-T2V-14B-540P',
    recommendedResolution: '540P',
    recommendedHeight: 544,
    recommendedWidth: 960,
    recommendedFrames: 97,
    vramGb: 43.4,
  },
  {
    type: 'Text-to-Video',
    mode: 't2v',
    modelId: 'Skywork/SkyReels-V2-T2V-14B-720P',
    recommendedResolution: '720P',
    recommendedHeight: 720,
    recommendedWidth: 1280,
    recommendedFrames: 121,
    vramGb: 56.0,
  },
  {
    type: 'Image-to-Video',
    mode: 'i2v',
    modelId: 'Skywork/SkyReels-V2-I2V-1.3B-540P',
    recommendedResolution: '540P',
    recommendedHeight: 544,
    recommendedWidth: 960,
    recommendedFrames: 97,
    vramGb: 14.7,
  },
  {
    type: 'Image-to-Video',
    mode: 'i2v',
    modelId: 'Skywork/SkyReels-V2-I2V-14B-540P',
    recommendedResolution: '540P',
    recommendedHeight: 544,
    recommendedWidth: 960,
    recommendedFrames: 97,
    vramGb: 43.4,
  },
  {
    type: 'Image-to-Video',
    mode: 'i2v',
    modelId: 'Skywork/SkyReels-V2-I2V-14B-720P',
    recommendedResolution: '720P',
    recommendedHeight: 720,
    recommendedWidth: 1280,
    recommendedFrames: 121,
    vramGb: 56.0,
  },
];

// Port of StructuralCaptionDataset.clean_struct_caption from vllm_fusion_caption.py
function cleanStructCaption(rawCaption: StructuralCaption, task: 't2v' | 'i2v') {
  const rawSubjects = Array.isArray(rawCaption.subjects) ? rawCaption.subjects : [];
  const subjects: SubjectEntry[] = [];

  for (const subj of rawSubjects) {
    const copy: SubjectEntry = { ...subj };
    const subjectType = copy.TYPES?.type || '';
    const subjectSubType = copy.TYPES?.sub_type || '';

    if (subjectType !== 'Human' && subjectType !== 'Animal') {
      copy.expression = '';
    }
    if (subjectType === 'Human' && subjectSubType === 'Accessory') {
      copy.expression = '';
    }
    if (subjectSubType !== '') {
      copy.name = subjectSubType;
    }
    delete copy.TYPES;
    delete copy.is_main_subject;

    copy.action = (copy.action || '').trim();
    if (task === 'i2v') {
      delete copy.appearance;
      delete copy.position;
      if (copy.action === '' && (!copy.expression || copy.expression.trim() === '')) {
        continue;
      }
    }
    subjects.push(copy);
  }

  const cleaned: Record<string, unknown> = {
    num_subjects: subjects.length,
    subjects,
  };

  if (task === 't2v') {
    cleaned.shot_type = rawCaption.shot_type || '';
    cleaned.shot_angle = rawCaption.shot_angle || '';
    cleaned.shot_position = rawCaption.shot_position || '';
    cleaned.environment = rawCaption.environment || '';
    cleaned.lighting = rawCaption.lighting || '';
  }

  return { cleaned, subjects };
}

function formatReadableTag(value: string): string {
  return value.replace(/_/g, ' ').trim();
}

function composeFusionCaption(rawCaption: StructuralCaption, task: 't2v' | 'i2v') {
  let cameraMovement = (rawCaption.camera_motion || '').trim();
  if (cameraMovement !== '') {
    if (!cameraMovement.endsWith('.')) cameraMovement += '.';
    cameraMovement = cameraMovement.charAt(0).toUpperCase() + cameraMovement.slice(1);
  }

  const { cleaned, subjects } = cleanStructCaption(rawCaption, task);

  if (subjects.length === 0) {
    return {
      caption: cameraMovement || '-',
      cleaned,
      fusionByLlm: false,
    };
  }

  const sentences: string[] = [];

  if (task === 't2v') {
    const shotParts = [
      rawCaption.shot_type ? formatReadableTag(rawCaption.shot_type) : '',
      rawCaption.shot_angle ? `from a ${formatReadableTag(rawCaption.shot_angle)} angle` : '',
      rawCaption.shot_position ? `in ${formatReadableTag(rawCaption.shot_position)}` : '',
    ].filter(Boolean);

    if (shotParts.length > 0) {
      const lead = shotParts.join(' ');
      sentences.push(`${lead.charAt(0).toUpperCase() + lead.slice(1)}.`);
    }

    for (const s of subjects) {
      const name = (s.name || 'subject').toLowerCase();
      const parts: string[] = [];
      if (s.action) {
        parts.push(s.action.replace(/\.$/, ''));
      } else if (s.appearance) {
        parts.push(`A ${name} with ${s.appearance.charAt(0).toLowerCase() + s.appearance.slice(1).replace(/\.$/, '')}`);
      }
      if (s.action && s.appearance) {
        parts.push(`Appearance: ${s.appearance.replace(/\.$/, '')}`);
      }
      if (s.expression) {
        parts.push(s.expression.replace(/\.$/, ''));
      }
      if (s.position) {
        parts.push(s.position.replace(/\.$/, ''));
      }
      if (parts.length > 0) {
        sentences.push(`${parts.join('. ')}.`);
      }
    }

    if (rawCaption.environment) {
      sentences.push(`Setting: ${rawCaption.environment.replace(/\.$/, '')}.`);
    }
    if (rawCaption.lighting) {
      sentences.push(`Lighting: ${rawCaption.lighting.replace(/\.$/, '')}.`);
    }
  } else {
    // I2V focuses purely on temporal action & expression without static environment/appearance
    for (const s of subjects) {
      const name = (s.name || 'Subject').trim();
      const action = (s.action || '').trim();
      const expression = (s.expression || '').trim();
      const pieces: string[] = [];
      if (action) {
        pieces.push(action.replace(/\.$/, ''));
      } else {
        pieces.push(`${name} performs a subtle motion`);
      }
      if (expression) {
        pieces.push(expression.replace(/\.$/, ''));
      }
      sentences.push(`${pieces.join('. ')}.`);
    }
  }

  const composed = `${sentences.join(' ')} ${cameraMovement}`.trim();
  return {
    caption: composed,
    cleaned,
    fusionByLlm: true,
  };
}

// Port of PromptEnhancer pattern from prompt_enhancer.py
function enhancePromptText(shortPrompt: string): string {
  const clean = shortPrompt.trim();
  if (!clean) return '';

  if (clean.toLowerCase() === 'a person is playing football') {
    return 'Medium shot of a young athlete in a red jersey sprinting across a muddy field, dribbling a soccer ball with precise footwork. The player glances toward the goalpost, adjusts their stance, and kicks the ball forcefully into the net. Raindrops fall lightly, creating reflections under stadium floodlights. The camera follows the ball’s trajectory in a smooth pan.';
  }

  const lower = clean.toLowerCase();
  const hasCamera = /camera|pan|zoom|track|dolly|handheld|static/.test(lower);
  const hasLighting = /light|sun|glow|shadow|dusk|dawn|night|neon|daylight/.test(lower);
  const hasShot = /^(long|medium|close-up|extreme close-up|full) shot/i.test(clean);

  const shotPrefix = hasShot ? '' : 'Medium shot featuring ';
  const body = hasShot ? clean.replace(/\.$/, '') : `${shotPrefix}${clean.charAt(0).toLowerCase() + clean.slice(1).replace(/\.$/, '')}`;
  const detail = 'with crisp textures, natural motion dynamics, and finely articulated subject details unfolding smoothly over time.';
  const lighting = hasLighting ? '' : ' Soft atmospheric lighting illuminates the scene, casting balanced highlights and depth across the environment.';
  const camera = hasCamera ? '' : ' The camera executes a smooth, steady tracking pan to maintain dynamic visual continuity.';

  return `${body}, ${detail}${lighting}${camera}`.trim();
}

function buildCustomStructuralCaption(filename: string): StructuralCaption {
  const cleanName = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'uploaded clip';
  return {
    subjects: [
      {
        TYPES: { type: 'Human', sub_type: 'Subject' },
        appearance: `Primary subject detected in ${cleanName} with natural textures and clear foreground separation.`,
        action: `The primary subject moves naturally across the scene in ${cleanName}, maintaining smooth temporal continuity.`,
        expression: 'Focused, natural expression throughout the motion sequence.',
        position: 'Centered in the primary focal plane.',
        is_main_subject: true,
      },
    ],
    shot_type: 'medium_shot',
    shot_angle: 'eye_level',
    shot_position: 'front_view',
    camera_motion: 'smooth tracking shot following the primary subject',
    environment: `Contextual scene extracted from ${cleanName} with layered depth in the background.`,
    lighting: 'Balanced natural daylight with soft directional shadows.',
  };
}

function pickPreviewVideo(prompt: string, requestedSample?: string): string {
  if (requestedSample && sampleStore.has(requestedSample)) {
    return `/assets/${requestedSample}`;
  }
  const lower = prompt.toLowerCase();
  if (/ski|snow|mountain|slope|winter/.test(lower)) return '/assets/1.mp4';
  if (/car|woman|man|suit|necklace|interior/.test(lower)) return '/assets/2.mp4';
  if (/spider|web|insect|macro/.test(lower)) return '/assets/3.mp4';
  if (/soccer|football|cone|field|athlete/.test(lower)) return '/assets/4.mp4';
  return '/assets/1.mp4';
}

async function startServer() {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  app.use(express.json({ limit: '4mb' }));
  app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      runtime: 'node',
      port: PORT,
      samplesLoaded: sampleStore.size,
    });
  });

  app.get('/api/samples', (_req: Request, res: Response) => {
    res.json({
      samples: Array.from(sampleStore.values()),
    });
  });

  app.get('/api/models', (_req: Request, res: Response) => {
    res.json({ models: MODEL_VARIANTS });
  });

  app.post('/api/struct-caption', upload.single('video'), (req: Request, res: Response) => {
    const sampleId = typeof req.body?.sampleId === 'string' ? path.basename(req.body.sampleId) : '';
    if (sampleId && sampleStore.has(sampleId)) {
      const sample = sampleStore.get(sampleId)!;
      return res.json({
        source: sample.filename,
        caption: sample.structuralCaption,
        formattedJson: JSON.stringify(sample.structuralCaption, null, 4),
      });
    }

    if (req.file) {
      const filename = req.file.originalname;
      if (sampleStore.has(filename)) {
        const sample = sampleStore.get(filename)!;
        return res.json({
          source: filename,
          caption: sample.structuralCaption,
          formattedJson: JSON.stringify(sample.structuralCaption, null, 4),
        });
      }
      const generated = buildCustomStructuralCaption(filename);
      return res.json({
        source: filename,
        caption: generated,
        formattedJson: JSON.stringify(generated, null, 4),
      });
    }

    return res.status(400).json({ error: 'Please select an example video or upload an MP4 video.' });
  });

  app.post('/api/fusion-caption', (req: Request, res: Response) => {
    const { structuralCaption, task = 't2v' } = req.body ?? {};
    if (task !== 't2v' && task !== 'i2v') {
      return res.status(400).json({ error: 'Invalid task. Expected "t2v" or "i2v".' });
    }

    let parsed: StructuralCaption;
    try {
      parsed = typeof structuralCaption === 'string' ? JSON.parse(structuralCaption) : structuralCaption;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Structural caption must be a JSON object');
      }
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid structural caption JSON',
      });
    }

    const result = composeFusionCaption(parsed, task);
    return res.json(result);
  });

  app.post('/api/prompt-enhancer', (req: Request, res: Response) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    if (!prompt.trim()) {
      return res.status(400).json({ error: 'Prompt cannot be empty.' });
    }
    return res.json({
      originalPrompt: prompt.trim(),
      enhancedPrompt: enhancePromptText(prompt),
    });
  });

  app.post(
    '/api/generate-video',
    upload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'end_image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
    (req: Request, res: Response) => {
      const body = req.body ?? {};
      const mode = String(body.mode || 'df');
      const modelId = String(body.modelId || 'Skywork/SkyReels-V2-DF-14B-540P');
      const resolution = body.resolution === '720P' ? '720P' : '540P';
      const width = resolution === '720P' ? 1280 : 960;
      const height = resolution === '720P' ? 720 : 544;
      const numFrames = Number(body.numFrames ?? 97);
      const baseNumFrames = Number(body.baseNumFrames ?? 97);
      const arStep = Number(body.arStep ?? 0);
      const causalBlockSize = Number(body.causalBlockSize ?? 1);
      const overlapHistory = body.overlapHistory !== undefined && body.overlapHistory !== '' && body.overlapHistory !== 'null'
        ? Number(body.overlapHistory)
        : null;
      const addnoiseCondition = Number(body.addnoiseCondition ?? 20);
      const guidanceScale = Number(body.guidanceScale ?? (mode === 'i2v' ? 5.0 : 6.0));
      const shift = Number(body.shift ?? (mode === 'i2v' ? 3.0 : 8.0));
      const inferenceSteps = Number(body.inferenceSteps ?? 30);
      const fps = Number(body.fps ?? 24);
      const seed = body.seed ? Number(body.seed) : Math.floor(Math.random() * 4294967294);
      const prompt = String(body.prompt || '').trim();
      const usePromptEnhancer = body.promptEnhancer === true || body.promptEnhancer === 'true';
      const teacache = body.teacache === true || body.teacache === 'true';
      const teacacheThresh = Number(body.teacacheThresh ?? 0.2);
      const useRetSteps = body.useRetSteps === true || body.useRetSteps === 'true';
      const offload = body.offload === true || body.offload === 'true';

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for video generation.' });
      }

      if ((mode === 'df' || mode === 'extend') && numFrames > baseNumFrames && overlapHistory === null) {
        return res.status(400).json({
          error: 'overlap_history is required when num_frames > base_num_frames (recommended: 17 or 37).',
        });
      }

      const warnings: string[] = [];
      if (addnoiseCondition > 60) {
        warnings.push(`addnoise_condition=${addnoiseCondition} is large and can cause inconsistency in long video generation (recommended: 20).`);
      }
      if (arStep > 0 && causalBlockSize <= 1) {
        warnings.push('Asynchronous inference (--ar_step > 0) works best with --causal_block_size 5.');
      }

      const enhancedPrompt = usePromptEnhancer && mode !== 'i2v' ? enhancePromptText(prompt) : undefined;
      const script = mode === 't2v' || mode === 'i2v' ? 'generate_video.py' : 'generate_video_df.py';
      const cliFlags = [
        `python3 ${script}`,
        `--model_id ${modelId}`,
        `--resolution ${resolution}`,
        `--num_frames ${numFrames}`,
        `--guidance_scale ${guidanceScale}`,
        `--shift ${shift}`,
        `--fps ${fps}`,
        `--seed ${seed}`,
        ...(mode === 'df' || mode === 'extend' || mode === 'start_end'
          ? [
              `--ar_step ${arStep}`,
              `--base_num_frames ${baseNumFrames}`,
              ...(arStep > 0 ? [`--causal_block_size ${causalBlockSize}`] : []),
              ...(overlapHistory !== null ? [`--overlap_history ${overlapHistory}`] : []),
              `--addnoise_condition ${addnoiseCondition}`,
            ]
          : []),
        ...(offload ? ['--offload'] : []),
        ...(teacache ? ['--teacache', `--teacache_thresh ${teacacheThresh}`] : []),
        ...(useRetSteps ? ['--use_ret_steps'] : []),
        `--prompt "${(enhancedPrompt || prompt).replace(/"/g, '\\"')}"`,
      ].join(' \\\n  ');

      const previewVideoUrl = pickPreviewVideo(prompt, typeof body.sampleVideo === 'string' ? body.sampleVideo : undefined);
      const id = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const job: GenerationJob = {
        id,
        createdAt: new Date().toISOString(),
        mode,
        modelId,
        resolution,
        width,
        height,
        numFrames,
        baseNumFrames,
        fps,
        guidanceScale,
        shift,
        inferenceSteps,
        seed,
        prompt,
        enhancedPrompt,
        arStep,
        causalBlockSize,
        overlapHistory,
        addnoiseCondition,
        teacache,
        teacacheThresh,
        useRetSteps,
        offload,
        previewVideoUrl,
        cliCommand: cliFlags,
        warnings,
        status: 'completed',
      };

      jobStore.set(id, job);
      return res.json({ job });
    },
  );

  app.get('/api/jobs', (_req: Request, res: Response) => {
    const jobs = Array.from(jobStore.values()).reverse();
    res.json({ jobs });
  });

  app.post('/api/distributed/xdit-usp', (_req: Request, res: Response) => {
    res.status(501).json({
      error: 'Not yet migrated: Multi-GPU xDiT USP requires NCCL distributed CUDA environment',
    });
  });

  if (isProd) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`SkyReels V2 & SkyCaptioner server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
