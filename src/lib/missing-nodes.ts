import * as R from "remeda";
import type { DeepReadonly } from "ts-essentials";
import type { NodeLibrary, NodeTypeId } from "./comfy";
import type { WorkflowStep } from "./workflow";
import { 
  getExtensionAlternatives, 
  getNodeMappings, 
  getAvailableExtensions,
  getInstallableExtensions,
  getInstallationAlternatives,
  validateExtensionConflicts,
  estimateInstallationTime,
  type ExtensionInfo, 
  type ExtensionSelection, 
  type ConflictWarning 
} from "./manager-api";

// Workflow Documentation Types
export interface WorkflowDoc {
  type: 'MarkdownNote' | 'Note';
  title?: string;
  content: string;
  position: [number, number];
  color?: string;
  bgcolor?: string;
  category: 'settings' | 'requirements' | 'instructions' | 'general';
  parsedContent?: ParsedContent;
}

export interface ParsedContent {
  loraWeights: string[];
  cfgValues: string[];
  stepValues: string[];
  modelLinks: string[];
  requirements: string[];
}

// Legacy interface for backward compatibility (deprecated - use enhanced MissingNodeInfo below)
interface LegacyMissingNodeInfo {
  nodeType: NodeTypeId;
  extensionName?: string;
  description?: string;
  author?: string;
  gitUrl?: string;
  isInstallable: boolean;
  installationSize?: string;
  lastUpdated?: string;
  stars?: number;
  reason?: string; // Why not installable
}

// Enhanced interfaces for new system
export interface Extension {
  id: string;
  name: string;
  title?: string;
  description?: string;
  author?: string;
  stars?: number;
  trustLevel: 'high' | 'medium' | 'low' | 'unknown';
  lastUpdate?: string;
  repository?: string;
  installSize?: string;
  nodeCount?: number;
  installCommand?: string;
}

export interface Conflict {
  id: string;
  type: 'duplicate-nodes' | 'dependency-conflict' | 'version-conflict';
  description: string;
  affectedExtensions: Extension[];
  affectedNodes?: string[];
  resolutions?: Resolution[];
}

export interface Resolution {
  action: 'choose' | 'skip' | 'manual';
  description: string;
  impact?: string;
}

export interface ConflictAnalysis {
  conflicts: Conflict[];
  hasConflicts: boolean;
  recommendations: string[];
}

export interface InstallationPlan {
  extensions: Extension[];
  conflicts: Conflict[];
  estimatedTime: number;
  requiresRestart: boolean;
  installationOrder: Extension[];
}

// Enhanced MissingNodeInfo interface
export interface MissingNodeInfo {
  nodeType: NodeTypeId;
  description?: string;
  availableExtensions: Extension[];
  recommendedExtension?: Extension;
  conflictWarnings?: string[];
  // Legacy fields for backward compatibility
  extensionName?: string;
  author?: string;
  gitUrl?: string;
  isInstallable: boolean;
  installationSize?: string;
  lastUpdated?: string;
  stars?: number;
  reason?: string;
}

// Export utility functions
export async function analyzeConflicts(extensions: Extension[]): Promise<ConflictAnalysis> {
  // Simple conflict analysis for now
  const conflicts: Conflict[] = [];
  
  // Check for extensions that provide the same node types
  const nodeProviders: Record<string, Extension[]> = {};
  
  // For now, return no conflicts (conflict detection would require more complex logic)
  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    recommendations: []
  };
}

export async function createInstallationPlan(extensions: Extension[]): Promise<InstallationPlan> {
  // Simple installation plan
  return {
    extensions,
    conflicts: [],
    estimatedTime: extensions.length * 30 + 60, // 30s per extension + 60s restart
    requiresRestart: true,
    installationOrder: extensions
  };
}

export interface NodeInstallationChoice {
  nodeType: NodeTypeId;
  availableExtensions: ExtensionInfo[];
  recommendedExtension?: string;
  conflictWarnings: string[];
  isRequired: boolean;
}

