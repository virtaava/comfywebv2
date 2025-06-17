<script lang="ts">
    import * as R from "remeda";
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import type { DeepReadonly } from "ts-essentials";

    import { NodeInputSchema, type NodeLibrary } from "../lib/comfy";
    import { WorkflowStep, type WorkflowItem } from "../lib/workflow";

    import WorkflowStepComponent from "./WorkflowStepComponent.svelte";

    export let items: WorkflowItem[];
    export let library: DeepReadonly<NodeLibrary>;
    const flipDurationMs = 200;

    function handleUpdate(updated: WorkflowItem[]) {
        items = updated;
    }

    function handleDelete(i: number) {
        items.splice(i, 1);
    }

    function createStepProps(
        step: WorkflowStep,
        library: DeepReadonly<NodeLibrary>,
    ): {
        header: string;
        tooltip: string;
        fields: Record<string, any>;
        schema: DeepReadonly<Record<string, NodeInputSchema>>;
    } {
        if (WorkflowStep.isNode(step)) {
            const type = library[step.nodeType];
            
            // Add null check to prevent crashes when node type not found
            if (!type) {
                console.warn(`Node type ${step.nodeType} not found in library`);
                return {
                    header: step.nodeType + " (missing)",
                    tooltip: "Node type not available in current library",
                    fields: step.form,
                    schema: {},
                };
            }
            
            const schema = R.mapValues<
                Record<string, any>,
                DeepReadonly<NodeInputSchema>
            >(step.form, (_, key) =>
                key === "control_after_generate"
                    ? [["fixed", "increment", "decrement", "randomize"]]
                    : (type.input.required?.[key] ??
                          type.input.optional?.[key])!,
            );
            return {
                header: step.nodeType,
                tooltip: type.description,
                fields: step.form,
                schema,
            };
        } else if (WorkflowStep.isPrimitive(step)) {
            return {
                header: "Primitive",
                tooltip: `Primitive node of type ${step.outputType}`,
                fields: step,
                schema: { value: [step.outputType] },
            };
        } else if (WorkflowStep.isShift(step)) {
            return {
                header: `Shift ${step.outputType.toLowerCase()}`,
                tooltip: `Shifts the the buffer of ${step.outputType}`,
                fields: step,
                schema: { count: ["INT", {}] },
            };
        } else if (WorkflowStep.isAggregate(step)) {
            const schema: Record<string, DeepReadonly<NodeInputSchema>> = {};
            for (const node of step.nodes) {
                for (const from in node.formMapping) {
                    const to = node.formMapping[from];
                    const nodeType = library[node.type];
                    if (nodeType && nodeType.input && nodeType.input.required) {
                        const type = nodeType.input.required[from];
                        if (type !== undefined) schema[to] = type;
                    }
                }
            }
            return {
                header: step.name,
                tooltip: step.description,
                fields: step.form,
                schema: Object.freeze(schema),
            };
        } else {
            throw "unreachable";
        }
    }
</script>

{#if items.length === 0}
    <!-- Enhanced Empty State -->
    <div class="mx-4 my-8 text-center p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border-2 border-dashed border-gray-600/60">
        <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto mb-4 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
        </div>
        <h3 class="text-lg font-semibold text-white mb-3">No Workflow Steps</h3>
        <div class="text-sm text-gray-400 space-y-2">
            <p>Get started by:</p>
            <div class="flex flex-col gap-1 text-xs">
                <span>• Drag & drop a ComfyUI workflow or image</span>
                <span>• Click <strong>Add → Workflow Template</strong></span>
                <span>• Click <strong>Add → Node Type</strong> to build manually</span>
            </div>
        </div>
    </div>
{:else}
    <section
        class="space-y-2 p-2"
        use:dndzone={{ items, flipDurationMs }}
        on:consider={(ev) => handleUpdate(ev.detail.items)}
        on:finalize={(ev) => handleUpdate(ev.detail.items)}
    >
        {#each items as item, idx (item.id)}
            <div animate:flip={{ duration: flipDurationMs }}>
                <WorkflowStepComponent
                    {...createStepProps(item.step, library)}
                    bind:expanded={item.expanded}
                    on:delete={() => handleDelete(idx)}
                />
            </div>
        {/each}
    </section>
{/if}
