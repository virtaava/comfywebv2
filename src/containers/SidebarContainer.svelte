<script lang="ts">
    import * as R from "remeda";
    import type { DeepReadonly } from "ts-essentials";

    import {
        createComfyWorkflow,
        createPromptRequest,
        getPromptRequestUrl,
        submitWorkflowForExecution,
    } from "../lib/api";
    import { type PromptError, type PromptResponse } from "../lib/comfy";
    import {
        generateGraphMetadata,
        WorkflowGenerateError,
        WorkflowItem,
        WorkflowStep,
    } from "../lib/workflow";
    import {
        library,
        workflow,
        errorMessage,
        serverHost,
        savedWorkflows,
        generationState,
    } from "../stores";
    import { interruptGeneration } from "../lib/api";
    import { workflowStorage } from "../lib/workflow-storage";
    import SaveWorkflowDialog from "../components/SaveWorkflowDialog_Simple.svelte";
    import { infoMessage } from "../stores";

    import SidebarComponent from "../components/SidebarComponent.svelte";

    let showSaveDialog = false;

    // Debug reactive statement
    $: console.log('🔧 [Debug] showSaveDialog changed to:', showSaveDialog);

    // CONSOLIDATION: Simplified workflow refresh - no longer needed!
    // The savedWorkflows store is now derived from WorkflowStorageManager
    // and updates automatically. Just trigger the update.
    function refreshSavedWorkflows() {
        // Import the trigger function
        import('../stores').then(({ triggerWorkflowStorageUpdate }) => {
            triggerWorkflowStorageUpdate();
        });
        console.log('🔄 [My Workflows] Triggered workflow storage update (consolidated system)');
    }
    
    // Load saved workflows on init
    refreshSavedWorkflows();

    // Debug utility - expose to window for console access
    if (typeof window !== 'undefined') {
        (window as any).comfyWebDebug = {
            clearWorkflows: () => {
                workflowStorage.clearAllWorkflows();
                refreshSavedWorkflows();
                console.log('🧹 [Debug] All workflows cleared. Refresh saved workflows.');
            },
            listWorkflows: () => {
                const metadata = workflowStorage.getWorkflowMetadata();
                console.log('📋 [Debug] Current workflows:', metadata);
                return metadata;
            },
            inspectLocalStorage: () => {
                const data = localStorage.getItem('comfyweb_saved_workflows');
                console.log('🔍 [Debug] Raw localStorage data:', data);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log('🔍 [Debug] Parsed localStorage data:', parsed);
                        return parsed;
                    } catch (error) {
                        console.error('🚨 [Debug] Failed to parse localStorage data:', error);
                    }
                }
                return null;
            }
        };
        console.log('🔧 [Debug] Debug utilities available: window.comfyWebDebug.clearWorkflows(), window.comfyWebDebug.listWorkflows(), window.comfyWebDebug.inspectLocalStorage()');
    }

    async function handleEnqueue(items: WorkflowItem[]) {
        const steps = items.map((item) => item.step);
        try {
            const graph = generateGraphMetadata(steps, $library);
            const req = createPromptRequest(graph, steps);
            
            // Use new submission function that tracks prompt IDs for gallery
            const result = await submitWorkflowForExecution($serverHost, req);
            
            if (result.success && result.promptId) {
                console.log('✅ [Workflow Execution] Workflow submitted successfully:', result.promptId);
                
                // Update generation state
                generationState.set({
                    isGenerating: true,
                    currentPromptId: result.promptId
                });
                
                // Gallery integration happens automatically via addPromptToGallery() in submitWorkflowForExecution()
                
                // Update workflow controls
                workflow.update((items) => {
                    for (const { step } of items) {
                        performControlAfterGenerate(step);
                    }
                    return items;
                });
                
                console.log('🎯 [Gallery Integration] Prompt ID automatically tracked by gallery system:', result.promptId);
            } else {
                console.error('❌ [Workflow Execution] Submission failed:', result.error);
                errorMessage.set(result.error || 'Failed to submit workflow');
            }
        } catch (error) {
            console.error('❌ [Workflow Execution] Unexpected error:', error);
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
        console.log('🔧 [Debug] handleSaveWorkflow called with', items.length, 'items');
        console.log('🔧 [Debug] Setting showSaveDialog to true');
        // Show save dialog
        showSaveDialog = true;
        console.log('🔧 [Debug] showSaveDialog is now:', showSaveDialog);
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
            // CONSOLIDATION: Trigger automatic update - no manual refresh needed
              // refreshSavedWorkflows(); // Not needed anymore - WorkflowStorageManager triggers update
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
        console.log('🔧 [Debug] handleSaveWorkflowLocal called with:', event.detail);
        const { name } = event.detail;
        infoMessage.set(`Workflow "${name}" saved successfully!`);
        refreshSavedWorkflows(); // Refresh the saved workflows list
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
    on:refreshSavedWorkflows={refreshSavedWorkflows}
/>

<!-- SaveWorkflowDialog enabled with simple version -->
<SaveWorkflowDialog
    bind:isOpen={showSaveDialog}
    workflowSteps={$workflow.map(item => item.step)}
    on:saved={handleSaveWorkflowLocal}
    on:close={() => {
        console.log('🔧 [Debug] Dialog close event triggered');
        showSaveDialog = false;
    }}
/>
