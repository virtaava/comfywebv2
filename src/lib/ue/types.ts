// src/lib/ue/types.ts

import type { ComfyWorkflowJson, ComfyNode } from '$lib/types';

export interface VirtualNodeConverter {
  type: string;
  detect: (nodes: ComfyNode[]) => boolean;
  convert: (workflow: ComfyWorkflowJson) => ComfyWorkflowJson;
}
