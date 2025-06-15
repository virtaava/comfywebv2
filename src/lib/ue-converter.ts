/**
 * ComfyWeb v2 - UE (Use Everywhere) Converter Engine
 * 
 * Converts UE virtual links to real links for backend compatibility.
 * Based on cg-use-everywhere extension "Convert to real links" functionality.
 */

import type { UENodeInfo, UEAnalysisResult } from './ue-detection';

export interface ConversionResult {
  success: boolean;
  convertedWorkflow?: any;
  error?: string;
  changes: string[];
  warnings: string[];
  removedNodes: string[];
  addedLinks: number;
}

export interface ConversionOptions {
  method: 'convert' | 'strip' | 'preserve';
  removeUENodes: boolean;
  preserveVisual: boolean;
  handleRegexNodes: 'convert' | 'remove' | 'preserve';
}

/**
 * Main function to convert UE workflow to backend-compatible format
 */
export async function convertUEWorkflow(
  workflowJson: any, 
  ueAnalysis: UEAnalysisResult,
  options: ConversionOptions = {
    method: 'convert',
    removeUENodes: true,
    preserveVisual: false,
    handleRegexNodes: 'convert'
  }
): Promise<ConversionResult> {
  
  console.log('[UE Converter] Starting conversion with options:', options);
  
  const result: ConversionResult = {
    success: false,
    changes: [],
    warnings: [],
    removedNodes: [],
    addedLinks: 0
  };

  try {
    // Deep clone the workflow to avoid modifying original
    const convertedWorkflow = JSON.parse(JSON.stringify(workflowJson));
    
    if (!ueAnalysis.hasUENodes) {
      result.success = true;
      result.convertedWorkflow = convertedWorkflow;
      result.changes.push('No UE nodes found - no conversion needed');
      return result;
    }

    // Process each UE node based on conversion method
    for (const ueNode of ueAnalysis.ueNodes) {
      await processUENode(convertedWorkflow, ueNode, options, result);
    }

    // Clean up workflow structure
    if (options.removeUENodes) {
      cleanupRemovedNodes(convertedWorkflow, result);
    }

    result.success = true;
    result.convertedWorkflow = convertedWorkflow;
    
    console.log('[UE Converter] Conversion completed:', {
      changes: result.changes.length,
      warnings: result.warnings.length,
      removedNodes: result.removedNodes.length,
      addedLinks: result.addedLinks
    });

  } catch (error) {
    console.error('[UE Converter] Conversion failed:', error);
    result.error = error.message;
    result.warnings.push(`Conversion failed: ${error.message}`);
  }

  return result;
}

/**
 * Process individual UE node based on type and options
 */
async function processUENode(
  workflow: any,
  ueNode: UENodeInfo,
  options: ConversionOptions,
  result: ConversionResult
): Promise<void> {
  
  console.log(`[UE Converter] Processing ${ueNode.type} node (${ueNode.id})`);

  switch (ueNode.type) {
    case 'SeedEverywhere':
    case 'Seed Everywhere':
      await convertSeedEverywhere(workflow, ueNode, options, result);
      break;
      
    case 'AnythingEverywhere':
    case 'Anything Everywhere':
      await convertAnythingEverywhere(workflow, ueNode, options, result);
      break;
      
    case 'AnythingEverywherePrompts':
    case 'Prompts Everywhere':
      await convertPromptsEverywhere(workflow, ueNode, options, result);
      break;
      
    case 'AnythingEverywhereTriplet':
    case 'Anything Everywhere3':
      await convertAnythingEverywhere3(workflow, ueNode, options, result);
      break;
      
    case 'AnythingSomewhere':
    case 'Anything Everywhere?':
      await convertAnythingSomewhere(workflow, ueNode, options, result);
      break;
      
    case 'SimpleString':
      await convertSimpleString(workflow, ueNode, options, result);
      break;
      
    default:
      result.warnings.push(`Unknown UE node type: ${ueNode.type}`);
  }
}

