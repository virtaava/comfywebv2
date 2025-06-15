import * as R from "remeda";
import type { DeepReadonly } from "ts-essentials";

import {
  NodeInputSchema,
  type ImageOutput,
  type LinkTypeId,
  type NodeLibrary,
  type PromptNodeInfo,
  type PromptRequest,
  type Workflow,
} from "./comfy";
import { WorkflowStep, type GraphMetadata } from "./workflow";

export const clientId = R.randomString(8);

export function getImageUrl(
  host: string,
  image: ImageOutput,
  maybeKey?: string,
): string {
  const key = maybeKey ? cyrb53(maybeKey) : Math.random();
  return `http://${host}/api/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}&rand=${key}`;
}

export function getPromptRequestUrl(host: string): string {
  return `http://${host}/api/prompt`;
}

export function getQueueRequestUrl(host: string): string {
  return `http://${host}/api/queue`;
}

export function getInterruptRequestUrl(host: string): string {
  return `http://${host}/api/interrupt`;
}

export function getObjectInfoUrl(host: string): string {
  return `http://${host}/api/object_info`;
}

export function getWsUrl(host: string): string {
  return `ws://${host}/ws?clientId=${clientId}`;
}

export function createComfyWorkflow(
  graph: DeepReadonly<GraphMetadata>,
): DeepReadonly<Workflow> {
  return {
    nodes: graph.nodes.map(([node]) => node),
    links: graph.edges.map((edge) => [
      edge.id,
      edge.source,
      edge.sourceSlot,
      edge.target,
      edge.targetSlot,
    ]),
  };
}

export function createPromptRequest(
  graph: DeepReadonly<GraphMetadata>,
  steps?: DeepReadonly<WorkflowStep[]>,
): PromptRequest {
  const workflow = createComfyWorkflow(graph);

  const prompt: Record<string, PromptNodeInfo> = {};

  for (const [node, item] of graph.nodes) {
    let inputs: Record<string, any> = {};
    if (WorkflowStep.isNode(item)) {
      inputs = R.clone(item.form);
    } else if (WorkflowStep.isPrimitive(item)) {
      inputs = { value: item.value };
    }

    for (const input of node.inputs ?? []) {
      const index = R.sortedIndexWith(
        graph.edges,
        (edge) => edge.id < input.link,
      );
      const edge = graph.edges[index];
      inputs[input.name] = [edge.source.toString(), edge.sourceSlot];
    }
    prompt[node.id.toString()] = {
      inputs,
      class_type: node.type,
    };
  }

  return {
    client_id: clientId,
    prompt,
    extra_data: {
      extra_pnginfo: {
        workflow,
        steps,
      },
    },
  };
}

export function patchLibrary(library: NodeLibrary) {
  for (const node of Object.values(library)) {
    for (const [name, schema] of Object.entries(node.input.required ?? {})) {
      if (
        NodeInputSchema.isLink(schema) &&
        name == "positive" &&
        schema[0] === "CONDITIONING"
      ) {
        schema[0] = "POSITIVE_CONDITIONING" as LinkTypeId;
      } else if (
        NodeInputSchema.isLink(schema) &&
        name == "negative" &&
        schema[0] === "CONDITIONING"
      ) {
        schema[0] = "NEGATIVE_CONDITIONING" as LinkTypeId;
      }
    }
  }
}

function cyrb53(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Interrupt the current generation via ComfyUI's interrupt endpoint
 */
export async function interruptGeneration(host: string): Promise<void> {
  const response = await fetch(`http://${host}/interrupt`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to interrupt generation: ${response.statusText}`);
  }
}

/**
 * Validate workflow with ComfyUI backend - follows original ComfyWeb pattern
 * Returns validation result with success/error details
 */
export interface WorkflowValidationResult {
  success: boolean;
  error?: string;
  missingNodes?: string[];
}

export async function validateWorkflowWithBackend(
  host: string,
  workflowData: string
): Promise<WorkflowValidationResult> {
  try {
    console.log('[Backend Validation] Attempting workflow validation with ComfyUI backend...');
    
    const response = await fetch(`http://${host}/api/prompt`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: workflowData
    });
    
    if (response.ok) {
      console.log('[Backend Validation] ✅ Workflow validation successful');
      return { success: true };
    } else {
      const errorText = await response.text();
      console.log('[Backend Validation] ❌ Workflow validation failed:', response.status, errorText);
      
      // Parse error for missing nodes
      const missingNodes = parseBackendErrorForMissingNodes(errorText);
      
      return { 
        success: false, 
        error: errorText,
        missingNodes: missingNodes.length > 0 ? missingNodes : undefined
      };
    }
  } catch (error) {
    console.error('[Backend Validation] ❌ Network/parsing error:', error);
    return { 
      success: false, 
      error: error.message || 'Network error during validation'
    };
  }
}

/**
 * Parse ComfyUI backend error messages to extract missing node types
 * Handles various error patterns from ComfyUI
 */
export function parseBackendErrorForMissingNodes(errorMessage: string): string[] {
  const missingNodes: string[] = [];
  
  try {
    // Try to parse as JSON error response first
    const errorData = JSON.parse(errorMessage);
    
    // Pattern 1: JSON error with node type info
    if (errorData.error && typeof errorData.error === 'string') {
      const nodeMatches = extractNodeTypesFromError(errorData.error);
      missingNodes.push(...nodeMatches);
    }
    
    // Pattern 2: Nested error structure
    if (errorData.node_errors) {
      for (const [nodeId, nodeError] of Object.entries(errorData.node_errors)) {
        if (typeof nodeError === 'string') {
          const nodeMatches = extractNodeTypesFromError(nodeError);
          missingNodes.push(...nodeMatches);
        }
      }
    }
  } catch (jsonError) {
    // Not JSON, treat as plain text error message
    const nodeMatches = extractNodeTypesFromError(errorMessage);
    missingNodes.push(...nodeMatches);
  }
  
  // Remove duplicates and return
  return [...new Set(missingNodes)];
}

/**
 * Extract node type names from error message text
 * Handles multiple ComfyUI error patterns
 */
function extractNodeTypesFromError(errorText: string): string[] {
  const nodeTypes: string[] = [];
  
  // Pattern 1: "Unknown node type: 'NodeName'"
  const unknownNodePattern = /Unknown node type: ['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = unknownNodePattern.exec(errorText)) !== null) {
    nodeTypes.push(match[1]);
  }
  
  // Pattern 2: "Cannot find node class: NodeName"
  const cannotFindPattern = /Cannot find node class: ([^\s,]+)/g;
  while ((match = cannotFindPattern.exec(errorText)) !== null) {
    nodeTypes.push(match[1]);
  }
  
  // Pattern 3: "Node type 'NodeName' not found"
  const notFoundPattern = /Node type ['"]([^'"]+)['"] not found/g;
  while ((match = notFoundPattern.exec(errorText)) !== null) {
    nodeTypes.push(match[1]);
  }
  
  // Pattern 4: "Missing node: NodeName"
  const missingNodePattern = /Missing node: ([^\s,]+)/g;
  while ((match = missingNodePattern.exec(errorText)) !== null) {
    nodeTypes.push(match[1]);
  }
  
  // Pattern 5: "Cannot execute because node NodeName does not exist"
  const cannotExecutePattern = /Cannot execute because node ([^\s]+) does not exist/g;
  while ((match = cannotExecutePattern.exec(errorText)) !== null) {
    nodeTypes.push(match[1]);
  }
  
  console.log('[Backend Validation] Extracted node types from error:', nodeTypes);
  return nodeTypes;
}
