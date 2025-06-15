import ExifReader from "exifreader";
import * as R from "remeda";
import type { DeepReadonly } from "ts-essentials";

import {
  type LinkTypeId,
  type NodeId,
  type NodeLibrary,
  type SlotId,
  type Workflow as ComfyWorkflow,
  type LinkId,
  type Link,
  type NodeTypeId,
  Node,
  NodeInputSchema,
  type PrimitiveControl,
  type NodeInput,
  type NodeOutput,
  type NodeType,
} from "./comfy";
import { topologicallySortedNodes } from "./graph";

export function loadFromDataTransfer(
  dt: DataTransfer,
  library: DeepReadonly<NodeLibrary>,
): Promise<WorkflowStep[] | undefined> {
  return new Promise((resolve, reject) => {
    const file: File | undefined = dt.files[0];
    if (file === undefined) {
      reject(new WorkflowLoadRequestError.EmptyTransfer());
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const body = ev.target!.result;

      if (file.name.endsWith(".json")) {
        const str = new TextDecoder().decode(body as ArrayBuffer);
        const json = JSON.parse(str);
        if (Array.isArray(json)) {
          resolve(json);
        } else {
          try {
            resolve(loadFromComfyWorkflow(json, library));
          } catch (error) {
            reject(error);
          }
        }
        return;
      }

      const tags = ExifReader.load(body);

      if (tags.steps && tags.steps.value) {
        resolve(JSON.parse(tags.steps.value));
        return;
      }

      if (!tags.workflow || !tags.workflow.value) {
        reject(new WorkflowLoadRequestError.MissingWorkflow());
        return;
      }

      const workflow = JSON.parse(tags.workflow.value);
      if (!workflow || !workflow.nodes || !workflow.links) {
        reject(new WorkflowLoadRequestError.InvalidWorkflow());
        return;
      }

      try {
        resolve(loadFromComfyWorkflow(workflow, library));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function loadFromComfyWorkflow(
  graph: ComfyWorkflow,
  library: DeepReadonly<NodeLibrary>,
): WorkflowStep[] {
  // Validate workflow structure
  if (!graph) {
    throw new WorkflowLoadError.InvalidWorkflow('Workflow is null or undefined');
  }
  
  if (!graph.nodes || !Array.isArray(graph.nodes)) {
    throw new WorkflowLoadError.InvalidWorkflow('Workflow missing valid nodes array');
  }
  
  if (!graph.links || !Array.isArray(graph.links)) {
    throw new WorkflowLoadError.InvalidWorkflow('Workflow missing valid links array');
  }

  console.log('Loading ComfyUI workflow with', graph.nodes.length, 'nodes and', graph.links.length, 'links');
  
  // Debug: Log node types in workflow vs library
  const workflowNodeTypes = graph.nodes.map(n => n.type).filter(Boolean);
  const uniqueWorkflowTypes = [...new Set(workflowNodeTypes)];
  const libraryNodeTypes = Object.keys(library);
  
  console.log('🔍 [Workflow Debug] Node types in workflow:', uniqueWorkflowTypes);
  console.log('🔍 [Workflow Debug] Node types in library:', libraryNodeTypes.length, 'total');
  
  // Check which node types are missing from library
  const missingNodeTypes = uniqueWorkflowTypes.filter(type => !library[type]);
  if (missingNodeTypes.length > 0) {
    console.log('❌ [Workflow Debug] Missing node types from library:', missingNodeTypes);
  } else {
    console.log('✅ [Workflow Debug] All node types found in library');
  }
  
  // Debug: Check for null links
  const nullLinks = graph.nodes.flatMap(node => 
    (node.inputs || []).filter(input => input.link === null || input.link === undefined)
  );
  if (nullLinks.length > 0) {
    console.log('⚠️ [Workflow Debug] Found', nullLinks.length, 'null links in workflow');
  }
  
  patchConditioningNodes(graph.nodes);

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgesById = new Map(graph.links.map((link) => [link[0], link]));

  propagateTypes(nodesById, edgesById);
  const sortedNodes = topologicallySortedNodes(
    graph.links.map(([, lhs, , rhs]) => [lhs, rhs]),
  );

  // Enhanced debugging for node processing order
  console.log('🔍 [Sort Debug] Sorted nodes for processing:', sortedNodes);
  console.log('🔍 [Sort Debug] Total nodes to process:', sortedNodes.length);
  console.log('🔍 [Sort Debug] Expected DualCLIPLoader(13):', sortedNodes.includes(13));
  console.log('🔍 [Sort Debug] Expected CLIPTextEncode(47):', sortedNodes.includes(47));
  console.log('🔍 [Sort Debug] Links used for sorting:', 
    graph.links.map(([, lhs, , rhs]) => [lhs, rhs]).slice(0, 10), '...');
  console.log('🔍 [Sort Debug] All nodes in workflow:', 
    graph.nodes.map(n => `${n.id}(${n.type})`).slice(0, 10), '...');

  const stack = new Map<LinkTypeId, [NodeId, SlotId][]>();
  const pipeline: WorkflowStep[] = [];

  for (const nodeId of sortedNodes) {
    const node = nodesById.get(nodeId)!;
    console.log(`🔍 [Process Debug] Processing node ${nodeId} (${node.type})`);

    if (
      node.inputs &&
      node.inputs.length !==
        R.unique(node.inputs.map(({ type }) => type)).length
    ) {
      throw new WorkflowLoadError.DuplicateInputType(node.type);
    }
    
    // Special debugging for DualCLIPLoader
    if (node.type === "DualCLIPLoader") {
      console.log(`🔍 [DualCLIP Debug] Node structure:`, node);
      console.log(`🔍 [DualCLIP Debug] Outputs array:`, node.outputs);
      if (node.outputs) {
        for (const output of node.outputs) {
          console.log(`🔍 [DualCLIP Debug] Output: ${output.name} type ${output.type} slot ${output.slot_index}`);
        }
      } else {
        console.log(`🔍 [DualCLIP Debug] ❌ NO OUTPUTS ARRAY!`);
      }
    }

    for (const input of node.inputs ?? []) {
      // Skip inputs with null or undefined links
      if (input.link === null || input.link === undefined) {
        console.log(`🔄 [Workflow Debug] Skipping null link for input ${input.name} in node ${node.id} (${node.type})`);
        continue;
      }
      
      const link = edgesById.get(input.link);
      if (!link) {
        console.warn(`Missing edge ${input.link} for input ${input.name} in node ${node.type}`);
        continue;
      }
      const [, fromNode, fromSlot] = link;
      
      // Enhanced debugging for stack validation
      console.log(`🔍 [Stack Debug] Validating ${node.type}(${nodeId}) input ${input.name} type ${input.type}`);
      console.log(`🔍 [Stack Debug] Looking for connection from node ${fromNode} slot ${fromSlot}`);
      console.log(`🔍 [Stack Debug] Available output types in stack:`, Array.from(stack.keys()));
      
      const output = stack.get(input.type);
      console.log(`🔍 [Stack Debug] ${input.type} stack contents:`, output);
      
      const index = output?.findIndex(
        ([id, slot]) => id === fromNode && slot === fromSlot,
      );
      
      if (output === undefined || index === undefined || index === -1) {
        console.error(`❌ [Stack Debug] Missing input validation failed:`);
        console.error(`   - Node: ${node.type}(${nodeId})`);
        console.error(`   - Required input: ${input.type}`);
        console.error(`   - Expected from: node ${fromNode} slot ${fromSlot}`);
        console.error(`   - Stack for ${input.type}:`, output);
        console.error(`   - All stack contents:`, Object.fromEntries(stack));
        throw new WorkflowLoadError.MissingInput(node.type, input.type);
      }
      if (index === output.length - 1) {
        continue;
      }
      const shiftCount = output.length - 1 - index;
      pipeline.push(WorkflowStep.newShift(input.type, shiftCount));

      for (let i = 0; i < shiftCount; i++) {
        output.unshift(output.pop()!);
      }
    }

    for (const out of node.outputs ?? []) {
      console.log(`🔍 [Output Debug] Checking output: ${out.name} type ${out.type} slot ${out.slot_index}`);
      const slot = out.slot_index ?? i;
      console.log(`🔍 [Output Debug] Using slot ${slot} for output ${out.name}`);
      stack.get(out.type)!.push([nodeId, slot]);
      console.log(`🔍 [Output Debug] ${node.type}(${nodeId}) registering output ${out.type} at slot ${out.slot_index}`);
      if (!stack.has(out.type)) stack.set(out.type, []);
      stack.get(out.type)!.push([nodeId, out.slot_index]);
      console.log(`🔍 [Output Debug] ${out.type} stack now contains:`, stack.get(out.type));
    }

    if (Node.isPrimitive(node)) {
      pipeline.push(
        WorkflowStep.newPrimitive(
          node.outputs[0].type,
          node.widgets_values[0],
          node.widgets_values[1],
        ),
      );
      continue;
    }

    const nodeType = library[node.type];
    if (nodeType === undefined) {
      throw new WorkflowLoadError.UnknownNodeType(node.type);
    }

    const linkedInputs = new Set(node.inputs?.map(({ name }) => name) ?? []);
    const inputs = R.concat(
      nodeType.input_order.required?.map<
        [string, DeepReadonly<NodeInputSchema>]
      >((name) => [name, nodeType.input.required![name]]) ?? [],
      nodeType.input_order.optional?.map<
        [string, DeepReadonly<NodeInputSchema>]
      >((name) => [name, nodeType.input.optional![name]]) ?? [],
    ).filter(
      ([name, type]) =>
        !linkedInputs.has(name) && !NodeInputSchema.isLink(type),
    );

    const seed = inputs.findIndex(([key]) => key === "seed");
    if (seed !== -1) {
      inputs.splice(seed + 1, 0, ["control_after_generate", [[]]]);
    }

    const widgetValues: Record<string, any> = {};
    for (const [[name], value] of R.zip(inputs, node.widgets_values ?? [])) {
      widgetValues[name] = value;
    }

    const outputs = [];
    for (const output of node.outputs ?? []) {
      if (output.slot_index !== undefined) {
        outputs[output.slot_index] = output.type;
      }
    }

    pipeline.push(WorkflowStep.newNode(node.type, widgetValues, outputs));
  }

  return pipeline;
}

function patchConditioningNodes(nodes: Node[]) {
  // Add null/undefined check for nodes array
  if (!nodes || !Array.isArray(nodes)) {
    console.warn('patchConditioningNodes: nodes is not a valid array:', nodes);
    return;
  }

  for (const node of nodes) {
    // Add null check for individual node
    if (!node) continue;
    
    const conditioning = node.inputs?.filter(
      (input) => input.type === "CONDITIONING",
    );
    const positive = conditioning?.find((input) => input.name === "positive");
    const negative = conditioning?.find((input) => input.name === "negative");
    if (positive) positive.type = "POSITIVE_CONDITIONING" as LinkTypeId;
    if (negative) negative.type = "NEGATIVE_CONDITIONING" as LinkTypeId;
  }
}

function propagateTypes(nodes: Map<NodeId, Node>, links: Map<LinkId, Link>) {
  for (const node of nodes.values()) {
    for (const input of node.inputs ?? []) {
      const link = links.get(input.link);
      if (!link) {
        console.warn(`Missing link ${input.link} for input ${input.name} in node ${node.id}`);
        continue;
      }
      const [, from, fromSlot] = link;
      const fromNode = nodes.get(from);
      if (!fromNode) {
        console.warn(`Missing source node ${from} for link ${input.link}`);
        continue;
      }
      const output = fromNode.outputs?.find((o) => o.slot_index === fromSlot);
      if (output) {
        output.type = input.type;
      }
    }
  }
}

export function generateGraphMetadata(
  steps: DeepReadonly<WorkflowStep[]>,
  library: DeepReadonly<NodeLibrary>,
): GraphMetadata {
  const expanded = expandAggregates(steps);
  const edges = generateEdges(expanded, library);
  const nodes = generateNodes(expanded, edges);
  return {
    edges,
    nodes,
  };
}

function expandAggregates(
  pipeline: DeepReadonly<WorkflowStep[]>,
): WorkflowStep[] {
  const output: WorkflowStep[] = [];

  for (const step of pipeline) {
    if (WorkflowStep.isAggregate(step)) {
      for (const node of step.nodes) {
        const form: Record<string, any> = {};
        for (const [to, from] of Object.entries(node.formMapping)) {
          form[to] = step.form[from];
        }
        output.push(WorkflowStep.newNode(node.type, form, node.outputs));
      }
    } else {
      output.push(step);
    }
  }
  return output;
}

function generateEdges(
  steps: DeepReadonly<WorkflowStep[]>,
  library: DeepReadonly<NodeLibrary>,
): Edge[] {
  const outputs = new Map<LinkTypeId, [NodeId, SlotId][]>();
  const edges: Edge[] = [];

  let currentNodeId = 0;
  let currentLinkId = 0;

  for (const step of steps) {
    if (WorkflowStep.isShift(step)) {
      const output = outputs.get(step.outputType)!;
      for (let i = 0; i < step.count; i++) {
        output.unshift(output.pop()!);
      }
      continue;
    } else if (WorkflowStep.isPrimitive(step)) {
      if (!outputs.has(step.outputType)) outputs.set(step.outputType, []);
      const output = outputs.get(step.outputType)!;
      output.push([currentNodeId, 0] as [NodeId, SlotId]);
    } else if (WorkflowStep.isNode(step)) {
      const nodeType = library[step.nodeType];
      const inputs = R.concat(
        Object.entries(nodeType.input.required ?? {}),
        Object.entries(nodeType.input.optional ?? {}),
      );

      let currentInputSlot = 0;
      for (const [name, schema] of inputs) {
        if (step.form[name] !== undefined || !NodeInputSchema.isLink(schema))
          continue;
        const type = schema[0];
        const output = outputs.get(type);
        const top = output && R.last(output);
        if (top === undefined) {
          throw new WorkflowGenerateError.MissingInput(step.nodeType, type);
        }
        const [source, sourceSlot] = top;
        edges.push({
          id: currentLinkId as LinkId,
          type,
          name,
          source,
          sourceSlot,
          target: currentNodeId as NodeId,
          targetSlot: currentInputSlot as SlotId,
        });

        currentInputSlot++;
        currentLinkId++;
      }

      let currentOutputSlot = 0;
      for (const type of step.outputTypes ?? nodeType.output) {
        if (type === undefined) {
          currentOutputSlot++;
          continue;
        }

        if (!outputs.has(type)) outputs.set(type, []);
        outputs
          .get(type)!
          .push([currentNodeId as NodeId, currentOutputSlot as SlotId]);
        currentOutputSlot++;
      }
    }

    currentNodeId++;
  }

  return edges;
}

export function generateNodes(
  steps: DeepReadonly<WorkflowStep[]>,
  edges: DeepReadonly<Edge[]>,
): [Node, WorkflowStep][] {
  const nodes: [Node, WorkflowStep][] = [];
  let currentNodeId = 0;

  for (const step of steps) {
    if (WorkflowStep.isShift(step)) continue;

    if (WorkflowStep.isPrimitive(step)) {
      const node: Node = {
        id: currentNodeId as NodeId,
        order: currentNodeId,
        type: "PrimitiveNode" as NodeTypeId,
        outputs: [{ name: "value", type: step.outputType }],
        widgets_values: [step.value, step.control],
      };
      nodes.push([node, step]);
    } else if (WorkflowStep.isNode(step)) {
      const inputs: NodeInput[] = [];
      const outputs: NodeOutput[] = [];
      for (const edge of edges) {
        if (edge.target === currentNodeId) {
          inputs.push({ name: edge.name, type: edge.type, link: edge.id });
        } else if (edge.source === currentNodeId) {
          if (!outputs.some((output) => output.name === edge.name))
            outputs.push({ name: edge.name, type: edge.type, links: [] });
          const output = outputs.find((output) => output.name === edge.name)!;
          output.links!.push(edge.id);
          output.slot_index = (outputs.length - 1) as SlotId;
        }
      }

      const node: Node = {
        id: currentNodeId as NodeId,
        order: currentNodeId,
        type: step.nodeType,
        inputs,
        outputs,
        widgets_values: Object.values(step.form),
      };
      nodes.push([node, step]);
    }

    currentNodeId++;
  }

  return nodes;
}

export interface GraphMetadata {
  edges: Edge[];
  nodes: [Node, WorkflowStep][];
}

export interface Edge {
  id: LinkId;
  type: LinkTypeId;
  name: string;
  source: NodeId;
  sourceSlot: SlotId;
  target: NodeId;
  targetSlot: SlotId;
}

export interface WorkflowStep {
  type: WorkflowStepType;
}

export interface ShiftStep extends WorkflowStep {
  outputType: LinkTypeId;
  count: number;
}

export interface PrimitiveStep extends WorkflowStep {
  outputType: LinkTypeId;
  value: any;
  control: PrimitiveControl;
}

export interface NodeStep extends WorkflowStep {
  nodeType: NodeTypeId;
  form: Record<string, any>;
  outputTypes?: LinkTypeId[];
}

export interface AggregateNodeStep extends WorkflowStep {
  name: string;
  description: string;
  form: Record<string, any>;
  nodes: EmbeddedNode[];
}

export namespace WorkflowStep {
  export function newShift(outputType: LinkTypeId, count: number): ShiftStep {
    return {
      type: WorkflowStepType.Shift,
      outputType,
      count,
    };
  }

  export function isShift(item: WorkflowStep): item is ShiftStep;
  export function isShift(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<ShiftStep>;

  export function isShift(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<ShiftStep> {
    return item.type === WorkflowStepType.Shift;
  }

  export function newPrimitive(
    outputType: LinkTypeId,
    value: any,
    control: PrimitiveControl,
  ): DeepReadonly<PrimitiveStep> {
    return Object.freeze({
      type: WorkflowStepType.Primitive,
      outputType,
      value,
      control,
    });
  }

  export function isPrimitive(item: WorkflowStep): item is PrimitiveStep;
  export function isPrimitive(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<PrimitiveStep>;

  export function isPrimitive(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<PrimitiveStep> {
    return item.type === WorkflowStepType.Primitive;
  }

  export function newNode(
    nodeType: NodeTypeId,
    form: Record<string, any>,
    outputTypes?: readonly LinkTypeId[],
  ): DeepReadonly<NodeStep> {
    return Object.freeze({
      type: WorkflowStepType.Node,
      nodeType,
      form,
      outputTypes,
    });
  }

  export function newNodeWithType(
    type: DeepReadonly<NodeType>,
  ): DeepReadonly<NodeStep> {
    const form: Record<string, any> = {};
    for (const [name, schema] of Object.entries(type.input.required ?? {})) {
      if (NodeInputSchema.isBool(schema)) {
        form[name] = schema[1].default;
      } else if (NodeInputSchema.isInt(schema) && name == "seed") {
        form[name] = schema[1].default;
        form["control_after_generate"] = "fixed";
      } else if (NodeInputSchema.isInt(schema)) {
        form[name] = schema[1].default;
      } else if (NodeInputSchema.isFloat(schema)) {
        form[name] = schema[1].default;
      } else if (NodeInputSchema.isString(schema)) {
        form[name] = "";
      } else if (NodeInputSchema.isList(schema)) {
        form[name] = schema[0][0];
      }
    }
    return newNode(type.name, form);
  }

  export function isNode(item: WorkflowStep): item is NodeStep;
  export function isNode(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<NodeStep>;

  export function isNode(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<NodeStep> {
    return item.type === WorkflowStepType.Node;
  }

  export function newAggregate(
    name: string,
    description: string,
    form: Record<string, any>,
    nodes: EmbeddedNode[],
  ): DeepReadonly<AggregateNodeStep> {
    return Object.freeze({
      type: WorkflowStepType.Aggregate,
      name,
      description,
      form,
      nodes,
    });
  }

  export function isAggregate(item: WorkflowStep): item is AggregateNodeStep;
  export function isAggregate(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<AggregateNodeStep>;

  export function isAggregate(
    item: DeepReadonly<WorkflowStep>,
  ): item is DeepReadonly<AggregateNodeStep> {
    return item.type === WorkflowStepType.Aggregate;
  }
}

export enum WorkflowStepType {
  Shift = "Shift",
  Primitive = "Primitive",
  Node = "Node",
  Aggregate = "Aggregate",
}

export interface EmbeddedNode {
  type: NodeTypeId;
  outputs: LinkTypeId[];
  formMapping: Record<string, string>;
}

export interface WorkflowItem {
  id: string;
  expanded: boolean;
  step: WorkflowStep;
}

export namespace WorkflowItem {
  export function fromStep(
    step: WorkflowStep,
    expanded: boolean = false,
  ): WorkflowItem {
    return {
      id: R.randomString(8),
      expanded,
      step,
    };
  }
}

export abstract class WorkflowLoadRequestError extends Error {
  name = this.constructor.name;
}

export namespace WorkflowLoadRequestError {
  export class EmptyTransfer extends WorkflowLoadRequestError {
    message = "No files were transferred";
  }

  export class MissingWorkflow extends WorkflowLoadRequestError {
    message = "No workflow found in EXIF data";
  }

  export class InvalidWorkflow extends WorkflowLoadRequestError {
    message = "Workflow data is invalid";
  }
}

export abstract class WorkflowLoadError extends Error {
  name = this.constructor.name;
}

export namespace WorkflowLoadError {
  export class MissingInput extends WorkflowLoadError {
    constructor(nodeType: string, inputType: string) {
      super(`Missing input of type ${inputType} for ${nodeType}`);
    }
  }

  export class DuplicateInputType extends WorkflowLoadError {
    constructor(type: string) {
      super(`Unsupported duplicate input type was found at ${type}`);
    }
  }

  export class UnknownNodeType extends WorkflowLoadError {
    constructor(type: string) {
      super(`Unknown node type ${type}`);
    }
  }

  export class InvalidWorkflow extends WorkflowLoadError {
    constructor(reason: string) {
      super(`Invalid workflow: ${reason}`);
    }
  }
}

export abstract class WorkflowGenerateError extends Error {
  name = this.constructor.name;
}

export namespace WorkflowGenerateError {
  export class MissingInput extends WorkflowGenerateError {
    constructor(nodeType: string, inputType: string) {
      super(`Missing input of type ${inputType} for ${nodeType}`);
    }
  }
}