// Conversion functions for each UE node type
async function convertSeedEverywhere(workflow: any, ueNode: UENodeInfo, options: ConversionOptions, result: ConversionResult): Promise<void> {
  const sourceNode = findNodeById(workflow, ueNode.id);
  if (!sourceNode) {
    result.warnings.push(`Source node ${ueNode.id} not found`);
    return;
  }

  const seedInput = sourceNode.inputs?.find((input: any) => input.name === 'seed' && input.link);
  if (!seedInput) {
    result.warnings.push(`SeedEverywhere node ${ueNode.id} has no seed input`);
    return;
  }

  const targetNodes = findSeedTargets(workflow, ueNode.id);
  for (const target of targetNodes) {
    const seedInputIndex = target.inputs.findIndex((input: any) => 
      input.name?.toLowerCase().includes('seed') && !input.link
    );
    
    if (seedInputIndex >= 0) {
      const newLink = createLink(workflow, seedInput.link, target.id, seedInputIndex);
      if (newLink) {
        target.inputs[seedInputIndex].link = newLink.id;
        result.addedLinks++;
        result.changes.push(`Connected seed to ${target.type || target.id}`);
      }
    }
  }

  if (options.removeUENodes) {
    markNodeForRemoval(sourceNode, result);
  }
}

async function convertAnythingEverywhere(workflow: any, ueNode: UENodeInfo, options: ConversionOptions, result: ConversionResult): Promise<void> {
  const sourceNode = findNodeById(workflow, ueNode.id);
  if (!sourceNode) {
    result.warnings.push(`Source node ${ueNode.id} not found`);
    return;
  }

  const connectedInput = sourceNode.inputs?.find((input: any) => input.link);
  if (!connectedInput) {
    result.warnings.push(`AnythingEverywhere node ${ueNode.id} has no connected input`);
    return;
  }

  const sourceLink = findLinkById(workflow, connectedInput.link);
  if (!sourceLink) {
    result.warnings.push(`Source link ${connectedInput.link} not found`);
    return;
  }

  const targetNodes = findAnythingTargets(workflow, sourceLink.type, ueNode.id);
  for (const target of targetNodes) {
    const matchingInputIndex = target.inputs.findIndex((input: any) => 
      input.type === sourceLink.type && !input.link
    );
    
    if (matchingInputIndex >= 0) {
      const newLink = createLink(workflow, connectedInput.link, target.id, matchingInputIndex);
      if (newLink) {
        target.inputs[matchingInputIndex].link = newLink.id;
        result.addedLinks++;
        result.changes.push(`Connected ${sourceLink.type} to ${target.type || target.id}`);
      }
    }
  }

  if (options.removeUENodes) {
    markNodeForRemoval(sourceNode, result);
  }
}

async function convertPromptsEverywhere(workflow: any, ueNode: UENodeInfo, options: ConversionOptions, result: ConversionResult): Promise<void> {
  const sourceNode = findNodeById(workflow, ueNode.id);
  if (!sourceNode) {
    result.warnings.push(`Source node ${ueNode.id} not found`);
    return;
  }

  const positiveInput = sourceNode.inputs?.find((input: any) => input.name === '+ve' && input.link);
  if (positiveInput) {
    const positiveTargets = findPromptTargets(workflow, 'positive', ueNode.id);
    await connectPromptTargets(workflow, positiveInput.link, positiveTargets, 'positive', result);
  }

  const negativeInput = sourceNode.inputs?.find((input: any) => input.name === '-ve' && input.link);
  if (negativeInput) {
    const negativeTargets = findPromptTargets(workflow, 'negative', ueNode.id);
    await connectPromptTargets(workflow, negativeInput.link, negativeTargets, 'negative', result);
  }

  if (options.removeUENodes) {
    markNodeForRemoval(sourceNode, result);
  }
}

async function convertAnythingEverywhere3(workflow: any, ueNode: UENodeInfo, options: ConversionOptions, result: ConversionResult): Promise<void> {
  const sourceNode = findNodeById(workflow, ueNode.id);
  if (!sourceNode) {
    result.warnings.push(`Source node ${ueNode.id} not found`);
    return;
  }

  for (let i = 0; i < 3; i++) {
    const input = sourceNode.inputs?.[i];
    if (input && input.link) {
      const sourceLink = findLinkById(workflow, input.link);
      if (sourceLink) {
        const targetNodes = findAnythingTargets(workflow, sourceLink.type, ueNode.id);
        for (const target of targetNodes) {
          const matchingInputIndex = target.inputs.findIndex((inp: any) => 
            inp.type === sourceLink.type && !inp.link
          );
          
          if (matchingInputIndex >= 0) {
            const newLink = createLink(workflow, input.link, target.id, matchingInputIndex);
            if (newLink) {
              target.inputs[matchingInputIndex].link = newLink.id;
              result.addedLinks++;
              result.changes.push(`Connected ${sourceLink.type} (slot ${i}) to ${target.type || target.id}`);
            }
          }
        }
      }
    }
  }

  if (options.removeUENodes) {
    markNodeForRemoval(sourceNode, result);
  }
}

