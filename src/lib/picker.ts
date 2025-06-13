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
    metadata?: {
      name: string;
      description: string;
      difficulty: string;
      estimated_time: string;
      example_prompts?: string[];
    };
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

// Helper function to extract templates from new categorized structure
function extractTemplatesFromCategories(): Record<string, any> {
  const extractedTemplates: Record<string, any> = {};
  
  // Handle new categorized structure
  if (templates.categories) {
    // Extract from universal templates
    if (templates.categories.universal?.subcategories) {
      for (const [subcatKey, subcategory] of Object.entries(templates.categories.universal.subcategories)) {
        if (subcategory.templates) {
          for (const [templateKey, templateData] of Object.entries(subcategory.templates)) {
            const displayName = `${templateData.metadata.name} (${subcategory.name.replace(/📸|🖼️|🔍|📦/g, '').trim()})`;
            extractedTemplates[displayName] = {
              ...templateData.workflow,
              metadata: templateData.metadata
            };
          }
        }
      }
    }
    
    // Extract legacy templates for compatibility
    if (templates.categories.legacy?.templates) {
      for (const [templateKey, templateData] of Object.entries(templates.categories.legacy.templates)) {
        extractedTemplates[templateKey] = templateData;
      }
    }
  } else {
    // Fallback to old flat structure
    return templates as Record<string, any>;
  }
  
  return extractedTemplates;
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
    },
    leaves: {},
  };

  // Handle new categorized template structure
  if (templates.categories?.universal?.subcategories) {
    // Create categorized template structure
    const templateTree: PickerTree<NodePickerValue> = {
      subtrees: {},
      leaves: {},
    };

    // Add Universal Templates with subcategories
    for (const [subcatKey, subcategory] of Object.entries(templates.categories.universal.subcategories)) {
      if (subcategory.templates) {
        const subcategoryTree: PickerTree<NodePickerValue> = {
          subtrees: {},
          leaves: {},
        };

        for (const [templateKey, templateData] of Object.entries(subcategory.templates)) {
          const difficultyIcon = templateData.metadata.difficulty === 'beginner' ? '⭐' : 
                                templateData.metadata.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐';
          
          const displayName = `${templateData.metadata.name} ${difficultyIcon}`;
          
          subcategoryTree.leaves[displayName] = {
            type: "workflowTemplate",
            steps: templateData.workflow,
            metadata: {
              name: templateData.metadata.name,
              description: templateData.metadata.description,
              difficulty: templateData.metadata.difficulty,
              estimated_time: templateData.metadata.estimated_time,
              example_prompts: templateData.metadata.example_prompts,
            },
          };
        }

        templateTree.subtrees[subcategory.name] = subcategoryTree;
      }
    }

    pickerTree.subtrees["Universal Templates"] = templateTree;

    // Add legacy templates if they exist
    if (templates.categories.legacy?.templates) {
      const legacyTemplates: Record<string, NodePickerValue> = {};
      
      for (const [templateKey, templateData] of Object.entries(templates.categories.legacy.templates)) {
        legacyTemplates[`${templateKey} (Legacy)`] = {
          type: "workflowTemplate",
          steps: Array.isArray(templateData) ? templateData : [],
        };
      }

      pickerTree.subtrees["📚 Legacy Templates"] = {
        subtrees: {},
        leaves: legacyTemplates,
      };
    }
  } else {
    // Fallback to old flat structure
    const extractedTemplates = extractTemplatesFromCategories();
    pickerTree.subtrees["Workflow Template"] = {
      subtrees: {},
      leaves: R.mapValues(extractedTemplates, (template) => ({
        type: "workflowTemplate",
        steps: Array.isArray(template) ? template : template.workflow || template,
        metadata: template.metadata,
      })),
    };
  }

  // Add saved workflows section if there are any
  if (savedWorkflows.length > 0) {
    pickerTree.subtrees["📁 My Workflows"] = {
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