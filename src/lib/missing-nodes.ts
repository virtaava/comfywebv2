import * as R from "remeda";
import type { DeepReadonly } from "ts-essentials";
import type { NodeLibrary, NodeTypeId } from "./comfy";
import type { WorkflowStep } from "./workflow";

export interface MissingNodeInfo {
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

  async getMissingNodeInfo(nodeTypes: NodeTypeId[]): Promise<MissingNodeInfo[]> {
    if (nodeTypes.length === 0) {
      return [];
    }

    const registryData = await this.getRegistryData();
    return this.resolveMissingNodes(nodeTypes, registryData);
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
  ): MissingNodeInfo[] {
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
}
