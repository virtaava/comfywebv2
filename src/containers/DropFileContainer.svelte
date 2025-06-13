<script lang="ts">
    import { GraphCycleError } from "../lib/graph";
    import {
        loadFromDataTransfer,
        WorkflowItem,
        WorkflowLoadError,
        WorkflowLoadRequestError,
    } from "../lib/workflow";
    import { MissingNodeDetector } from "../lib/missing-nodes";
    import MissingNodesDialog from "../components/MissingNodesDialog.svelte";
    import { errorMessage, library, workflow, serverHost } from "../stores";

    let showMissingNodesDialog = false;
    let missingNodes = [];
    let pendingWorkflowSteps = null;

    const missingNodeDetector = new MissingNodeDetector();

    async function handleDrop(event: DragEvent) {
        console.log('🎯 Drop event triggered');
        
        if (event.dataTransfer) {
            const file = event.dataTransfer.files[0];
            console.log('📁 File:', file?.name, file?.type);
            console.log('📚 Library size:', Object.keys($library || {}).length);
            
            try {
                const steps = await loadFromDataTransfer(
                    event.dataTransfer,
                    $library,
                );
                
                console.log('✅ Steps parsed:', steps?.length);
                
                if (steps) {
                    // Check for missing nodes
                    const missing = await missingNodeDetector.detectMissingNodes(steps, $library);
                    console.log('🔍 Missing nodes detected:', missing.length);
                    
                    if (missing.length > 0) {
                        // Show installation dialog
                        missingNodes = missing;
                        pendingWorkflowSteps = steps;
                        showMissingNodesDialog = true;
                    } else {
                        // No missing nodes, load directly
                        loadWorkflow(steps);
                    }
                }
            } catch (error) {
                console.error('❌ Workflow loading error:', error);
                handleWorkflowError(error);
            }
        }
    }

    function loadWorkflow(steps) {
        workflow.set(steps.map((step) => WorkflowItem.fromStep(step)));
        console.log('✅ Workflow loaded successfully');
    }

    function handleWorkflowError(error) {
        if (error instanceof GraphCycleError) {
            errorMessage.set("The provided workflow contains a cycle");
        } else if (error instanceof WorkflowLoadRequestError) {
            errorMessage.set(
                `Could not load workflow from file: ${error.message}`,
            );
        } else if (error instanceof WorkflowLoadError) {
            errorMessage.set(
                `Failed to create a workflow from file: ${error.message}`,
            );
        } else {
            errorMessage.set(`Unexpected error: ${error.message || error}`);
            console.error('Unexpected error type:', error);
        }
    }

    function handleMissingNodesInstall() {
        // After installation, reload the workflow
        if (pendingWorkflowSteps) {
            loadWorkflow(pendingWorkflowSteps);
            pendingWorkflowSteps = null;
        }
        showMissingNodesDialog = false;
    }

    function handleMissingNodesSkip() {
        // Load workflow anyway, let ComfyUI handle missing nodes
        if (pendingWorkflowSteps) {
            loadWorkflow(pendingWorkflowSteps);
            pendingWorkflowSteps = null;
        }
        showMissingNodesDialog = false;
    }

    function handleMissingNodesClose() {
        pendingWorkflowSteps = null;
        showMissingNodesDialog = false;
    }
</script>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<MissingNodesDialog
    bind:isOpen={showMissingNodesDialog}
    {missingNodes}
    serverHost={$serverHost}
    on:install={handleMissingNodesInstall}
    on:skip={handleMissingNodesSkip}
    on:close={handleMissingNodesClose}
/>
