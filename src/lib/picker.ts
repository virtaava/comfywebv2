import * as R from "remeda";
import type { DeepReadonly } from "ts-essentials";

import type { LinkTypeId, NodeLibrary, NodeType, NodeTypeId } from "./comfy";
import { WorkflowStep, type AggregateNodeStep } from "./workflow";
import type { WorkflowMetadata } from "./workflow-storage";
import templates from "../data/templates.json";

export interface PickerTree<A> {
  subtrees: Record<string, PickerTree<A>>;
  leaves: Record<string, A>;
}

export interface NodePickerValue {
  type: string;
}

export namespace NodePickerValue {
  export interface Node extends NodePickerValue {
    type: "node";
    nodeType: NodeType;
  }

  export interface Aggregate extends NodePickerValue {
    type: "aggregate";
    step: AggregateNodeStep;
  }

  export interface WorkflowTemplate extends NodePickerValue {
    type: "workflowTemplate";
    steps: WorkflowStep[];
  }

  export interface SavedWorkflow extends NodePickerValue {
    type: "savedWorkflow";
    metadata: WorkflowMetadata;
  }

  export function isNode(
    value: DeepReadonly<NodePickerValue>,
  ): value is DeepReadonly<Node> {
    return value.type === "node";
  }

  export function isAggregate(
    value: DeepReadonly<NodePickerValue>,
  ): value is DeepReadonly<Aggregate> {
    return value.type === "aggregate";
  }

  export function isWorkflowTemplate(
    value: DeepReadonly<NodePickerValue>,
  ): value is DeepReadonly<WorkflowTemplate> {
    return value.type === "workflowTemplate";
  }

  export function isSavedWorkflow(
    value: DeepReadonly<NodePickerValue>,
  ): value is DeepReadonly<SavedWorkflow> {
    return value.type === "savedWorkflow";
  }
}

export function createPickerTree(
  library: DeepReadonly<NodeLibrary>,
  savedWorkflows: DeepReadonly<WorkflowMetadata[]> = []
): DeepReadonly<PickerTree<NodePickerValue>> {
  const pickerTree: PickerTree<NodePickerValue> = {
    subtrees: {
      "Comfy Node": createNodeTree(library),
      "Utility Step": {
        subtrees: {},
        leaves: R.mapToObj(aggregateNodes, (step) => [
          step.name,
          {
            type: "aggregate",
            step,
          },
        ]),
      },
      "Workflow Template": {
        subtrees: {
          "📸 Text to Image": {
            subtrees: {},
            leaves: {
              "SDXL Basic": {
                type: "workflowTemplate",
                steps: templates["SDXL Basic"],
              },
              "SD 1.5 Classic": {
                type: "workflowTemplate",
                steps: templates["SD 1.5 Classic"],
              },
              "Flux GGUF": {
                type: "workflowTemplate",
                steps: templates["Flux GGUF"],
              },
            },
          },
          "🖼️ Image to Image": {
            subtrees: {},
            leaves: {
              "Basic Image to Image": {
                type: "workflowTemplate",
                steps: templates["Basic Image to Image"],
              },
              "SDXL Image to Image": {
                type: "workflowTemplate",
                steps: templates["SDXL Image to Image"],
              },
              "SD 1.5 Image to Image": {
                type: "workflowTemplate",
                steps: templates["SD 1.5 Image to Image"],
              },
            },
          },
          "🔍 Upscaling & Enhancement": {
            subtrees: {},
            leaves: {
              "Upscale & Enhance": {
                type: "workflowTemplate",
                steps: templates["Upscale & Enhance"],
              },
              "Latent Upscaling": {
                type: "workflowTemplate",
                steps: templates["Latent Upscaling"],
              },
            },
          },
          "📦 Batch Processing": {
            subtrees: {},
            leaves: {
              "Batch Generation": {
                type: "workflowTemplate",
                steps: templates["Batch Generation"],
              },
            },
          },
          "⚡ Advanced": {
            subtrees: {},
            leaves: {
              "SDXL + LoRA": {
                type: "workflowTemplate",
                steps: templates["SDXL + LoRA"],
              },
              "Multi-LoRA Style Fusion": {
                type: "workflowTemplate",
                steps: templates["Multi-LoRA Style Fusion"],
              },
              "Inpainting": {
                type: "workflowTemplate",
                steps: templates["Inpainting"],
              },
              "ControlNet Pose Control": {
                type: "workflowTemplate",
                steps: templates["ControlNet Pose Control"],
              },
              "Professional Portrait": {
                type: "workflowTemplate",
                steps: templates["Professional Portrait"],
              },
            },
          },
        },
        leaves: {},
      },
    },
    leaves: {},
  };

  // Add saved workflows section if there are any
  if (savedWorkflows.length > 0) {
    pickerTree.subtrees["My Workflows"] = {
      subtrees: {},
      leaves: R.mapToObj(savedWorkflows, (workflow) => [
        workflow.name,
        {
          type: "savedWorkflow",
          metadata: workflow,
        },
      ]),
    };
  }

  return pickerTree;
}

function createNodeTree(
  library: DeepReadonly<NodeLibrary>,
): DeepReadonly<PickerTree<NodePickerValue>> {
  const byCategory = R.groupBy(Object.values(library), (node) => node.category);
  const tree: PickerTree<NodePickerValue> = {
    subtrees: {},
    leaves: {},
  };

  for (const [category, nodes] of Object.entries(byCategory)) {
    const parts = category.split("/");
    let current = tree;

    for (const part of parts) {
      if (!current.subtrees[part]) {
        current.subtrees[part] = {
          subtrees: {},
          leaves: {},
        };
      }
      current = current.subtrees[part];
    }
    for (const node of nodes) {
      const value: DeepReadonly<NodePickerValue.Node> = {
        type: "node",
        nodeType: node,
      };
      current.leaves[node.name] = value;
    }
  }
  return tree;
}

const aggregateNodes: DeepReadonly<AggregateNodeStep[]> = [
  WorkflowStep.newAggregate(
    "Prompt",
    "Provides both positive and negative conditioning in a single step.",
    {
      positive: "",
      negative: "",
    },
    [
      {
        type: "CLIPTextEncode" as NodeTypeId,
        outputs: ["POSITIVE_CONDITIONING" as LinkTypeId],
        formMapping: { text: "positive" },
      },
      {
        type: "CLIPTextEncode" as NodeTypeId,
        outputs: ["NEGATIVE_CONDITIONING" as LinkTypeId],
        formMapping: { text: "negative" },
      },
    ],
  ),
  WorkflowStep.newAggregate(
    "Decode&Preview Image",
    "Performs VAEDecode and PreviewImage in a single step.",
    {},
    [
      {
        type: "VAEDecode" as NodeTypeId,
        outputs: ["IMAGE" as LinkTypeId],
        formMapping: {},
      },
      {
        type: "PreviewImage" as NodeTypeId,
        outputs: [],
        formMapping: {},
      },
    ],
  ),
];