async function convertAnythingSomewhere(workflow: any, ueNode: UENodeInfo, options: ConversionOptions, result: ConversionResult): Promise<void> {
  const sourceNode = findNodeById(workflow, ueNode.id);
  if (!sourceNode) {
    result.warnings.push(`Source node ${ueNode.id} not found`);
    return;
  }

  const connectedInput = sourceNode.inputs?.find((input: any) => input.link);
  if (!connectedInput) {
    result.warnings.push(`AnythingSomewhere node ${ueNode.id} has no connected input`);
    return;
  }

  const sourceLink = findLinkById(workflow, connectedInput.link);
  if (!sourceLink) {
    result.warnings.push(`Source link ${connectedInput.link} not found`);
    return;
  }

  const regexRules = ueNode.regexRules || { title: '.*', input: '.*', group: '.*' };
  const targetNodes = findRegexTargets(workflow, sourceLink.type, regexRules, ueNode.id);
  
  for (const target of targetNodes) {
    const matchingInputIndex = target.inputs.findIndex((input: any) => 
      input.type === sourceLink.type && !input.link && matchesRegex(input.name, regexRules.input)
    );
    
    if (matchingInputIndex >= 0) {
      const newLink = createLink(workflow, connectedInput.link, target.id, matchingInputIndex);
      if (newLink) {
        target.inputs[matchingInputIndex].link = newLink.id;
        result.addedLinks++;
        result.changes.push(`Connected ${sourceLink.type} to ${target.type || target.id} (regex match)`);
      }
    }
  }

  if (options.removeUENodes) {
    markNodeForRemoval(sourceNode, result);
  }
}

async function convertSimpleString(workflow: any, ueNode: UENodeInfo, options: ConversionOptions, result: ConversionResult): Promise<void> {
  const sourceNode = findNodeById(workflow, ueNode.id);
  if (!sourceNode) {
    result.warnings.push(`SimpleString node ${ueNode.id} not found`);
    return;
  }

  const isConnectedToUE = workflow.links?.some((link: any) => 
    link.origin_id === parseInt(ueNode.id) &&
    workflow.nodes.some((node: any) => 
      node.id === link.target_id && isUENodeType(node.type)
    )
  );

  if (isConnectedToUE && options.removeUENodes) {
    markNodeForRemoval(sourceNode, result);
    result.changes.push(`Removed SimpleString helper node ${ueNode.id}`);
  } else {
    result.warnings.push(`SimpleString node ${ueNode.id} preserved (not connected to UE)`);
  }
}

// Helper functions
function findNodeById(workflow: any, nodeId: string): any {
  return workflow.nodes?.find((node: any) => node.id?.toString() === nodeId);
}

function findLinkById(workflow: any, linkId: number): any {
  return workflow.links?.find((link: any) => link.id === linkId);
}

function findSeedTargets(workflow: any, excludeId: string): any[] {
  return workflow.nodes.filter((node: any) => 
    node.id?.toString() !== excludeId &&
    node.inputs?.some((input: any) => 
      input.name?.toLowerCase().includes('seed') && !input.link
    )
  );
}

function findAnythingTargets(workflow: any, targetType: string, excludeId: string): any[] {
  return workflow.nodes.filter((node: any) => 
    node.id?.toString() !== excludeId &&
    node.inputs?.some((input: any) => 
      input.type === targetType && !input.link
    )
  );
}

function findPromptTargets(workflow: any, promptType: 'positive' | 'negative', excludeId: string): any[] {
  const patterns = promptType === 'positive' 
    ? ['prompt', 'positive', 'pos']
    : ['negative', 'neg'];
    
  return workflow.nodes.filter((node: any) => 
    node.id?.toString() !== excludeId &&
    node.inputs?.some((input: any) => {
      const name = input.name?.toLowerCase() || '';
      return patterns.some(pattern => name.includes(pattern)) && !input.link;
    })
  );
}

function findRegexTargets(workflow: any, targetType: string, regexRules: any, excludeId: string): any[] {
  return workflow.nodes.filter((node: any) => {
    if (node.id?.toString() === excludeId) return false;
    
    const title = node.title || node.type || '';
    if (!matchesRegex(title, regexRules.title)) return false;
    
    return node.inputs?.some((input: any) => 
      input.type === targetType && 
      !input.link &&
      matchesRegex(input.name, regexRules.input)
    );
  });
}

function matchesRegex(text: string, pattern: string): boolean {
  if (!pattern || pattern === '.*') return true;
  
  try {
    const regex = new RegExp(pattern);
    return regex.test(text || '');
  } catch (error) {
    console.warn(`[UE Converter] Invalid regex pattern: ${pattern}`);
    return false;
  }
}