export interface MissingNodePlan {
  nodeOptions: NodeInstallationChoice[];
  globalConflicts: ConflictWarning[];
  recommendedSelections: Record<string, string>;
  estimatedTime: number;
  totalSize: string;
  hasConflicts: boolean;
}

// Legacy registry interfaces
export interface RegistryData {
  customNodes: CustomNodeEntry[];
  extensionNodeMap: Record<string, string>;
}

interface CustomNodeEntry {
  author: string;
  title: string;
  reference: string;
  files: string[];
  install_type: string;
  description: string;
  nodename_pattern?: string;
}

export class MissingNodeDetector {
  private registryCache: RegistryData | null = null;
  private lastFetch = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour
  private serverHost: string;

  constructor(serverHost: string = '127.0.0.1:8188') {
    this.serverHost = serverHost;
  }

  // Legacy method for backward compatibility
  async detectMissingNodes(
    workflowSteps: DeepReadonly<WorkflowStep[]>,
    library: DeepReadonly<NodeLibrary>
  ): Promise<MissingNodeInfo[]> {
    const missingNodeTypes = this.extractMissingNodeTypes(workflowSteps, library);
    
    if (missingNodeTypes.length === 0) {
      return [];
    }

    return this.getMissingNodeInfo(missingNodeTypes);
  }

