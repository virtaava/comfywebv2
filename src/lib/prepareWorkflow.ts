import type { ComfyWorkflow } from "./comfy";
import { convertAllVirtualNodes } from "./ue/registry";
import { loadFromComfyWorkflow } from "./workflow";
import type { NodeLibrary } from "./comfy";

/**
 * Fully prepares a ComfyUI workflow for frontend use.
 * - Converts virtual nodes (SetNode/GetNode, Use Everywhere, etc.) into direct links
 * - Ensures slot_index fallbacks work (requires patched workflow.ts)
 *
 * @param rawWorkflow Original ComfyUI workflow JSON
 * @param library Node library loaded from backend
 * @returns Processed WorkflowStep[] array
 */
export async function prepareComfyWorkflow(rawWorkflow: ComfyWorkflow, library: NodeLibrary) {
  const converted = await convertAllVirtualNodes(rawWorkflow);
  return loadFromComfyWorkflow(converted, library);
}
