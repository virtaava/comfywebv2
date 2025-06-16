<script lang="ts">
    import * as R from "remeda";
    import { createEventDispatcher } from "svelte";
    import type { DeepReadonly } from "ts-essentials";

    import { Button, Input, Label, TabItem, Tabs } from "flowbite-svelte";
    import { ChevronDownOutline } from "flowbite-svelte-icons";

    import { type NodeLibrary } from "../lib/comfy";
    import { createPickerTree, NodePickerValue } from "../lib/picker";
    import { WorkflowItem, WorkflowStep } from "../lib/workflow";
    import { workflowStorage } from "../lib/workflow-storage";
    import { savedWorkflows, workflowDocumentation } from "../stores";

    import TreeDropdownComponent from "./TreeDropdownComponent.svelte";
    import WorkflowComponent from "./WorkflowComponent.svelte";
    import GalleryTab from "./GalleryTab.svelte";
    import WorkflowDocumentationPanel from "./WorkflowDocumentationPanel.svelte";
    import WorkflowManagement from "./WorkflowManagement.svelte";

    export let workflow: WorkflowItem[];
    export let library: DeepReadonly<NodeLibrary>;
    export let serverHost: string;
    export let generationState: { isGenerating: boolean; currentPromptId?: string };

    let showWorkflowManagement = false;

    const dispatch = createEventDispatcher<{
        enqueue: WorkflowItem[];
        stopGeneration: void;
        saveWorkflow: DeepReadonly<WorkflowItem[]>;
        saveAsComfyUIWorkflow: DeepReadonly<WorkflowItem[]>;
        exportWorkflows: void;
        importWorkflows: Event;
        showError: string;
        refreshSavedWorkflows: void;
    }>();

    let fileInput: HTMLInputElement;

    function onDropdownSelect(value: DeepReadonly<NodePickerValue>) {
        if (NodePickerValue.isNode(value)) {
            workflow = [
                ...workflow,
                WorkflowItem.fromStep(
                    WorkflowStep.newNodeWithType(value.nodeType),
                    true,
                ),
            ];
        } else if (NodePickerValue.isAggregate(value)) {
            const result = validateStep(value.step);
            if (result !== undefined) {
                dispatch("showError", result);
                return;
            }

            workflow = [
                ...workflow,
                WorkflowItem.fromStep(R.clone(value.step), true),
            ];
        } else if (NodePickerValue.isWorkflowTemplate(value)) {
            const result = R.reduce<WorkflowStep, string | undefined>(
                value.steps,
                (acc, step) => acc ?? validateStep(step),
                undefined,
            );
            if (result !== undefined) {
                dispatch("showError", result);
                return;
            }

            workflow = value.steps.map((step) =>
                WorkflowItem.fromStep(R.clone(step), true),
            );
        } else if (NodePickerValue.isSavedWorkflow(value)) {
            // Load saved workflow
            const savedWorkflow = workflowStorage.loadWorkflow(value.metadata.id);
            if (savedWorkflow) {
                const result = R.reduce<WorkflowStep, string | undefined>(
                    savedWorkflow.steps,
                    (acc, step) => acc ?? validateStep(step),
                    undefined,
                );
                if (result !== undefined) {
                    dispatch("showError", result);
                    return;
                }

                workflow = savedWorkflow.steps.map((step) =>
                    WorkflowItem.fromStep(R.clone(step), true),
                );
                
                console.log('✅ [My Workflows] Loaded saved workflow:', savedWorkflow.name);
            } else {
                dispatch("showError", "Could not load saved workflow");
            }
        }
    }

    function handleWorkflowManagementClose() {
        showWorkflowManagement = false;
    }

    function handleWorkflowsChanged() {
        dispatch('refreshSavedWorkflows');
    }

    function handleLoadWorkflow(event: CustomEvent<{ id: string }>) {
        const savedWorkflow = workflowStorage.loadWorkflow(event.detail.id);
        if (savedWorkflow) {
            const result = R.reduce<WorkflowStep, string | undefined>(
                savedWorkflow.steps,
                (acc, step) => acc ?? validateStep(step),
                undefined,
            );
            if (result !== undefined) {
                dispatch("showError", result);
                return;
            }

            workflow = savedWorkflow.steps.map((step) =>
                WorkflowItem.fromStep(R.clone(step), true),
            );
            
            console.log('✅ [Workflow Management] Loaded workflow from management:', savedWorkflow.name);
        } else {
            dispatch("showError", "Could not load saved workflow");
        }
    }

    function validateStep(
        step: DeepReadonly<WorkflowStep>,
    ): string | undefined {
        if (WorkflowStep.isNode(step)) {
            if (library[step.nodeType] === undefined)
                return `Node type ${step.nodeType} not found`;
        } else if (WorkflowStep.isAggregate(step)) {
            const bad = step.nodes.find(
                (node) => library[node.type] === undefined,
            );
            if (bad !== undefined) return `Node type ${bad.type} not found`;
        }
    }
