<script lang="ts">
    import { generationState, serverHost } from '../stores';
    import { Button, Progressbar, Spinner } from 'flowbite-svelte';
    
    // Subscribe to generation state
    $: currentGenerationState = $generationState;
    $: currentServerHost = $serverHost;
    
    // Debug logging for generation state
    $: {
        console.log('[MainWorkspace] Generation state changed:', currentGenerationState);
        console.log('[MainWorkspace] Is generating:', currentGenerationState.isGenerating);
        console.log('[MainWorkspace] Current prompt ID:', currentGenerationState.currentPromptId);
    }
</script>

<div class="flex-1 h-full bg-gray-900 flex flex-col">
    {#if currentGenerationState.isGenerating}
        <!-- Generation Progress View -->
        <div class="flex-1 flex items-center justify-center p-8">
            <div class="max-w-md w-full text-center">
                <div class="mb-6">
                    <div class="w-20 h-20 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <Spinner class="w-8 h-8 text-white" />
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">Generating Image</h2>
                    <p class="text-gray-400">Please wait while your workflow is being processed...</p>
                </div>
                
                <!-- Progress Information -->
                <div class="space-y-4">
                    {#if currentGenerationState.currentPromptId}
                        <div class="text-sm text-gray-500 mb-4">
                            <span class="font-mono bg-gray-800 px-2 py-1 rounded">
                                Prompt ID: {currentGenerationState.currentPromptId}
                            </span>
                        </div>
                    {/if}
                    
                    <div class="space-y-4">
                        <div class="text-sm text-blue-400">
                            <p>Generation in progress...</p>
                        </div>
                        
                        <!-- Simple progress indicator -->
                        <div class="space-y-2">
                            <div class="text-sm text-gray-400">Processing workflow</div>
                            <Progressbar 
                                progress={50} 
                                color="blue" 
                                size="h-3"
                                animate={true}
                            />
                            <div class="text-xs text-gray-500">
                                Check the Gallery tab after completion
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <!-- Idle State - Welcome Message -->
        <div class="flex-1 flex items-center justify-center p-8">
            <div class="text-center text-gray-400 max-w-lg">
                <div class="mb-6">
                    <svg class="w-24 h-24 mx-auto mb-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 4h16v12H4V4zm16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM12 9.5c0-.83-.67-1.5-1.5-1.5S9 8.67 9 9.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zM17 16H7l2.5-3.15L11.5 15l2.5-3.15L17 16z"/>
                    </svg>
                </div>
                <h2 class="text-xl font-semibold text-white mb-2">ComfyWeb v2 Workspace</h2>
                <p class="text-gray-400 mb-6">Drop ComfyUI workflows here to get started</p>
                
                <div class="text-sm text-gray-500 space-y-2 text-left">
                    <p class="flex items-center gap-2">
                        <span class="text-blue-400">•</span>
                        Drag & drop .json workflow files or images with embedded workflows
                    </p>
                    <p class="flex items-center gap-2">
                        <span class="text-green-400">•</span>
                        Use the Gallery tab to view generated images
                    </p>
                    <p class="flex items-center gap-2">
                        <span class="text-purple-400">•</span>
                        Build workflows in the Workflow tab
                    </p>
                    <p class="flex items-center gap-2">
                        <span class="text-yellow-400">•</span>
                        Manage settings and save workflows in the Manage tab
                    </p>
                </div>
                
                <!-- Server Connection Status -->
                <div class="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div class="text-xs text-gray-400 mb-2">ComfyUI Server</div>
                    <div class="font-mono text-sm text-white">
                        http://{currentServerHost}
                    </div>
                    <div class="text-xs mt-1 text-gray-400">
                        Ready for workflow execution
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Ensure full height utilization */
    .flex-1 {
        min-height: 0;
    }
</style>
