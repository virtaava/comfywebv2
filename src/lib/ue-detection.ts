/**
 * ComfyWeb v2 - UE (Use Everywhere) Detection Engine
 * 
 * Detects cg-use-everywhere virtual links in ComfyUI workflows and analyzes compatibility issues.
 * Based on analysis of actual cg-use-everywhere extension from:
 * C:\Users\virta\AI\external_repos\ComfyUI\custom_nodes\cg-use-everywhere
 */

export interface UENodeInfo {
  id: string;
  type: string;
  title?: string;
  hasConnections: boolean;
  regexRules?: {
    title?: string;
    input?: string;
    group?: string;
  };
  properties?: any;
  widgetValues?: any[];
}

export interface UEAnalysisResult {
  hasUENodes: boolean;
  ueNodeTypes: string[];
  ueNodes: UENodeInfo[];
  virtualConnections: number;
  conversionRequired: boolean;
  compatibilityIssues: string[];
  recommendedAction: 'convert' | 'strip' | 'compatible' | 'unknown';
}

export interface UEVirtualConnection {
  sourceNodeId: string;
  sourceType: string;
  targetNodes: string[];
  connectionType: 'seed' | 'anything' | 'prompts' | 'regex';
  regexRules?: {
    title?: string;
    input?: string;
    group?: string;
  };
}

// UE Node Types from actual cg-use-everywhere extension
const UE_NODE_TYPES = [
  'SeedEverywhere',
  'AnythingEverywhere', 
  'AnythingEverywherePrompts',
  'AnythingEverywhereTriplet',
  'AnythingSomewhere', // "Anything Everywhere?"
  'SimpleString'
];

// Alternative names that might appear in workflows
const UE_NODE_ALIASES = [
  'Seed Everywhere',
  'Anything Everywhere',
  'Anything Everywhere?',
  'Prompts Everywhere',
  'Anything Everywhere3'
];

/**
 * Main function to analyze a workflow for UE virtual links
 */
export function analyzeWorkflowForUE(workflowJson: any): UEAnalysisResult {
  console.log('[UE Detection] Starting workflow analysis for UE patterns...');
  
  try {
    const result: UEAnalysisResult = {
      hasUENodes: false,
      ueNodeTypes: [],
      ueNodes: [],
      virtualConnections: 0,
      conversionRequired: false,
      compatibilityIssues: [],
      recommendedAction: 'compatible'
    };

    if (!workflowJson || !workflowJson.nodes) {
      console.warn('[UE Detection] Invalid workflow structure - no nodes found');
      return result;
    }

    // Analyze each node for UE patterns
    for (const node of workflowJson.nodes) {
      const ueNodeInfo = analyzeNodeForUE(node);
      if (ueNodeInfo) {
        result.hasUENodes = true;
        result.ueNodes.push(ueNodeInfo);
        
        if (!result.ueNodeTypes.includes(ueNodeInfo.type)) {
          result.ueNodeTypes.push(ueNodeInfo.type);
        }
      }
    }

    // If UE nodes found, analyze virtual connections
    if (result.hasUENodes) {
      result.virtualConnections = analyzeVirtualConnections(workflowJson, result.ueNodes);
      result.conversionRequired = result.virtualConnections > 0;
      result.compatibilityIssues = identifyCompatibilityIssues(result.ueNodes);
      result.recommendedAction = determineRecommendedAction(result);
    }

    console.log(`[UE Detection] Analysis complete:`, {
      hasUENodes: result.hasUENodes,
      nodeCount: result.ueNodes.length,
      virtualConnections: result.virtualConnections,
      recommendedAction: result.recommendedAction
    });

    return result;

  } catch (error) {
    console.error('[UE Detection] Error during workflow analysis:', error);
    return {
      hasUENodes: false,
      ueNodeTypes: [],
      ueNodes: [],
      virtualConnections: 0,
      conversionRequired: false,
      compatibilityIssues: [`Analysis error: ${error.message}`],
      recommendedAction: 'unknown'
    };
  }
}

/**
 * Analyze individual node for UE patterns
 */
function analyzeNodeForUE(nodeData: any): UENodeInfo | null {
  if (!nodeData || !nodeData.type) {
    return null;
  }

  // Primary detection: Direct UE node type match
  if (isUENodeType(nodeData.type)) {
    return extractUENodeInfo(nodeData);
  }

  // Secondary detection: UE properties
  if (hasUEProperties(nodeData)) {
    return extractUENodeInfo(nodeData);
  }

  // Tertiary detection: UE-specific patterns
  if (hasUEPatterns(nodeData)) {
    return extractUENodeInfo(nodeData);
  }

  return null;
}

