<script lang="ts">
    import { GraphCycleError } from "../lib/graph";
    import {
        loadFromDataTransfer,
        WorkflowItem,
        WorkflowLoadError,
        WorkflowLoadRequestError,
    } from "../lib/workflow";
    import { MissingNodeDetector, extractWorkflowDocumentation, createMissingNodeDetector } from "../lib/missing-nodes";
    import { validateWorkflowWithBackend, type WorkflowValidationResult } from "../lib/api";
    import EnhancedMissingNodesDialog from "../components/EnhancedMissingNodesDialog.svelte";
    import { errorMessage, library, workflow, serverHost, missingNodesState, workflowDocumentation } from "../stores";

    let pendingWorkflowSteps = null;
    let missingNodeDetector = null;

    // Initialize missing node detector when serverHost changes
    $: if ($serverHost && !missingNodeDetector) {
        missingNodeDetector = createMissingNodeDetector($serverHost);
    }

    async function extractRawWorkflowData(file) {
        if (!file) return null;
        
        try {
            const reader = new FileReader();
            return new Promise((resolve) => {
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
                        
                        resolve(workflowData);
                    } catch (parseError) {
                        console.log('📝 Could not parse workflow for backend validation:', parseError);
                        resolve(null);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            console.log('📝 Error extracting raw workflow data:', error);
            return null;
        }
    }

    async function extractDocumentationFromFile(file) {
        if (!file) {
            workflowDocumentation.set([]);
            return;
        }

        try {
            const reader = new FileReader();
            return new Promise((resolve) => {
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
                            // Extract documentation from MarkdownNote nodes
                            const documentationNodes = extractWorkflowDocumentation(workflowData);
                            console.log('📋 Extracted workflow documentation:', documentationNodes.length, 'notes');
                            workflowDocumentation.set(documentationNodes);
                        } else {
                            workflowDocumentation.set([]);
                        }
                    } catch (parseError) {
                        console.log('📋 Could not parse workflow for documentation extraction:', parseError);
                        workflowDocumentation.set([]);
                    }
                    resolve();
                };
                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            console.log('📋 Error extracting documentation:', error);
            workflowDocumentation.set([]);
        }
    }

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
                            // Extract documentation from MarkdownNote nodes
                            const documentationNodes = extractWorkflowDocumentation(workflowData);
                            if (documentationNodes.length > 0) {
                                console.log('📋 Found workflow documentation:', documentationNodes.length, 'notes');
                                workflowDocumentation.set(documentationNodes);
                            } else {
                                workflowDocumentation.set([]);
                            }
                            
                            // Extract node types from raw workflow - EXCLUDE DOCUMENTATION NODES
                            const nodeTypes = new Set();
                            for (const node of workflowData.nodes) {
                                if (node.type && 
                                    node.type !== 'PrimitiveNode' &&
                                    node.type !== 'MarkdownNote' &&
                                    node.type !== 'Note') {
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
        console.log('🎯 [Hybrid Validation] Drop event triggered');
        
        if (event.dataTransfer) {
            const file = event.dataTransfer.files[0];
            console.log('📁 File:', file?.name, file?.type);
            
            if (!file) {
                console.log('❌ No file found in drop event');
                return;
            }
            
            // Always extract documentation first
            await extractDocumentationFromFile(file);
            
            try {
                // STEP 1: Try normal workflow loading first (like original ComfyWeb)
                console.log('🔄 [Hybrid Validation] Step 1: Attempting normal workflow loading...');
                
                const steps = await loadFromDataTransfer(event.dataTransfer, $library);
                
                if (steps) {
                    console.log('✅ [Hybrid Validation] Step 1 SUCCESS: Normal workflow loading successful');
                    loadWorkflow(steps);
                    return; // Success - exit early
                }
                
                console.log('❌ [Hybrid Validation] Step 1 FAILED: Normal workflow loading returned no steps');
                
            } catch (normalLoadError) {
                console.log('❌ [Hybrid Validation] Step 1 FAILED: Normal workflow loading error:', normalLoadError);
                
                // STEP 2: Normal loading failed - try backend validation for missing nodes detection
                console.log('🔄 [Hybrid Validation] Step 2: Normal loading failed, checking for missing nodes...');
                
                try {
                    // Extract raw workflow data for backend validation
                    const rawWorkflowData = await extractRawWorkflowData(file);
                    
                    if (!rawWorkflowData) {
                        console.log('❌ Could not extract workflow data for backend validation');
                        handleWorkflowError(normalLoadError);
                        return;
                    }
                    
                    // Convert and validate with backend
                    const promptData = convertWorkflowToPrompt(rawWorkflowData);
                    const validationResult = await validateWorkflowWithBackend($serverHost, JSON.stringify(promptData));
                    
                    if (validationResult.missingNodes && validationResult.missingNodes.length > 0) {
                        // Missing nodes detected from backend error
                        console.log('🔍 [Hybrid Validation] Step 2 SUCCESS: Missing nodes detected from backend:', validationResult.missingNodes);
                        
                        // Get installation info for missing nodes
                        const missingNodesInfo = await missingNodeDetector.getMissingNodeInfo(validationResult.missingNodes);
                        
                        // Show enhanced missing nodes dialog
                        pendingWorkflowSteps = null; // No valid steps yet, will retry after installation
                        missingNodesState.update(state => ({
                            ...state,
                            isDialogOpen: true,
                            missingNodes: missingNodesInfo
                        }));
                        
                        console.log('🔍 [Hybrid Validation] Enhanced missing nodes dialog should now be visible');
                        return; // Exit - missing nodes dialog shown
                    } else {
                        // Backend validation didn't reveal missing nodes - show original error
                        console.log('❌ [Hybrid Validation] Step 2: No missing nodes detected, showing original error');
                        handleWorkflowError(normalLoadError);
                    }
                    
                } catch (backendValidationError) {
                    console.error('❌ [Hybrid Validation] Step 2 FAILED: Backend validation error:', backendValidationError);
                    // Fall back to original error
                    handleWorkflowError(normalLoadError);
                }
            }
        }
    }
    
    /**
     * Convert workflow data to ComfyUI prompt format for backend validation
     * This creates a minimal prompt that ComfyUI can validate
     */
    function convertWorkflowToPrompt(workflowData) {
        if (!workflowData) return null;
        
        try {
            // If it's already in API format, return as-is
            if (workflowData.prompt || (typeof workflowData === 'object' && !workflowData.nodes)) {
                return workflowData;
            }
            
            // Convert from node format to API format
            const prompt = {};
            
            if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
                for (const node of workflowData.nodes) {
                    if (node.id && node.type) {
                        prompt[node.id.toString()] = {
                            class_type: node.type,
                            inputs: node.widgets_values ? 
                                { value: node.widgets_values[0] } : 
                                {}
                        };
                    }
                }
            }
            
            return {
                client_id: 'comfyweb-validation',
                prompt: prompt
            };
        } catch (error) {
            console.error('❌ Error converting workflow to prompt format:', error);
            return null;
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

    async function handleInstallationComplete(event) {
        console.log('✅ [Backend Validation] Installation completed:', event.detail);
        
        // After installation, we need to retry workflow loading with backend validation
        // Since we don't have the original file, we'll attempt to reload from the last dropped file
        // For now, just close the dialog and let user re-drop the workflow
        
        // Close dialog
        missingNodesState.update(state => ({
            ...state,
            isDialogOpen: false,
            missingNodes: []
        }));
        
        // Show success message encouraging user to re-drop workflow
        errorMessage.set('Extensions installed successfully! Please drop your workflow again to load it.');
        
        // Note: In a future enhancement, we could store the original file data
        // and automatically retry the workflow loading here
    }

    function handleInstallationError(event) {
        console.error('❌ Installation error:', event.detail);
        
        // Show error message but keep dialog open for retry
        errorMessage.set(`Installation failed: ${event.detail.error?.message || 'Unknown error'}`);
    }

    function handleSkipInstallation() {
        console.log('⏭️ [Backend Validation] Installation skipped');
        
        // Close dialog - user chose to skip installation
        // They can try to load the workflow anyway (ComfyUI will handle missing nodes)
        missingNodesState.update(state => ({
            ...state,
            isDialogOpen: false,
            missingNodes: []
        }));
        
        // Show message about skipped installation
        errorMessage.set('Installation skipped. You can try dropping the workflow again or install the missing extensions manually.');
    }
</script>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<EnhancedMissingNodesDialog
    on:installationComplete={handleInstallationComplete}
    on:installationError={handleInstallationError}
    on:skipInstallation={handleSkipInstallation}
/>
