<script lang="ts">
    import { GraphCycleError } from "../lib/graph";
    import {
        loadFromDataTransfer,
        WorkflowItem,
        WorkflowLoadError,
        WorkflowLoadRequestError,
    } from "../lib/workflow";
    import { prepareComfyWorkflow } from "../lib/prepareWorkflow";
    import { MissingNodeDetector, extractWorkflowDocumentation, createMissingNodeDetector } from "../lib/missing-nodes";
    import { validateWorkflowWithBackend, type WorkflowValidationResult } from "../lib/api";
    import EnhancedMissingNodesDialog from "../components/EnhancedMissingNodesDialog.svelte";
    import WorkflowCompatibilityDialog from "../components/WorkflowCompatibilityDialog.svelte";
    import { analyzeWorkflowForUE, getUEAnalysisDescription } from "../lib/ue-detection";
    import { convertUEWorkflow, getDefaultConversionOptions } from "../lib/ue-converter";
    import { convertAllVirtualNodes } from "../lib/ue/registry";
    import { errorMessage, library, workflow, serverHost, missingNodesState, workflowDocumentation } from "../stores";

    let pendingWorkflowSteps = null;
    let missingNodeDetector = null;
    
    // UE Compatibility State
    let ueCompatibilityOpen = false;
    let ueAnalysis = null;
    let ueConversionResult = null;
    let isConverting = false;
    let pendingWorkflowData = null;

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
        console.log('🎯 [Enhanced Validation] Drop event triggered');
        
        if (event.dataTransfer) {
            const file = event.dataTransfer.files[0];
            console.log('📁 File:', file?.name, file?.type);
            
            if (!file) {
                console.log('❌ No file found in drop event');
                return;
            }
            
            // Always extract documentation first
            await extractDocumentationFromFile(file);
            
            // STEP 0: Extract raw workflow data for analysis
            console.log('🔄 [Prepare Workflow] Step 0: Extracting workflow data...');
            let rawWorkflowData = await extractRawWorkflowData(file);
            console.log('✅ [Prepare Workflow] Step 0: Raw workflow data extracted');
            
            if (rawWorkflowData) {
                // STEP 1: Check for UE virtual links compatibility issues
                console.log('🔄 [Enhanced Validation] Step 1: Analyzing for UE virtual links...');
                const ueAnalysisResult = analyzeWorkflowForUE(rawWorkflowData);
                
                if (ueAnalysisResult.hasUENodes && ueAnalysisResult.conversionRequired) {
                    console.log('🔗 [Enhanced Validation] UE virtual links detected - showing compatibility dialog');
                    console.log('🔗 UE Analysis:', ueAnalysisResult);
                    
                    // Store workflow data and analysis for conversion
                    pendingWorkflowData = rawWorkflowData;
                    ueAnalysis = ueAnalysisResult;
                    ueConversionResult = null;
                    ueCompatibilityOpen = true;
                    
                    // Show UE compatibility dialog
                    return; // Stop here - user will choose conversion option
                }
                
                console.log('✅ [Enhanced Validation] Step 1: No UE issues detected, proceeding with normal loading');
            }
            
            try {
                // STEP 2: Try workflow preparation and loading (with virtual node conversion)
                console.log('🔄 [Prepare Workflow] Step 2: Attempting workflow preparation and loading...');
                
                let steps;
                if (rawWorkflowData) {
                    // Use prepareComfyWorkflow for automatic virtual node conversion
                    console.log('🔄 [Prepare Workflow] Step 2a: Using prepareComfyWorkflow with virtual node conversion...');
                    steps = await prepareComfyWorkflow(rawWorkflowData, $library);
                } else {
                    // Fallback to original DataTransfer if no workflow data
                    console.log('🔄 [Prepare Workflow] Step 2b: Using original DataTransfer...');
                    steps = await loadFromDataTransfer(event.dataTransfer, $library);
                }
                
                if (steps) {
                    console.log('✅ [Prepare Workflow] Step 2 SUCCESS: Workflow preparation and loading successful');
                    loadWorkflow(steps);
                    return; // Success - exit early
                }
                
                console.log('❌ [Prepare Workflow] Step 2 FAILED: Workflow preparation returned no steps');
                
            } catch (prepareLoadError) {
                console.log('❌ [Prepare Workflow] Step 2 FAILED: Workflow preparation error:', prepareLoadError);
                
                // STEP 3: Preparation failed - try backend validation for missing nodes detection
                console.log('🔄 [Prepare Workflow] Step 3: Preparation failed, checking for missing nodes...');
                
                try {
                    if (!rawWorkflowData) {
                        console.log('❌ Could not extract workflow data for backend validation');
                        handleWorkflowError(normalLoadError);
                        return;
                    }
                    
                    // Convert and validate with backend
                    const promptData = convertWorkflowToPrompt(rawWorkflowData);
                    const validationResult = await validateWorkflowWithBackend($serverHost, JSON.stringify(promptData));
                    
                    // Enhanced debug logging for validation result
                    console.log('🔍 [DEBUG] Full validation result:', validationResult);
                    console.log('🔍 [DEBUG] Validation success:', validationResult.success);
                    console.log('🔍 [DEBUG] Validation error:', validationResult.error);
                    console.log('🔍 [DEBUG] Validation missingNodes:', validationResult.missingNodes);
                    console.log('🔍 [DEBUG] Missing nodes length:', validationResult.missingNodes?.length);
                    console.log('🔍 [DEBUG] Missing nodes array:', Array.isArray(validationResult.missingNodes) ? validationResult.missingNodes : 'Not an array');
                    
                    if (validationResult.missingNodes && validationResult.missingNodes.length > 0) {
                        // Missing nodes detected from backend error
                        console.log('🔍 [Prepare Workflow] Step 3 SUCCESS: Missing nodes detected from backend:', validationResult.missingNodes);
                        
                        // Get installation info for missing nodes
                        const missingNodesInfo = await missingNodeDetector.getMissingNodeInfo(validationResult.missingNodes);
                        console.log('🔍 [DEBUG] Missing nodes info from detector:', missingNodesInfo);
                        
                        // Show enhanced missing nodes dialog
                        pendingWorkflowSteps = null; // No valid steps yet, will retry after installation
                        missingNodesState.update(state => ({
                            ...state,
                            isDialogOpen: true,
                            missingNodes: missingNodesInfo
                        }));
                        
                        console.log('🔍 [Prepare Workflow] Enhanced missing nodes dialog should now be visible');
                        return; // Exit - missing nodes dialog shown
                    } else {
                        // Backend validation didn't reveal missing nodes - try fallback method
                        console.log('❌ [Prepare Workflow] Step 3: Backend parsing failed, trying fallback detection...');
                        
                        // Extract missing nodes directly from workflow analysis (we know it works)
                        const workflowMissingNodes = await tryDetectMissingNodesFromRawFile(file, prepareLoadError);
                        
                        if (workflowMissingNodes && workflowMissingNodes.length > 0) {
                            console.log('🔍 [Prepare Workflow] Step 3 FALLBACK SUCCESS: Missing nodes detected from workflow analysis:', workflowMissingNodes);
                            
                            // Show enhanced missing nodes dialog
                            pendingWorkflowSteps = null; // No valid steps yet, will retry after installation
                            missingNodesState.update(state => ({
                                ...state,
                                isDialogOpen: true,
                                missingNodes: workflowMissingNodes
                            }));
                            
                            console.log('🔍 [Prepare Workflow] Enhanced missing nodes dialog should now be visible (fallback method)');
                            return; // Exit - missing nodes dialog shown
                        } else {
                            // No missing nodes detected - show original error
                            console.log('❌ [Prepare Workflow] Step 3: No missing nodes detected via any method, showing original error');
                            handleWorkflowError(prepareLoadError);
                        }
                    }
                    
                } catch (backendValidationError) {
                    console.error('❌ [Prepare Workflow] Step 3 FAILED: Backend validation error:', backendValidationError);
                    
                    // Try fallback method even if backend failed
                    console.log('🔄 [Prepare Workflow] Backend failed, trying fallback missing nodes detection...');
                    try {
                        const workflowMissingNodes = await tryDetectMissingNodesFromRawFile(file, prepareLoadError);
                        
                        if (workflowMissingNodes && workflowMissingNodes.length > 0) {
                            console.log('🔍 [Prepare Workflow] FALLBACK SUCCESS: Missing nodes detected despite backend error:', workflowMissingNodes);
                            
                            // Show enhanced missing nodes dialog
                            pendingWorkflowSteps = null;
                            missingNodesState.update(state => ({
                                ...state,
                                isDialogOpen: true,
                                missingNodes: workflowMissingNodes
                            }));
                            
                            console.log('🔍 [Prepare Workflow] Enhanced missing nodes dialog should now be visible (backend error fallback)');
                            return; // Exit - missing nodes dialog shown
                        }
                    } catch (fallbackError) {
                        console.error('❌ [Prepare Workflow] Fallback detection also failed:', fallbackError);
                    }
                    
                    // Fall back to original error
                    handleWorkflowError(prepareLoadError);
                }
            }
        }
    }
    
    /**
     * Create a DataTransfer-like object from workflow data for loadFromDataTransfer
     */
    function createDataTransferFromWorkflow(workflowData, filename) {
        const workflowJson = JSON.stringify(workflowData);
        const blob = new Blob([workflowJson], { type: 'application/json' });
        const file = new File([blob], filename, { type: 'application/json' });
        
        // Create a minimal DataTransfer-like object that loadFromDataTransfer expects
        return {
            files: [file],
            items: [{
                kind: 'file',
                type: 'application/json',
                getAsFile: () => file
            }]
        };
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
    
    // UE Compatibility Dialog Event Handlers
    async function handleUEConvert() {
        console.log('✨ [UE Compatibility] Converting virtual links to real links...');
        isConverting = true;
        
        try {
            const conversionResult = await convertUEWorkflow(pendingWorkflowData, ueAnalysis, {
                method: 'convert',
                removeUENodes: true,
                preserveVisual: false,
                handleRegexNodes: 'convert'
            });
            
            ueConversionResult = conversionResult;
            
            if (conversionResult.success) {
                console.log('✅ [UE Compatibility] Conversion successful:', conversionResult);
                // Auto-close dialog and load converted workflow
                setTimeout(() => {
                    handleUEClose();
                }, 2000); // Give user time to see the success message
            } else {
                console.error('❌ [UE Compatibility] Conversion failed:', conversionResult.error);
            }
        } catch (error) {
            console.error('❌ [UE Compatibility] Conversion error:', error);
            ueConversionResult = {
                success: false,
                error: error.message,
                changes: [],
                warnings: [],
                removedNodes: [],
                addedLinks: 0
            };
        } finally {
            isConverting = false;
        }
    }
    
    async function handleUEStrip() {
        console.log('🧹 [UE Compatibility] Stripping UE system...');
        isConverting = true;
        
        try {
            const conversionResult = await convertUEWorkflow(pendingWorkflowData, ueAnalysis, {
                method: 'strip',
                removeUENodes: true,
                preserveVisual: false,
                handleRegexNodes: 'remove'
            });
            
            ueConversionResult = conversionResult;
            
            if (conversionResult.success) {
                console.log('✅ [UE Compatibility] Strip successful:', conversionResult);
                // Auto-close dialog and load converted workflow
                setTimeout(() => {
                    handleUEClose();
                }, 2000);
            } else {
                console.error('❌ [UE Compatibility] Strip failed:', conversionResult.error);
            }
        } catch (error) {
            console.error('❌ [UE Compatibility] Strip error:', error);
            ueConversionResult = {
                success: false,
                error: error.message,
                changes: [],
                warnings: [],
                removedNodes: [],
                addedLinks: 0
            };
        } finally {
            isConverting = false;
        }
    }
    
    function handleUELoadAnyway() {
        console.log('⚠️ [UE Compatibility] Loading workflow anyway...');
        
        // Close UE dialog
        ueCompatibilityOpen = false;
        
        // Try to create a fake DataTransfer with the original workflow
        try {
            // For now, just show a message that they should try loading again
            errorMessage.set('UE conversion skipped. The workflow may not load correctly due to virtual links. Consider using the Convert option for better compatibility.');
            
            // Reset state
            pendingWorkflowData = null;
            ueAnalysis = null;
            ueConversionResult = null;
        } catch (error) {
            console.error('❌ [UE Compatibility] Load anyway error:', error);
            errorMessage.set('Failed to load workflow. Please try dropping the file again.');
        }
    }
    
    function handleUEClose() {
        console.log('🔄 [UE Compatibility] Loading converted workflow...');
        
        if (ueConversionResult && ueConversionResult.success) {
            try {
                // Create workflow steps from converted workflow data
                const convertedWorkflow = ueConversionResult.convertedWorkflow;
                
                // We need to use the workflow loading system with converted data
                // For now, create a temporary file-like object and retry loading
                const workflowJson = JSON.stringify(convertedWorkflow);
                const blob = new Blob([workflowJson], { type: 'application/json' });
                
                // Create a fake DataTransfer object
                const fakeDataTransfer = {
                    files: [new File([blob], 'converted-workflow.json', { type: 'application/json' })]
                };
                
                // Try loading the converted workflow
                loadFromDataTransfer(fakeDataTransfer, $library)
                    .then(steps => {
                        if (steps) {
                            loadWorkflow(steps);
                            errorMessage.set(`UE conversion successful! ${ueConversionResult.changes.length} changes made to ensure backend compatibility.`);
                        } else {
                            errorMessage.set('Converted workflow loaded, but no steps were generated. Please check the workflow.');
                        }
                    })
                    .catch(error => {
                        console.error('❌ Error loading converted workflow:', error);
                        errorMessage.set('Converted workflow could not be loaded. Please try dropping the original file again.');
                    });
                    
            } catch (error) {
                console.error('❌ Error processing converted workflow:', error);
                errorMessage.set('Error processing converted workflow. Please try again.');
            }
        }
        
        // Close dialog and reset state
        ueCompatibilityOpen = false;
        pendingWorkflowData = null;
        ueAnalysis = null;
        ueConversionResult = null;
    }
    
    function handleUECancel() {
        console.log('❌ [UE Compatibility] Conversion cancelled');
        
        // Close dialog and reset state
        ueCompatibilityOpen = false;
        pendingWorkflowData = null;
        ueAnalysis = null;
        ueConversionResult = null;
        isConverting = false;
    }
</script>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<EnhancedMissingNodesDialog
    on:installationComplete={handleInstallationComplete}
    on:installationError={handleInstallationError}
    on:skipInstallation={handleSkipInstallation}
/>

<WorkflowCompatibilityDialog
    bind:open={ueCompatibilityOpen}
    {ueAnalysis}
    {isConverting}
    {ueConversionResult}
    on:convert={handleUEConvert}
    on:strip={handleUEStrip}
    on:loadAnyway={handleUELoadAnyway}
    on:cancel={handleUECancel}
    on:close={handleUEClose}
/>