  // Enhanced method using real ComfyUI Manager API with two-phase detection
  async getMissingNodeInfo(nodeTypes: NodeTypeId[]): Promise<MissingNodeInfo[]> {
    if (nodeTypes.length === 0) {
      return [];
    }

    try {
      console.log('[Missing Node Detector] Starting two-phase detection for', nodeTypes.length, 'node types');
      
      // PHASE 1: Check what's locally installed (mode=comfy)
      console.log('[Missing Node Detector] Phase 1: Checking local installations...');
      const [localMappings, localAlternatives, installedExtensions] = await Promise.all([
        getNodeMappings(this.serverHost), // Now uses mode=comfy
        getExtensionAlternatives(this.serverHost), // Now uses mode=comfy  
        getAvailableExtensions(this.serverHost) // Now uses mode=comfy
      ]);
      
      console.log('[Missing Node Detector] Phase 1 complete:', {
        localMappings: Object.keys(localMappings).length,
        localAlternatives: Object.keys(localAlternatives).length,
        installedExtensions: Object.keys(installedExtensions).length
      });
      
      // Normalize node names before lookup
      const normalizedNodeTypes = nodeTypes.map(nodeType => this.normalizeNodeName(nodeType));
      console.log('[DEBUG] Original vs normalized:', nodeTypes.map((orig, i) => `${orig} -> ${normalizedNodeTypes[i]}`));
      
      // Filter out locally installed nodes
      const trulyMissingNodes: NodeTypeId[] = [];
      const installedNodes: NodeTypeId[] = [];
      
      for (let i = 0; i < nodeTypes.length; i++) {
        const nodeType = nodeTypes[i];
        const normalizedType = normalizedNodeTypes[i];
        
        // Check if node is available locally
        const isLocallyAvailable = 
          localMappings[nodeType] || 
          localMappings[normalizedType] ||
          localAlternatives[nodeType] ||
          localAlternatives[normalizedType];
          
        if (isLocallyAvailable) {
          installedNodes.push(nodeType);
          console.log(`[Missing Node Detector] ✅ Node "${nodeType}" is locally available`);
        } else {
          trulyMissingNodes.push(nodeType);
          console.log(`[Missing Node Detector] ❌ Node "${nodeType}" is missing locally`);
        }
      }
      
      console.log('[Missing Node Detector] Phase 1 results:', {
        installed: installedNodes.length,
        missing: trulyMissingNodes.length
      });
      
      // If no nodes are truly missing, return empty array
      if (trulyMissingNodes.length === 0) {
        console.log('[Missing Node Detector] ✅ All nodes are locally available!');
        return [];
      }
      
      // PHASE 2: Get installation options for truly missing nodes (mode=remote)
      console.log('[Missing Node Detector] Phase 2: Getting installation options for', trulyMissingNodes.length, 'missing nodes...');
      const [installationAlternatives, installableExtensions] = await Promise.all([
        getInstallationAlternatives(this.serverHost), // Uses mode=remote
        getInstallableExtensions(this.serverHost) // Uses mode=remote
      ]);
      
      console.log('[Missing Node Detector] Phase 2 complete:', {
        installationAlternatives: Object.keys(installationAlternatives).length,
        installableExtensions: Object.keys(installableExtensions).length
      });
      
      // Enhanced debugging
      console.log('[DEBUG] Truly missing node types:', trulyMissingNodes);
      console.log('[DEBUG] Sample installation alternatives:', Object.keys(installationAlternatives).slice(0, 10));
      console.log('[DEBUG] Sample installable extensions:', Object.keys(installableExtensions).slice(0, 10));
      
      if (trulyMissingNodes.length > 0) {
        const firstNode = trulyMissingNodes[0];
        console.log(`[DEBUG] Looking for installation options for "${firstNode}":`);
        console.log(`[DEBUG] - In installation alternatives:`, installationAlternatives[firstNode]);
        console.log(`[DEBUG] - Available in installable extensions:`, !!installableExtensions[firstNode]);
      }
      
      return trulyMissingNodes.map((nodeType) => {
        const normalizedType = this.normalizeNodeName(nodeType);
        
        // Try original name first, then normalized in installation alternatives
        let extensionOptions = installationAlternatives[nodeType] || installationAlternatives[normalizedType] || [];
        let mappedExtensions: string[] = [];
        
        // If still not found, try fuzzy matching
        if (extensionOptions.length === 0) {
          const fuzzyResults = this.findSimilarNodes(nodeType, installationAlternatives);
          extensionOptions = fuzzyResults;
        }
        
        // Try known extension mappings for common nodes
        if (extensionOptions.length === 0) {
          const knownMapping = this.getKnownNodeMapping(nodeType);
          if (knownMapping) {
            console.log(`[DEBUG] Using known mapping for ${nodeType}:`, knownMapping);
            extensionOptions = [{
              id: knownMapping.extensionId,
              title: knownMapping.title,
              description: knownMapping.description,
              author: knownMapping.author,
              stars: 0,
              versions: ['latest'],
              repository: knownMapping.gitUrl,
              dependencies: [],
              conflicts: [],
              installSize: 'Unknown',
              trusted: false
            }];
          }
        }
        
        // Combine alternatives and mapped extensions
        const availableExtensions: Extension[] = [];
        const seenIds = new Set<string>();
        
        // Add from alternatives API
        for (const ext of extensionOptions) {
          if (!seenIds.has(ext.id)) {
            availableExtensions.push({
              id: ext.id,
              name: ext.title || ext.id,
              title: ext.title,
              description: ext.description,
              author: ext.author,
              stars: ext.stars,
              trustLevel: ext.trusted ? 'high' : (ext.stars > 50 ? 'medium' : 'low'),
              lastUpdate: ext.lastUpdated,
              repository: ext.repository,
              installSize: ext.installSize
            });
            seenIds.add(ext.id);
          }
        }
        
        // Check if we can find it in installable extensions by ID
        if (extensionOptions.length === 0) {
          const potentialExtensions = Object.values(installableExtensions).filter(ext => 
            ext.title?.toLowerCase().includes(nodeType.toLowerCase()) ||
            ext.description?.toLowerCase().includes(nodeType.toLowerCase())
          );
          
          if (potentialExtensions.length > 0) {
            extensionOptions = potentialExtensions;
            console.log(`[DEBUG] Found potential extensions by content search:`, potentialExtensions.map(e => e.title));
          }
        }
        
        // Sort by quality (trusted first, then by stars)
        availableExtensions.sort((a, b) => {
          const trustOrder = { 'high': 0, 'medium': 1, 'low': 2, 'unknown': 3 };
          if (a.trustLevel !== b.trustLevel) {
            return trustOrder[a.trustLevel] - trustOrder[b.trustLevel];
          }
          return (b.stars || 0) - (a.stars || 0);
        });
        
        const isInstallable = availableExtensions.length > 0;
        const recommended = availableExtensions[0];
        
        return {
          nodeType,
          description: recommended?.description,
          availableExtensions,
          recommendedExtension: recommended,
          isInstallable,
          // Legacy fields for backward compatibility
          extensionName: recommended?.name,
          author: recommended?.author,
          gitUrl: recommended?.repository,
          installationSize: recommended?.installSize,
          lastUpdated: recommended?.lastUpdate,
          stars: recommended?.stars,
          reason: isInstallable ? undefined : 'No extensions found for this node type'
        };
      });
      
    } catch (error) {
      console.error('[Missing Node Detector] API failed, falling back to registry:', error);
      // Fallback to legacy registry method
      return this.getLegacyMissingNodeInfo(nodeTypes);
    }
  }
  
