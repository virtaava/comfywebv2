<script lang="ts">
    import * as R from "remeda";
    import type { DeepReadonly } from "ts-essentials";

    import {
        createComfyWorkflow,
        createPromptRequest,
        getPromptRequestUrl,
    } from "../lib/api";
    import { type PromptError, type PromptResponse } from "../lib/comfy";
    import { GalleryItem } from "../lib/gallery";
    import {
        generateGraphMetadata,
        WorkflowGenerateError,
        WorkflowItem,
        WorkflowStep,
    } from "../lib/workflow";
    import {
        library,
        workflow,
        gallery,
        errorMessage,
        serverHost,
        savedWorkflows,
        generationState,
    } from "../stores";
    import { interruptGeneration } from "../lib/api";
    import { workflowStorage } from "../lib/workflow-storage-filesystem";
    import SaveWorkflowDialog from "../components/SaveWorkflowDialog_Simple.svelte";
    import { infoMessage } from "../stores";

    import SidebarComponent from "../components/SidebarComponent.svelte";

    let showSaveDialog = false;

    // Load saved workflows on component mount
    function loadSavedWorkflows() {
        const metadata = workflowStorage.getWorkflowMetadata();
        savedWorkflows.set(metadata);
    }
    
    // Load saved workflows on init
    loadSavedWorkflows();

    async function handleEnqueue(items: WorkflowItem[]) {
        const steps = items.map((item) => item.step);
        try {
            const graph = generateGraphMetadata(steps, $library);
            const req = createPromptRequest(graph, steps);
            const res = await fetch(getPromptRequestUrl($serverHost), {
                body: JSON.stringify(req),
                method: "POST",
            });
            if (res.ok) {
                const data = (await res.json()) as PromptResponse;
                
                // Update generation state
                generationState.set({
                    isGenerating: true,
                    currentPromptId: data.prompt_id
                });
                
                gallery.update((state) => {
                    const item = GalleryItem.newQueued(
                        data.prompt_id,
                        R.clone(items),
                    );
                    state[data.prompt_id] = item;
                    return state;
                });
                workflow.update((items) => {
                    for (const { step } of items) {
                        performControlAfterGenerate(step);
                    }
                    return items;
                });
            } else {
                const error: PromptError = await res.json();
                errorMessage.set(formatPromptError(error));
            }
        } catch (error) {
            if (error instanceof WorkflowGenerateError) {
                errorMessage.set(
                    `Could not generate a graph: ${error.message}`,
                );
            } else if (error instanceof Error) {
                errorMessage.set(`Could not send request: ${error.message}`);
            } else {
                console.error(error);
            }
        }
    }

    function handleSaveWorkflow(items: DeepReadonly<WorkflowItem[]>) {
        // Show save dialog
        showSaveDialog = true;
    }

    async function handleStopGeneration() {
        try {
            await interruptGeneration($serverHost);
            generationState.set({
                isGenerating: false,
                currentPromptId: undefined
            });
            infoMessage.set("Generation stopped successfully");
        } catch (error) {
            errorMessage.set(`Failed to stop generation: ${error.message}`);
        }
    }

    async function handleExportWorkflows() {
        try {
            await workflowStorage.exportAllWorkflows();
            infoMessage.set("Workflows exported successfully!");
        } catch (error) {
            errorMessage.set("Failed to export workflows");
        }
    }

    async function handleImportWorkflows(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            const result = await workflowStorage.importWorkflows(file);
            if (result.success > 0) {
                infoMessage.set(`Imported ${result.success} workflow(s) successfully!`);
                loadSavedWorkflows(); // Refresh the list
            }
            if (result.errors.length > 0) {
                errorMessage.set(`Import completed with errors: ${result.errors.join(', ')}`);
            }
        } catch (error) {
            errorMessage.set("Failed to import workflows");
        }

        // Clear the input
        input.value = '';
    }

    function handleSaveWorkflowLocal(event: CustomEvent<{ id: string; name: string }>) {
        const { name } = event.detail;
        infoMessage.set(`Workflow "${name}" saved successfully!`);
        loadSavedWorkflows(); // Refresh the saved workflows list
    }

    function handleSaveAsComfyUIWorkflow(items: DeepReadonly<WorkflowItem[]>) {
        const steps = items.map((item) => item.step);
        const graph = generateGraphMetadata(steps, $library);
        downloadJson(createComfyWorkflow(graph));
    }

    function handleShowError(error: string) {
        errorMessage.set(error);
    }

    function performControlAfterGenerate(step: WorkflowStep) {
        if (WorkflowStep.isNode(step)) {
            if (
                step.form.seed !== undefined &&
                step.form.control_after_generate
            ) {
                switch (step.form.control_after_generate) {
                    case "increment":
                        step.form.seed++;
                        break;
                    case "decrement":
                        step.form.seed--;
                        break;
                    case "randomize":
                        step.form.seed = randomInteger(
                            0,
                            Number.MAX_SAFE_INTEGER,
                        );
                        break;
                }
            }
        }
    }

    function formatPromptError(error: DeepReadonly<PromptError>): string {
        let message = `${error.error.message}. `;
        for (const [, e] of Object.entries(error.node_errors ?? {})) {
            message += `${e.class_type}: ${e.errors.map((e) => e.message).join(", ")}. `;
        }
        return message;
    }

    function randomInteger(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function downloadJson(data: any) {
        const file = new Blob([JSON.stringify(data)], {
            type: "application/json",
        });
        const saver = document.createElement("a");
        const href = (saver.href = URL.createObjectURL(file));
        saver.download = "workflow.json";

        const body = document.body;
        body.appendChild(saver);
        saver.click();

        setTimeout(() => {
            document.body.removeChild(saver);
            window.URL.revokeObjectURL(href);
        }, 0);
    }
</script>

<SidebarComponent
    bind:workflow={$workflow}
    bind:serverHost={$serverHost}
    library={$library}
    generationState={$generationState}
    on:enqueue={(ev) => handleEnqueue(ev.detail)}
    on:stopGeneration={handleStopGeneration}
    on:saveWorkflow={(ev) => handleSaveWorkflow(ev.detail)}
    on:saveAsComfyUIWorkflow={(ev) => handleSaveAsComfyUIWorkflow(ev.detail)}
    on:exportWorkflows={handleExportWorkflows}
    on:importWorkflows={(ev) => handleImportWorkflows(ev.detail)}
    on:showError={(ev) => handleShowError(ev.detail)}
/>

<!-- SaveWorkflowDialog enabled with simple version -->
<SaveWorkflowDialog
    bind:isOpen={showSaveDialog}
    workflowSteps={$workflow.map(item => item.step)}
    on:saved={handleSaveWorkflowLocal}
    on:close={() => showSaveDialog = false}
/>
