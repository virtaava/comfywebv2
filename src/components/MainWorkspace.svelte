<script lang="ts">
  import { onMount } from 'svelte';
  import { generationState, workspaceMode, imageViewer, serverHost } from '../stores';
  import { Badge, Button, Spinner, Progressbar } from 'flowbite-svelte';
  import { ImageOutline, PlayOutline } from 'flowbite-svelte-icons';
  import ImageViewer from './ImageViewer.svelte';
  
  // Subscribe to states
  $: generation = $generationState;
  $: mode = $workspaceMode;
  $: viewer = $imageViewer;
  $: currentServerHost = $serverHost;
  
  // Mock progress for demo (in real app this would come from WebSocket)
  let mockProgress = 0;
  let mockCurrentNode = 'Loading...';
  
  onMount(() => {
    // Simulate progress updates when generating
    const interval = setInterval(() => {
      if (generation.isGenerating && mockProgress < 95) {
        mockProgress += Math.random() * 10;
        const nodes = ['Load Checkpoint', 'CLIP Text Encode', 'KSampler', 'VAE Decode', 'Save Image'];
        mockCurrentNode = nodes[Math.floor((mockProgress / 100) * nodes.length)] || 'Processing...';
      } else if (!generation.isGenerating) {
        mockProgress = 0;
        mockCurrentNode = 'Ready';
      }
    }, 500);
    
    return () => clearInterval(interval);
  });
  
  // Debug logging for workspace states
  $: {
    console.log('[MainWorkspace] Mode changed:', mode);
    console.log('[MainWorkspace] Generation state:', generation);
    console.log('[MainWorkspace] Image viewer active:', viewer.isActive);
  }
</script>

<!-- Main workspace content -->
<div class="h-full w-full bg-gray-900">
  {#if mode === 'imageViewing'}
    <!-- Image Viewer Mode -->
    <ImageViewer />
  {:else if mode === 'generating'}
    <!-- Generation Progress Mode -->
    <div class="h-full flex items-center justify-center">
      <div class="text-center p-8 bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full mx-4">
        <div class="mb-6">
          <div class="relative w-16 h-16 mx-auto mb-4">
            <Spinner class="w-16 h-16" color="blue" />
            <div class="absolute inset-0 flex items-center justify-center">
              <PlayOutline class="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h2 class="text-xl font-semibold text-white mb-2">Generating Image</h2>
          <p class="text-gray-400 text-sm">Please wait while your workflow is being processed...</p>
        </div>
        
        <!-- Progress Information -->
        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-400">Current Node:</span>
              <Badge color="blue" class="bg-blue-600">{mockCurrentNode}</Badge>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-400">Progress:</span>
              <span class="text-sm text-white">{Math.round(mockProgress)}%</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style="width: {mockProgress}%"
              ></div>
            </div>
          </div>
          
          {#if generation.currentPromptId}
            <div class="pt-2 border-t border-gray-700">
              <span class="text-xs text-gray-500">Prompt ID: {generation.currentPromptId}</span>
            </div>
          {/if}
          
          <div class="text-xs text-gray-400 mt-4">
            Images will appear in Gallery tab when complete
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Idle Mode -->
    <div class="h-full flex items-center justify-center">
      <div class="text-center p-8 max-w-md mx-4">
        <div class="mb-6">
          <div class="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageOutline class="w-12 h-12 text-gray-400" />
          </div>
          <h2 class="text-2xl font-semibold text-white mb-2">ComfyWeb v2 Workspace</h2>
          <p class="text-gray-400">Drop ComfyUI workflows here to get started</p>
        </div>
        
        <div class="space-y-3 text-left">
          <div class="flex items-center text-sm text-gray-300">
            <span class="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
            Drag & drop .json workflow files or images with embedded workflows
          </div>
          <div class="flex items-center text-sm text-gray-300">
            <span class="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
            Use the Gallery tab to view generated images
          </div>
          <div class="flex items-center text-sm text-gray-300">
            <span class="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
            Build workflows in the Workflow tab
          </div>
          <div class="flex items-center text-sm text-gray-300">
            <span class="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
            Manage settings and save workflows in the Manage tab
          </div>
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
  .h-full {
    min-height: 0;
  }
  
  /* Smooth transitions between modes */
  div {
    transition: all 0.2s ease-in-out;
  }
</style>