  // Legacy fallback method
  private async getLegacyMissingNodeInfo(nodeTypes: NodeTypeId[]): Promise<MissingNodeInfo[]> {
    const registryData = await this.getRegistryData();
    const legacyInfo = this.resolveMissingNodes(nodeTypes, registryData);
    
    // Convert legacy format to enhanced format
    return legacyInfo.map(legacy => ({
      nodeType: legacy.nodeType,
      description: legacy.description,
      availableExtensions: legacy.isInstallable ? [{
        id: legacy.extensionName || legacy.nodeType,
        name: legacy.extensionName || legacy.nodeType,
        title: legacy.extensionName,
        description: legacy.description,
        author: legacy.author,
        stars: legacy.stars || 0,
        trustLevel: 'unknown' as const,
        lastUpdate: legacy.lastUpdated,
        repository: legacy.gitUrl,
        installSize: legacy.installationSize
      }] : [],
      isInstallable: legacy.isInstallable,
      // Legacy fields for backward compatibility
      extensionName: legacy.extensionName,
      author: legacy.author,
      gitUrl: legacy.gitUrl,
      installationSize: legacy.installationSize,
      lastUpdated: legacy.lastUpdated,
      stars: legacy.stars,
      reason: legacy.reason
    }));
  }

  private extractMissingNodeTypes(
    workflowSteps: DeepReadonly<WorkflowStep[]>,
    library: DeepReadonly<NodeLibrary>
  ): NodeTypeId[] {
    const missingTypes: NodeTypeId[] = [];

    for (const step of workflowSteps) {
      if (step.type === "Node") {
        const nodeStep = step as any; // WorkflowStep.NodeStep
        if (!library[nodeStep.nodeType]) {
          missingTypes.push(nodeStep.nodeType);
        }
      } else if (step.type === "Aggregate") {
        const aggregateStep = step as any; // WorkflowStep.AggregateNodeStep
        for (const node of aggregateStep.nodes) {
          if (!library[node.type]) {
            missingTypes.push(node.type);
          }
        }
      }
    }

    return R.unique(missingTypes);
  }

  private async getRegistryData(): Promise<RegistryData> {
    if (this.registryCache && Date.now() - this.lastFetch < this.CACHE_DURATION) {
      return this.registryCache;
    }

    try {
      const [customNodes, extensionNodeMap] = await Promise.all([
        fetch('https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/custom-node-list.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/extension-node-map.json').then(r => r.json())
      ]);

      this.registryCache = { customNodes, extensionNodeMap };
      this.lastFetch = Date.now();
      return this.registryCache;
    } catch (error) {
      console.error('Failed to fetch registry data:', error);
      return { customNodes: [], extensionNodeMap: {} };
    }
  }

