export interface SubjectEntry {
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

export interface StructuralCaption {
  subjects: SubjectEntry[];
  shot_type: string;
  shot_angle: string;
  shot_position: string;
  camera_motion: string;
  environment: string;
  lighting: string;
}

export interface VideoSample {
  id: string;
  filename: string;
  title: string;
  videoUrl: string;
  structuralCaption: StructuralCaption;
}

export interface ModelVariant {
  type: string;
  mode: string;
  modelId: string;
  recommendedResolution: '540P' | '720P';
  recommendedHeight: number;
  recommendedWidth: number;
  recommendedFrames: number;
  vramGb: number;
}

export interface GenerationJob {
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