/**
 * Check if node type is a known UE type
 */
function isUENodeType(nodeType: string): boolean {
  // Direct match
  if (UE_NODE_TYPES.includes(nodeType)) {
    return true;
  }

  // Alias match
  if (UE_NODE_ALIASES.includes(nodeType)) {
    return true;
  }

  // Pattern match
  if (nodeType.startsWith('Anything Everywhere')) {
    return true;
  }

  if (nodeType === 'Seed Everywhere' || nodeType === 'Prompts Everywhere') {
    return true;
  }

  return false;
}

/**
 * Check for UE-specific properties
 */
function hasUEProperties(nodeData: any): boolean {
  // Check for widget_ue_connectable property
  if (nodeData.properties?.widget_ue_connectable) {
    return true;
  }

  // Check for IS_UE flag
  if (nodeData.IS_UE === true) {
    return true;
  }

  return false;
}

/**
 * Check for UE-specific patterns in node structure
 */
function hasUEPatterns(nodeData: any): boolean {
  // Check for UE-specific input/output patterns
  if (nodeData.inputs?.some((input: any) => 
    input.name === 'anything' || 
    input.name === '+ve' || 
    input.name === '-ve'
  )) {
    return true;
  }

  // Check for regex widget patterns
  if (nodeData.widgets_values?.length >= 3 && 
      nodeData.type?.includes('Everywhere')) {
    return true;
  }

  return false;
}

/**
 * Extract detailed UE node information
 */
function extractUENodeInfo(nodeData: any): UENodeInfo {
  const ueNode: UENodeInfo = {
    id: nodeData.id?.toString() || 'unknown',
    type: nodeData.type,
    title: nodeData.title,
    hasConnections: hasActiveConnections(nodeData),
    properties: nodeData.properties
  };

  // Extract regex rules for "Anything Everywhere?" nodes
  if (nodeData.type === 'AnythingSomewhere' || nodeData.type === 'Anything Everywhere?') {
    if (nodeData.widgets_values && nodeData.widgets_values.length >= 3) {
      ueNode.regexRules = {
        title: nodeData.widgets_values[0] || '.*',
        input: nodeData.widgets_values[1] || '.*',
        group: nodeData.widgets_values[2] || '.*'
      };
    }
  }

  // Store widget values for analysis
  ueNode.widgetValues = nodeData.widgets_values;

  return ueNode;
}

/**
 * Check if node has active connections
 */
function hasActiveConnections(nodeData: any): boolean {
  // Check inputs for connections
  if (nodeData.inputs?.some((input: any) => input.link !== null)) {
    return true;
  }

  // Check outputs for connections  
  if (nodeData.outputs?.some((output: any) => 
    output.links && output.links.length > 0
  )) {
    return true;
  }

  return false;
}

/**
 * Analyze virtual connections created by UE nodes
 */
function analyzeVirtualConnections(workflowJson: any, ueNodes: UENodeInfo[]): number {
  let connectionCount = 0;

  for (const ueNode of ueNodes) {
    const connections = findVirtualConnectionsForNode(workflowJson, ueNode);
    connectionCount += connections.length;
  }

  return connectionCount;
}

/**
 * Find virtual connections for a specific UE node
 */
function findVirtualConnectionsForNode(workflowJson: any, ueNode: UENodeInfo): UEVirtualConnection[] {
  const connections: UEVirtualConnection[] = [];

  // This is a simplified implementation
  // Real UE virtual connections are determined by JavaScript at runtime
  // We can estimate based on node types and potential targets

  const targetNodes = findPotentialTargets(workflowJson, ueNode);
  
  if (targetNodes.length > 0) {
    connections.push({
      sourceNodeId: ueNode.id,
      sourceType: ueNode.type,
      targetNodes: targetNodes,
      connectionType: determineConnectionType(ueNode),
      regexRules: ueNode.regexRules
    });
  }

  return connections;
}

/**
 * Find potential target nodes for UE broadcasting
 */
function findPotentialTargets(workflowJson: any, ueNode: UENodeInfo): string[] {
  const targets: string[] = [];

  // Simplified logic - in reality this requires complex matching
  // against input types, regex patterns, and node titles
  
  for (const node of workflowJson.nodes) {
    if (node.id === ueNode.id) continue; // Skip self
    
    if (couldBeUETarget(node, ueNode)) {
      targets.push(node.id.toString());
    }
  }

  return targets;
}