  private resolveMissingNodes(
    nodeTypes: NodeTypeId[],
    registryData: RegistryData
  ): LegacyMissingNodeInfo[] {
    return nodeTypes.map(nodeType => {
      const extensionName = registryData.extensionNodeMap[nodeType];
      
      if (!extensionName) {
        return {
          nodeType,
          isInstallable: false,
          reason: 'Node type not found in registry'
        };
      }

      const nodeInfo = registryData.customNodes.find(
        node => node.title === extensionName || node.reference === extensionName
      );

      if (!nodeInfo) {
        return {
          nodeType,
          extensionName,
          isInstallable: false,
          reason: 'Extension found but installation info missing'
        };
      }

      return {
        nodeType,
        extensionName: nodeInfo.title,
        description: nodeInfo.description,
        author: nodeInfo.author,
        gitUrl: nodeInfo.files[0],
        isInstallable: true
      };
    });
  }
  
  // Helper method to normalize node names
  private normalizeNodeName(nodeType: string): string {
    // Remove common suffixes/prefixes that might cause mismatches
    let normalized = nodeType
      .replace(/^comfyui[_-]/i, '') // Remove comfyui prefix
      .replace(/[_-]node$/i, '') // Remove _node suffix
      .replace(/\s*\([^)]+\)$/, '') // Remove parenthetical info like (rgthree)
      .trim();
    
    // Handle common variations
    const variations: Record<string, string> = {
      'DepthAnythingPreprocessor': 'DepthAnything',
      'DWPreprocessor': 'DWPose',
      'OpenposePreprocessor': 'OpenPose',
      'Fast Groups Bypasser': 'rgthree'
    };
    
    return variations[normalized] || normalized;
  }
  
  // Helper method to find similar nodes using fuzzy matching
  private findSimilarNodes(nodeType: string, alternatives: Record<string, ExtensionInfo[]>): ExtensionInfo[] {
    const results: ExtensionInfo[] = [];
    
    // Try partial matching
    const lowerNodeType = nodeType.toLowerCase();
    
    // Check alternatives for partial matches
    for (const [key, value] of Object.entries(alternatives)) {
      if (key.toLowerCase().includes(lowerNodeType) || lowerNodeType.includes(key.toLowerCase())) {
        results.push(...value);
        console.log(`[DEBUG] Found similar alternative: ${nodeType} -> ${key}`);
        break;
      }
    }
    
    return results;
  }
  
  // Helper method with known extension mappings for common missing nodes
  private getKnownNodeMapping(nodeType: string): { extensionId: string; title: string; description: string; author: string; gitUrl: string } | null {
    const knownMappings: Record<string, any> = {
      'SetNode': {
        extensionId: 'comfyui-impact-pack',
        title: 'ComfyUI Impact Pack',
        description: 'Advanced node manipulation and workflow tools',
        author: 'ltdrdata',
        gitUrl: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack'
      },
      'GetNode': {
        extensionId: 'comfyui-impact-pack',
        title: 'ComfyUI Impact Pack',
        description: 'Advanced node manipulation and workflow tools',
        author: 'ltdrdata',
        gitUrl: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack'
      },
      'DepthAnythingPreprocessor': {
        extensionId: 'comfyui-controlnet-aux',
        title: 'ControlNet Auxiliary Preprocessors',
        description: 'Auxiliary preprocessors for ControlNet including DepthAnything',
        author: 'Fannovel16',
        gitUrl: 'https://github.com/Fannovel16/comfyui_controlnet_aux'
      },
      'DWPreprocessor': {
        extensionId: 'comfyui-controlnet-aux',
        title: 'ControlNet Auxiliary Preprocessors',
        description: 'Auxiliary preprocessors for ControlNet including DWPose',
        author: 'Fannovel16',
        gitUrl: 'https://github.com/Fannovel16/comfyui_controlnet_aux'
      },
      'OpenposePreprocessor': {
        extensionId: 'comfyui-controlnet-aux',
        title: 'ControlNet Auxiliary Preprocessors',
        description: 'Auxiliary preprocessors for ControlNet including OpenPose',
        author: 'Fannovel16',
        gitUrl: 'https://github.com/Fannovel16/comfyui_controlnet_aux'
      },
      'Fast Groups Bypasser (rgthree)': {
        extensionId: 'rgthree-comfy',
        title: 'rgthree\'s ComfyUI Nodes',
        description: 'Quality of life nodes for ComfyUI including group management',
        author: 'rgthree',
        gitUrl: 'https://github.com/rgthree/rgthree-comfy'
      }
    };
    
    return knownMappings[nodeType] || null;
  }
}

