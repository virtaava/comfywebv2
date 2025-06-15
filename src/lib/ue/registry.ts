// src/lib/ue/registry.ts

import type { ComfyWorkflowJson } from '$lib/types';
import type { VirtualNodeConverter } from './types';
import { setGetNodeConverter } from './virtual-converters/setGetNodeConverter';
import { ueNodesConverter } from './virtual-converters/ueNodesConverter';

export const VIRTUAL_NODE_CONVERTERS: VirtualNodeConverter[] = [
  setGetNodeConverter,    // KJNodes SetNode/GetNode
  ueNodesConverter,       // UE virtual nodes (SeedEverywhere, AnythingEverywhere, etc.)
  // Add future converters here
];

export async function convertAllVirtualNodes(workflow: ComfyWorkflowJson): Promise<ComfyWorkflowJson> {
  let patched = { ...workflow };
  for (const converter of VIRTUAL_NODE_CONVERTERS) {
    if (converter.detect(patched.nodes)) {
      console.log(`[Virtual Nodes] Converting ${converter.type} nodes...`);
      patched = await converter.convert(patched);
    }
  }
  return patched;
}
