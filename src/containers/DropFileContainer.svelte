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

    async function tryDetectMissingNodesFromRawFile(file, originalError) {
        console.log('🔍 tryDetectMissingNodesFromRawFile called');
        try {
            console.log('🔍 File for raw parsing:', file?.name);
            if (!file) {
                console.log('🔍 No file found');
                return null;
            }

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const body = ev.target.result;
                        let workflowData = null;

                        if (file.name.endsWith('.json')) {
                            // Parse JSON workflow
                            const str = new TextDecoder().decode(body);
                            workflowData = JSON.parse(str);
                        } else {
                            // Try to extract from image EXIF
                            const ExifReader = (await import('exifreader')).default;
                            const tags = ExifReader.load(body);
                            if (tags.workflow && tags.workflow.value) {
                                workflowData = JSON.parse(tags.workflow.value);
                            }
                        }

                        if (workflowData && workflowData.nodes) {
                            // Extract node types from raw workflow
                            const nodeTypes = new Set();
                            for (const node of workflowData.nodes) {
                                if (node.type && node.type !== 'PrimitiveNode') {
                                    nodeTypes.add(node.type);
                                }
                            }

                            // Check which nodes are missing from library
                            const missingNodeTypes = Array.from(nodeTypes).filter(
                                nodeType => !$library[nodeType]
                            );

                            console.log('🔍 All node types found:', Array.from(nodeTypes));
                            console.log('🔍 Missing node types:', missingNodeTypes);

                            if (missingNodeTypes.length > 0) {
                                console.log('🔍 Raw workflow missing nodes:', missingNodeTypes);
                                // Create missing node info objects
                                const missing = await missingNodeDetector.getMissingNodeInfo(missingNodeTypes);
                                console.log('🔍 Missing node info:', missing);
                                resolve(missing);
                                return;
                            }
                        }
                    } catch (parseError) {
                        console.log('📝 Could not parse workflow for missing nodes detection:', parseError);
                    }
                    resolve(null);
                };
                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            console.log('📝 Error in raw workflow missing nodes detection:', error);
            return null;
        }
    }

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
                console.log('🔍 Starting missing nodes detection from raw workflow...');
                
                // Try to detect missing nodes even if parsing failed
                try {
                    const missing = await tryDetectMissingNodesFromRawFile(file, error);
                    console.log('🔍 Missing nodes detection result:', missing);
                    
                    if (missing && missing.length > 0) {
                        console.log('🔍 Missing nodes detected from failed workflow:', missing.length);
                        missingNodes = missing;
                        pendingWorkflowSteps = null; // No valid steps to load
                        showMissingNodesDialog = true;
                        console.log('🔍 Missing nodes dialog should now be visible');
                        return; // Exit early, don't show error toast
                    } else {
                        console.log('🔍 No missing nodes found, will show error toast');
                    }
                } catch (missingNodesError) {
                    console.log('📝 Failed to detect missing nodes from raw workflow:', missingNodesError);
                }
                
                console.log('🔍 Showing regular error message');
                // Not a missing nodes issue, show regular error
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
        } else {
            // No valid workflow steps to load, just close dialog
            console.log('📝 No valid workflow steps to load, workflow parsing failed due to missing nodes');
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