// Factory function for creating missing node detector
export function createMissingNodeDetector(serverHost: string = '127.0.0.1:8188'): MissingNodeDetector {
  return new MissingNodeDetector(serverHost);
}

// Utility function for enhanced missing node detection from raw workflow
export async function tryDetectMissingNodesFromRawWorkflow(
  workflowData: string,
  serverHost: string
): Promise<MissingNodePlan | null> {
  try {
    // Parse workflow JSON
    const workflow = JSON.parse(workflowData);
    const nodeTypes = new Set<string>();
    
    // Extract node types from workflow
    if (workflow.nodes) {
      // ComfyUI workflow format
      for (const node of workflow.nodes) {
        if (node.type) {
          nodeTypes.add(node.type);
        }
      }
    } else if (typeof workflow === 'object') {
      // API workflow format
      for (const [nodeId, nodeData] of Object.entries(workflow)) {
        if (nodeData && typeof nodeData === 'object' && (nodeData as any).class_type) {
          nodeTypes.add((nodeData as any).class_type);
        }
      }
    }
    
    if (nodeTypes.size === 0) {
      return null;
    }
    
    // Create installation plan for detected nodes
    const detector = createMissingNodeDetector(serverHost);
    const missingInfo = await detector.getMissingNodeInfo(Array.from(nodeTypes));
    
    // Convert to missing node plan format
    const nodeOptions: NodeInstallationChoice[] = missingInfo.map(info => ({
      nodeType: info.nodeType,
      availableExtensions: info.availableExtensions.map(ext => ({
        id: ext.id,
        title: ext.title || ext.name,
        description: ext.description || '',
        author: ext.author || 'Unknown',
        stars: ext.stars || 0,
        versions: ['latest'],
        repository: ext.repository || '',
        dependencies: [],
        conflicts: [],
        installSize: ext.installSize || 'Unknown',
        trusted: ext.trustLevel === 'high'
      })),
      recommendedExtension: info.recommendedExtension?.id,
      conflictWarnings: info.conflictWarnings || [],
      isRequired: true
    }));
    
    const recommendedSelections: Record<string, string> = {};
    for (const option of nodeOptions) {
      if (option.recommendedExtension) {
        recommendedSelections[option.nodeType] = option.recommendedExtension;
      }
    }
    
    return {
      nodeOptions,
      globalConflicts: [],
      recommendedSelections,
      estimatedTime: nodeOptions.length * 30 + 60,
      totalSize: `${nodeOptions.length * 50} MB`,
      hasConflicts: false
    };
    
  } catch (error) {
    console.error('[Missing Node Detector] Failed to analyze raw workflow:', error);
    return null;
  }
}

