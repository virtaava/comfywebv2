// src/lib/ue/virtual-converters/setGetNodeConverter.ts
// DEBUG VERSION - Show exactly what links exist after conversion

import type { ComfyWorkflowJson, ComfyNode, ComfyLink } from '$lib/types';
import type { VirtualNodeConverter } from '../types';

export const setGetNodeConverter: VirtualNodeConverter = {
  type: "Set/Get",

  detect(nodes: ComfyNode[]): boolean {
    return nodes.some(n => n.type === "SetNode" || n.type === "GetNode");
  },

  convert(workflow: ComfyWorkflowJson): ComfyWorkflowJson {
    console.log('[SetGet Converter] Starting SetNode/GetNode conversion...');
    
    const setNodes = workflow.nodes.filter(n => n.type === "SetNode");
    const getNodes = workflow.nodes.filter(n => n.type === "GetNode");
    
    console.log(`[SetGet Converter] Found ${setNodes.length} SetNodes and ${getNodes.length} GetNodes`);

    // Build mapping: variable name -> source connection info
    const variableToSource: Record<string, { sourceNode: number, sourceSlot: number }> = {};
    
    for (const setNode of setNodes) {
      const variableName = setNode.widgets_values?.[0] as string;
      
      // Find link that feeds this SetNode: [linkId, fromNode, fromSlot, toNode, toSlot, type]
      const inputLink = workflow.links.find(link => 
        Array.isArray(link) && link.length >= 5 && link[3] === setNode.id
      );
      
      if (inputLink && variableName) {
        variableToSource[variableName] = {
          sourceNode: inputLink[1], // fromNode at index 1
          sourceSlot: inputLink[2]  // fromSlot at index 2
        };
        console.log(`[SetGet Converter] Variable '${variableName}' sourced from ${inputLink[1]}:${inputLink[2]} (SetNode ${setNode.id})`);
      }
    }

    // Build mapping: GetNode ID -> variable name
    const getNodeToVariable: Record<number, string> = {};
    for (const getNode of getNodes) {
      const variableName = getNode.widgets_values?.[0] as string;
      if (variableName) {
        getNodeToVariable[getNode.id] = variableName;
        console.log(`[SetGet Converter] GetNode ${getNode.id} represents variable '${variableName}'`);
      }
    }

    // Remove virtual nodes
    const virtualNodeIds = new Set([...setNodes.map(n => n.id), ...getNodes.map(n => n.id)]);
    const newNodes = workflow.nodes.filter(n => !virtualNodeIds.has(n.id));

    // Convert links: replace GetNode sources with direct connections
    const newLinks: ComfyLink[] = [];
    let convertedCount = 0;

    for (const link of workflow.links) {
      if (!Array.isArray(link) || link.length < 5) continue;
      
      // [linkId, fromNode, fromSlot, toNode, toSlot, type]
      const [linkId, fromNode, fromSlot, toNode, toSlot, type] = link;

      // Skip links TO SetNodes (virtual inputs)
      if (virtualNodeIds.has(toNode)) {
        console.log(`[SetGet Converter] Removing input to virtual SetNode ${toNode}`);
        continue;
      }

      // Convert links FROM GetNodes
      if (virtualNodeIds.has(fromNode)) {
        const variableName = getNodeToVariable[fromNode];
        const source = variableToSource[variableName];
        
        if (source) {
          // Create direct connection: [linkId, originalSource, originalSlot, targetNode, targetSlot, type]
          const directLink: ComfyLink = [linkId, source.sourceNode, source.sourceSlot, toNode, toSlot, type];
          newLinks.push(directLink);
          convertedCount++;
          console.log(`[SetGet Converter] Direct connection: ${source.sourceNode}:${source.sourceSlot} -> ${toNode}:${toSlot} (was GetNode ${fromNode} '${variableName}')`);
        } else {
          console.warn(`[SetGet Converter] No source found for GetNode ${fromNode} variable '${variableName}'`);
        }
        continue;
      }

      // Keep non-virtual links
      newLinks.push(link);
    }

    console.log(`[SetGet Converter] Conversion complete:`);
    console.log(`  - Removed ${virtualNodeIds.size} virtual nodes`);
    console.log(`  - Converted ${convertedCount} virtual connections`);
    console.log(`  - Result: ${newNodes.length} nodes, ${newLinks.length} links`);

    // DEBUG: Check specific links we care about
    console.log('[SetGet Converter] === POST-CONVERSION LINK ANALYSIS ===');
    
    // Look for DualCLIPLoader (13) -> CLIPTextEncode (47) connection
    const clipConnection = newLinks.find(link => 
      Array.isArray(link) && link[1] === 13 && link[3] === 47
    );
    console.log('[SetGet Converter] DualCLIPLoader(13) -> CLIPTextEncode(47):', clipConnection);
    
    // Check all links involving DualCLIPLoader (13)
    const clipLoaderLinks = newLinks.filter(link => 
      Array.isArray(link) && (link[1] === 13 || link[3] === 13)
    );
    console.log('[SetGet Converter] All links involving DualCLIPLoader(13):', clipLoaderLinks);
    
    // Check all links involving CLIPTextEncode (47)
    const clipTextLinks = newLinks.filter(link => 
      Array.isArray(link) && (link[1] === 47 || link[3] === 47)
    );
    console.log('[SetGet Converter] All links involving CLIPTextEncode(47):', clipTextLinks);

    return {
      ...workflow,
      nodes: newNodes,
      links: newLinks
    };
  }
};