async function connectPromptTargets(workflow: any, sourceLinkId: number, targets: any[], promptType: string, result: ConversionResult): Promise<void> {
  for (const target of targets) {
    const promptInputIndex = target.inputs.findIndex((input: any) => {
      const name = input.name?.toLowerCase() || '';
      const patterns = promptType === 'positive' 
        ? ['prompt', 'positive', 'pos']
        : ['negative', 'neg'];
      return patterns.some(pattern => name.includes(pattern)) && !input.link;
    });
    
    if (promptInputIndex >= 0) {
      const newLink = createLink(workflow, sourceLinkId, target.id, promptInputIndex);
      if (newLink) {
        target.inputs[promptInputIndex].link = newLink.id;
        result.addedLinks++;
        result.changes.push(`Connected ${promptType} prompt to ${target.type || target.id}`);
      }
    }
  }
}

function createLink(workflow: any, sourceLinkId: number, targetNodeId: string, targetSlot: number): any {
  const sourceLink = findLinkById(workflow, sourceLinkId);
  if (!sourceLink) return null;
  
  if (!workflow.links) {
    workflow.links = [];
  }
  
  const newLinkId = Math.max(...workflow.links.map((l: any) => l.id || 0), 0) + 1;
  
  const newLink = {
    id: newLinkId,
    origin_id: sourceLink.origin_id,
    origin_slot: sourceLink.origin_slot,
    target_id: parseInt(targetNodeId),
    target_slot: targetSlot,
    type: sourceLink.type
  };
  
  workflow.links.push(newLink);
  return newLink;
}

function markNodeForRemoval(node: any, result: ConversionResult): void {
  node._markedForRemoval = true;
  result.removedNodes.push(node.id?.toString() || 'unknown');
  result.changes.push(`Marked ${node.type || 'node'} ${node.id} for removal`);
}

function cleanupRemovedNodes(workflow: any, result: ConversionResult): void {
  const originalNodeCount = workflow.nodes.length;
  workflow.nodes = workflow.nodes.filter((node: any) => !node._markedForRemoval);
  
  const removedCount = originalNodeCount - workflow.nodes.length;
  if (removedCount > 0) {
    result.changes.push(`Removed ${removedCount} UE nodes from workflow`);
  }
  
  if (workflow.links) {
    const originalLinkCount = workflow.links.length;
    const validNodeIds = new Set(workflow.nodes.map((node: any) => node.id));
    
    workflow.links = workflow.links.filter((link: any) => 
      validNodeIds.has(link.origin_id) && validNodeIds.has(link.target_id)
    );
    
    const removedLinks = originalLinkCount - workflow.links.length;
    if (removedLinks > 0) {
      result.changes.push(`Removed ${removedLinks} orphaned links`);
    }
  }
}

function isUENodeType(nodeType: string): boolean {
  const ueTypes = [
    'SeedEverywhere', 'Seed Everywhere',
    'AnythingEverywhere', 'Anything Everywhere',
    'AnythingEverywherePrompts', 'Prompts Everywhere',
    'AnythingEverywhereTriplet', 'Anything Everywhere3',
    'AnythingSomewhere', 'Anything Everywhere?',
    'SimpleString'
  ];
  
  return ueTypes.includes(nodeType) || nodeType.startsWith('Anything Everywhere');
}

export function getDefaultConversionOptions(): ConversionOptions {
  return {
    method: 'convert',
    removeUENodes: true,
    preserveVisual: false,
    handleRegexNodes: 'convert'
  };
}

export function validateConversionOptions(options: Partial<ConversionOptions>): ConversionOptions {
  const defaults = getDefaultConversionOptions();
  
  return {
    method: options.method || defaults.method,
    removeUENodes: options.removeUENodes ?? defaults.removeUENodes,
    preserveVisual: options.preserveVisual ?? defaults.preserveVisual,
    handleRegexNodes: options.handleRegexNodes || defaults.handleRegexNodes
  };
}

export async function quickConvertUEWorkflow(workflowJson: any): Promise<ConversionResult> {
  const { analyzeWorkflowForUE } = await import('./ue-detection');
  const analysis = analyzeWorkflowForUE(workflowJson);
  
  if (!analysis.hasUENodes) {
    return {
      success: true,
      convertedWorkflow: workflowJson,
      changes: ['No UE nodes found - no conversion needed'],
      warnings: [],
      removedNodes: [],
      addedLinks: 0
    };
  }
  
  return convertUEWorkflow(workflowJson, analysis, getDefaultConversionOptions());
}