// Workflow Documentation Extraction Functions
export function extractWorkflowDocumentation(workflowData: any): WorkflowDoc[] {
  const docs: WorkflowDoc[] = [];
  
  if (!workflowData?.nodes) {
    return docs;
  }
  
  for (const node of workflowData.nodes) {
    if (node.type === 'MarkdownNote' || node.type === 'Note') {
      const content = node.widgets_values?.[0] || '';
      const title = node.title || 'Workflow Note';
      
      // Skip empty notes
      if (!content.trim()) {
        continue;
      }
      
      // Categorize based on content
      const category = categorizeDocumentation(content);
      
      // Parse content for structured information
      const parsedContent = parseDocumentationContent(content);
      
      docs.push({
        type: node.type,
        title,
        content: content.trim(),
        position: node.pos || [0, 0],
        color: node.color,
        bgcolor: node.bgcolor,
        category,
        parsedContent
      });
    }
  }
  
  // Sort by category priority and position
  return docs.sort((a, b) => {
    const categoryOrder = { 'settings': 0, 'requirements': 1, 'instructions': 2, 'general': 3 };
    const aCat = categoryOrder[a.category];
    const bCat = categoryOrder[b.category];
    
    if (aCat !== bCat) {
      return aCat - bCat;
    }
    
    // Sort by Y position within same category
    return a.position[1] - b.position[1];
  });
}

export function categorizeDocumentation(content: string): 'settings' | 'requirements' | 'instructions' | 'general' {
  const lowerContent = content.toLowerCase();
  
  // Settings category - contains parameter information
  if (
    lowerContent.includes('lora') ||
    lowerContent.includes('cfg') ||
    lowerContent.includes('steps') ||
    lowerContent.includes('sampler') ||
    lowerContent.includes('scheduler') ||
    lowerContent.includes('denoise') ||
    lowerContent.includes('strength') ||
    lowerContent.includes('seed') ||
    lowerContent.includes('weight') ||
    lowerContent.includes('setting')
  ) {
    return 'settings';
  }
  
  // Requirements category - contains download/installation info
  if (
    lowerContent.includes('download') ||
    lowerContent.includes('install') ||
    lowerContent.includes('model') ||
    lowerContent.includes('safetensors') ||
    lowerContent.includes('huggingface') ||
    lowerContent.includes('requirement') ||
    lowerContent.includes('dependency') ||
    lowerContent.includes('file save location') ||
    lowerContent.includes('comfyui/')
  ) {
    return 'requirements';
  }
  
  // Instructions category - contains usage guidance
  if (
    lowerContent.includes('step') ||
    lowerContent.includes('how to') ||
    lowerContent.includes('usage') ||
    lowerContent.includes('instruction') ||
    lowerContent.includes('guide') ||
    lowerContent.includes('should') ||
    lowerContent.includes('need to') ||
    lowerContent.includes('make sure') ||
    lowerContent.includes('important') ||
    lowerContent.includes('note that')
  ) {
    return 'instructions';
  }
  
  // Default to general
  return 'general';
}

export function parseDocumentationContent(content: string): ParsedContent {
  const parsed: ParsedContent = {
    loraWeights: [],
    cfgValues: [],
    stepValues: [],
    modelLinks: [],
    requirements: []
  };
  
  // Parse LoRA weights and references
  const loraMatches = content.match(/lora[\s\w]*[:\s]*([\d\.]+)|lora[\s\w]*\b/gi);
  if (loraMatches) {
    parsed.loraWeights = loraMatches.map(match => match.trim());
  }
  
  // Parse CFG values
  const cfgMatches = content.match(/cfg[:\s]*([\d\.]+)/gi);
  if (cfgMatches) {
    parsed.cfgValues = cfgMatches.map(match => match.trim());
  }
  
  // Parse steps values
  const stepsMatches = content.match(/steps?[:\s]*([\d\-]+)/gi);
  if (stepsMatches) {
    parsed.stepValues = stepsMatches.map(match => match.trim());
  }
  
  // Parse model download links
  const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
  if (linkMatches) {
    parsed.modelLinks = linkMatches;
  }
  
  // Parse requirements/dependencies
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('-') ||
      trimmed.startsWith('*') ||
      trimmed.includes('.safetensors') ||
      trimmed.includes('ComfyUI/')
    ) {
      parsed.requirements.push(trimmed);
    }
  }
  
  return parsed;
}