</script>

<div class="w-[568px] h-full flex flex-col border-r-2 border-zinc-700">
    <!-- ComfyWeb v2 Header -->
    <div class="bg-gradient-to-r from-purple-900 to-blue-900 px-4 py-3 border-b border-zinc-700">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-xl font-bold text-white tracking-wide">
                    ComfyWeb <span class="text-purple-300 text-sm font-semibold">v2</span>
                </h1>
                <p class="text-xs text-gray-300 opacity-75">Enhanced Workflow Interface</p>
            </div>
            <div class="text-purple-400">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
            </div>
        </div>
    </div>
    
    <Tabs tabStyle="underline" contentClass="overflow-y-scroll">
        <TabItem open title="Workflow">
            <!-- Workflow Documentation Panel -->
            {#if $workflowDocumentation.length > 0}
                <div class="px-4 pt-4">
                    <WorkflowDocumentationPanel documentation={$workflowDocumentation} />
                </div>
            {/if}
            
            <WorkflowComponent bind:items={workflow} {library} />
        </TabItem>
        <TabItem title="Manage">
            <div class="p-4 grid grid-cols-1 gap-2">
                <Button
                    color="light"
                    on:click={() => dispatch("saveWorkflow", workflow)}
                >
                    Save workflow
                </Button>
                <Button
                    color="light"
                    on:click={() => dispatch("saveAsComfyUIWorkflow", workflow)}
                >
                    Save as ComfyUI workflow
                </Button>
                
                <h2 class="mt-4">Workflow Management</h2>
                <Button
                    color="purple"
                    size="sm"
                    on:click={() => showWorkflowManagement = true}
                    disabled={$savedWorkflows.length === 0}
                >
                    Manage Workflows ({$savedWorkflows.length})
                </Button>
                <Button
                    color="blue"
                    size="sm"
                    on:click={() => dispatch("exportWorkflows")}
                >
                    Export All Workflows
                </Button>
                
                <input
                    type="file"
                    accept=".json"
                    on:change={(e) => dispatch("importWorkflows", e)}
                    style="display: none;"
                    bind:this={fileInput}
                />
                <Button
                    color="green"
                    size="sm"
                    on:click={() => fileInput?.click()}
                >
                    Import Workflows
                </Button>

                <h2 class="mt-4">Settings</h2>
                <Label for="url">ComfyUI server host</Label>
                <Input id="url" type="text" bind:value={serverHost} />
            </div>
        </TabItem>
        <TabItem title="Gallery">
            <GalleryTab />
        </TabItem>

        <div class="flex flex-row flex-1 align-middle justify-end">
            <Button color="light" size="sm" class="my-2 mr-1">
                Add
                <ChevronDownOutline class="ms-2" />
            </Button>
            <TreeDropdownComponent
                tree={createPickerTree(library, $savedWorkflows)}
                on:select={(ev) => onDropdownSelect(ev.detail)}
            />
            {#if generationState.isGenerating}
                <Button
                    class="my-2 mr-1"
                    size="sm"
                    color="red"
                    on:click={() => dispatch("stopGeneration")}
                >
                    Stop
                </Button>
            {:else}
                <Button
                    class="my-2 mr-1"
                    size="sm"
                    color="purple"
                    on:click={() => dispatch("enqueue", workflow)}
                >
                    Generate
                </Button>
            {/if}
        </div>
    </Tabs>
</div>

<!-- Workflow Management Modal -->
<WorkflowManagement
    bind:isOpen={showWorkflowManagement}
    workflows={$savedWorkflows}
    on:close={handleWorkflowManagementClose}
    on:workflowsChanged={handleWorkflowsChanged}
    on:loadWorkflow={handleLoadWorkflow}
/>