/**
 * Determine if a node could be a UE target
 */
function couldBeUETarget(node: any, ueNode: UENodeInfo): boolean {
  // Simplified heuristics
  switch (ueNode.type) {
    case 'SeedEverywhere':
    case 'Seed Everywhere':
      return node.inputs?.some((input: any) => 
        input.name?.toLowerCase().includes('seed') && !input.link
      );
      
    case 'AnythingEverywhere':
    case 'Anything Everywhere':
      return node.inputs?.some((input: any) => !input.link);
      
    case 'AnythingEverywherePrompts':
    case 'Prompts Everywhere':
      return node.inputs?.some((input: any) => 
        (input.name?.toLowerCase().includes('prompt') || 
         input.name?.toLowerCase().includes('positive') ||
         input.name?.toLowerCase().includes('negative')) && !input.link
      );
      
    default:
      return false;
  }
}

/**
 * Determine connection type for UE node
 */
function determineConnectionType(ueNode: UENodeInfo): 'seed' | 'anything' | 'prompts' | 'regex' {
  if (ueNode.type.includes('Seed')) return 'seed';
  if (ueNode.type.includes('Prompts')) return 'prompts';
  if (ueNode.regexRules) return 'regex';
  return 'anything';
}

/**
 * Identify compatibility issues with the workflow
 */
function identifyCompatibilityIssues(ueNodes: UENodeInfo[]): string[] {
  const issues: string[] = [];

  for (const node of ueNodes) {
    if (node.hasConnections) {
      issues.push(`${node.type} (${node.title || node.id}) has virtual connections that need conversion`);
    }

    if (node.regexRules) {
      const hasComplexRegex = 
        (node.regexRules.title && node.regexRules.title !== '.*') ||
        (node.regexRules.input && node.regexRules.input !== '.*') ||
        (node.regexRules.group && node.regexRules.group !== '.*');
        
      if (hasComplexRegex) {
        issues.push(`${node.type} uses complex regex patterns that may need manual review`);
      }
    }
  }

  return issues;
}

/**
 * Determine recommended action based on analysis
 */
function determineRecommendedAction(result: UEAnalysisResult): 'convert' | 'strip' | 'compatible' | 'unknown' {
  if (!result.hasUENodes) {
    return 'compatible';
  }

  if (result.virtualConnections === 0) {
    return 'compatible'; // UE nodes present but no active connections
  }

  if (result.compatibilityIssues.length === 0) {
    return 'convert'; // Simple conversion should work
  }

  if (result.ueNodes.some(node => node.regexRules)) {
    return 'convert'; // Has regex patterns but still convertible
  }

  return 'convert'; // Default to conversion for most cases
}

/**
 * Get human-readable description of UE analysis
 */
export function getUEAnalysisDescription(result: UEAnalysisResult): string {
  if (!result.hasUENodes) {
    return 'No Use Everywhere nodes detected. Workflow should load normally.';
  }

  const nodeCount = result.ueNodes.length;
  const connectionCount = result.virtualConnections;
  
  let description = `Found ${nodeCount} Use Everywhere node${nodeCount > 1 ? 's' : ''}`;
  
  if (connectionCount > 0) {
    description += ` with ${connectionCount} virtual connection${connectionCount > 1 ? 's' : ''}`;
  }
  
  description += '. ';

  switch (result.recommendedAction) {
    case 'convert':
      description += 'Converting to real links is recommended for backend compatibility.';
      break;
    case 'strip':
      description += 'Removing UE system may be necessary due to complexity.';
      break;
    case 'compatible':
      description += 'Workflow should be compatible as-is.';
      break;
    default:
      description += 'Manual review recommended.';
  }

  return description;
}

/**
 * Check if workflow contains specific UE node type
 */
export function hasUENodeType(workflowJson: any, nodeType: string): boolean {
  if (!workflowJson?.nodes) return false;
  
  return workflowJson.nodes.some((node: any) => 
    node.type === nodeType || 
    UE_NODE_ALIASES.includes(nodeType) && node.type === UE_NODE_TYPES[UE_NODE_ALIASES.indexOf(nodeType)]
  );
}

/**
 * Extract all UE nodes from workflow
 */
export function extractUENodes(workflowJson: any): UENodeInfo[] {
  const analysis = analyzeWorkflowForUE(workflowJson);
  return analysis.ueNodes;
}
