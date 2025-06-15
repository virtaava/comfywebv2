// src/lib/ue/virtual-converters/ueNodesConverter.ts

import type { ComfyWorkflowJson, ComfyNode } from '$lib/types';
import type { VirtualNodeConverter } from '../types';
import { analyzeWorkflowForUE } from '../../ue-detection';
import { convertUEWorkflow, getDefaultConversionOptions } from '../../ue-converter';

export const ueNodesConverter: VirtualNodeConverter = {
  type: "UE Nodes",

  detect(nodes: ComfyNode[]): boolean {
    // Create minimal workflow structure for detection
    const mockWorkflow = { nodes, links: [] };
    const analysis = analyzeWorkflowForUE(mockWorkflow);
    return analysis.hasUENodes && analysis.conversionRequired;
  },

  async convert(workflow: ComfyWorkflowJson): Promise<ComfyWorkflowJson> {
    try {
      const analysis = analyzeWorkflowForUE(workflow);
      
      if (!analysis.hasUENodes) {
        console.log('[UE Converter] No UE nodes detected, skipping conversion');
        return workflow;
      }

      console.log(`[UE Converter] Converting ${analysis.ueNodes.length} UE nodes with ${analysis.virtualConnections} virtual connections`);
      
      const result = await convertUEWorkflow(workflow, analysis, getDefaultConversionOptions());
      
      if (result.success) {
        console.log(`[UE Converter] Success: ${result.changes.length} changes, ${result.addedLinks} links added, ${result.removedNodes.length} nodes removed`);
        return result.convertedWorkflow;
      } else {
        console.warn(`[UE Converter] Failed: ${result.error}`);
        return workflow;
      }
    } catch (error) {
      console.error('[UE Converter] Error during conversion:', error);
      return workflow;
    }
  }
};
