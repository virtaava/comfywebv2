<script lang="ts">
  import { onMount } from 'svelte';
  import { galleryHistory, refreshGalleryImages, serverHost, imageViewer } from '../stores';
  import { Badge, Button, Spinner, Alert } from 'flowbite-svelte';
  import { RefreshOutline, ImageOutline } from 'flowbite-svelte-icons';
  
  // DEBUG: Add debug state
  let showDebugConsole = false;
  let debugLogs: string[] = [];
  let lastApiResponse: any = null;
  
  // DEBUG: Enhanced logging function
  function debugLog(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data);
    debugLogs = [...debugLogs, logEntry + (data ? ` ${JSON.stringify(data, null, 2)}` : '')].slice(-50); // Keep last 50 logs
  }
  
  // Subscribe to gallery state
  $: galleryState = $galleryHistory;
  $: currentServerHost = $serverHost;
  
  // Auto-refresh on mount and when server host changes
  onMount(() => {
    debugLog('Gallery component mounted');
    debugLog('Initial gallery state', { 
      promptCount: galleryState.promptHistory.length, 
      imageCount: galleryState.images.length,
      lastRefresh: galleryState.lastRefresh 
    });
    
    if (galleryState.promptHistory.length > 0) {
      debugLog('Auto-refreshing gallery on mount');
      refreshGalleryImages();
    }
  });
  
  // Refresh gallery when server host changes (simplified approach)
  let lastServerHost = $serverHost;
  $: if ($serverHost !== lastServerHost && galleryState.promptHistory.length > 0) {
    lastServerHost = $serverHost;
    debugLog('Server host changed, refreshing gallery', { oldHost: lastServerHost, newHost: $serverHost });
    setTimeout(() => refreshGalleryImages(), 500); // Simple debounce
  }
  
  // Handle manual refresh
  async function handleRefresh() {
    debugLog('Manual refresh triggered');
    debugLog('Current prompt history', galleryState.promptHistory);
    
    try {
      // Import gallery API for direct testing
      const { createGalleryAPI } = await import('../lib/gallery-api');
      const api = createGalleryAPI();
      
      // Test connection first
      debugLog('Testing API connection...');
      const connectionTest = await api.testConnection();
      debugLog('Connection test result', connectionTest);
      
      // Test loading images for first prompt
      if (galleryState.promptHistory.length > 0) {
        const firstPrompt = galleryState.promptHistory[0];
        debugLog('Testing image load for first prompt', firstPrompt);
        
        const result = await api.loadImagesForPrompts([firstPrompt]);
        lastApiResponse = result;
        debugLog('API Response for test prompt', result);
        
        if (result.images.length > 0) {
          debugLog('Testing first image URL accessibility', result.images[0].url);
          
          // Test if the URL is accessible
          try {
            const imgTest = await fetch(result.images[0].url, { method: 'HEAD' });
            debugLog('Image URL test result', { 
              url: result.images[0].url, 
              status: imgTest.status, 
              statusText: imgTest.statusText 
            });
          } catch (urlError) {
            debugLog('Image URL test failed', urlError.message);
          }
        }
      }
      
      // Now do the actual refresh
      await refreshGalleryImages();
      debugLog('Gallery refresh completed');
    } catch (error) {
      debugLog('Manual refresh failed', error.message);
    }
  }
  
  // DEBUG: Test specific prompt ID
  async function testPromptId() {
    const promptId = prompt('Enter prompt ID to test:');
    if (!promptId) return;
    
    debugLog('Testing specific prompt ID', promptId);
    
    try {
      const { createGalleryAPI } = await import('../lib/gallery-api');
      const api = createGalleryAPI();
      const result = await api.loadImagesForPrompts([promptId]);
      lastApiResponse = result;
      debugLog('Test prompt result', result);
    } catch (error) {
      debugLog('Test prompt failed', error.message);
    }
  }
  
  // DEBUG: Test ComfyUI history API directly
  async function testHistoryAPI() {
    const promptId = galleryState.promptHistory[0];
    if (!promptId) {
      debugLog('No prompt ID to test');
      return;
    }
    
    debugLog('Testing ComfyUI history API directly for', promptId);
    
    const urls = [
      `${$serverHost}/api/history/${promptId}`,
      `${$serverHost}/history/${promptId}`
    ];
    
    for (const url of urls) {
      try {
        debugLog('Testing URL', url);
        const response = await fetch(url);
        debugLog('Response status', { url, status: response.status, statusText: response.statusText });
        
        if (response.ok) {
          const data = await response.json();
          lastApiResponse = data;
          debugLog('History API raw response', data);
          break;
        }
      } catch (error) {
        debugLog('History API test failed', { url, error: error.message });
      }
    }
  }
  
  // Handle image viewing in workspace
  function handleViewImage(image) {
    debugLog('View image clicked', { filename: image.filename, url: image.url });
    
    // Test image URL before viewing
    const img = new Image();
    img.onload = () => debugLog('Image loaded successfully in test');
    img.onerror = () => debugLog('Image failed to load in test');
    img.src = image.url;
    
    // Pass all gallery images for navigation
    imageViewer.viewImage(image, galleryState.images);
  }
  
  // Handle image removal
  function handleRemoveImage(filename: string) {
    debugLog('Remove image clicked', filename);
    galleryHistory.removeImage(filename);
  }
  
  // Clear all errors
  function clearErrors() {
    debugLog('Clear errors clicked');
    galleryHistory.clearErrors();
  }
  
  // Format timestamp for display
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }
</script>

<!-- Gallery Header -->
<div class="bg-gray-900 rounded-lg p-6">
  <div class="flex justify-between items-center mb-6">
    <div class="flex items-center gap-3">
      <ImageOutline class="w-6 h-6 text-blue-400" />
      <h2 class="text-xl font-semibold text-white">Generated Images</h2>
      {#if galleryState.images.length > 0}
        <Badge color="blue" class="bg-blue-600">
          {galleryState.images.length}
        </Badge>
      {/if}
    </div>
  
  <!-- DEBUG: Debug Console -->
  {#if showDebugConsole}
    <div class="mb-6 p-4 bg-yellow-900 rounded-lg border border-yellow-600">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-yellow-200 font-semibold">🔍 Gallery Debug Console</h3>
        <div class="flex gap-2">
          <Button size="xs" color="yellow" on:click={testPromptId}>Test Prompt ID</Button>
          <Button size="xs" color="yellow" on:click={testHistoryAPI}>Test History API</Button>
          <Button size="xs" color="red" on:click={() => debugLogs = []}>Clear Logs</Button>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Debug Info -->
        <div class="bg-yellow-800 p-3 rounded text-xs">
          <h4 class="text-yellow-200 font-medium mb-2">Current State</h4>
          <div class="text-yellow-100 space-y-1">
            <div>Prompts Tracked: {galleryState.promptHistory.length}</div>
            <div>Images Loaded: {galleryState.images.length}</div>
            <div>Loading: {galleryState.loading}</div>
            <div>Errors: {galleryState.errors.length}</div>
            <div>Server: {$serverHost}</div>
            <div>Last Refresh: {galleryState.lastRefresh > 0 ? formatTimestamp(galleryState.lastRefresh) : 'Never'}</div>
          </div>
          
          {#if galleryState.promptHistory.length > 0}
            <h4 class="text-yellow-200 font-medium mt-3 mb-2">Tracked Prompts</h4>
            <div class="text-yellow-100 text-xs space-y-1 max-h-32 overflow-y-auto">
              {#each galleryState.promptHistory.slice(0, 5) as promptId}
                <div class="font-mono">{promptId}</div>
              {/each}
              {#if galleryState.promptHistory.length > 5}
                <div class="text-yellow-300">...and {galleryState.promptHistory.length - 5} more</div>
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Debug Logs -->
        <div class="bg-yellow-800 p-3 rounded text-xs">
          <h4 class="text-yellow-200 font-medium mb-2">Debug Logs</h4>
          <div class="text-yellow-100 max-h-64 overflow-y-auto space-y-1 font-mono">
            {#each debugLogs.slice(-20) as log}
              <div class="border-b border-yellow-700 pb-1">{log}</div>
            {/each}
            {#if debugLogs.length === 0}
              <div class="text-yellow-300 italic">No logs yet. Try refreshing gallery.</div>
            {/if}
          </div>
        </div>
      </div>
      
      {#if lastApiResponse}
        <div class="mt-4 bg-yellow-800 p-3 rounded text-xs">
          <h4 class="text-yellow-200 font-medium mb-2">Last API Response</h4>
          <pre class="text-yellow-100 whitespace-pre-wrap text-xs overflow-x-auto">{JSON.stringify(lastApiResponse, null, 2)}</pre>
        </div>
      {/if}
    </div>
  {/if}
    
    <div class="flex items-center gap-3">
      {#if galleryState.loading}
        <div class="flex items-center gap-2 text-blue-400">
          <Spinner class="w-4 h-4" />
          <span class="text-sm">Loading...</span>
        </div>
      {/if}
      
      <Button 
        color="blue" 
        size="sm"
        on:click={handleRefresh}
        disabled={galleryState.loading}
        class="flex items-center gap-2"
      >
        <RefreshOutline class="w-4 h-4" />
        Refresh Gallery
      </Button>
      
      <!-- DEBUG: Debug console toggle -->
      <Button 
        color="yellow" 
        size="sm"
        on:click={() => showDebugConsole = !showDebugConsole}
        class="flex items-center gap-2"
      >
        🔍 Debug
      </Button>
    </div>
  </div>
  
  <!-- Gallery Information/Status -->
  <div class="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
    <div class="text-gray-300 text-sm space-y-1">
      <p class="flex items-center gap-2">
        <span class="text-green-400">✅</span>
        Shows images generated through ComfyWeb interface
      </p>
      <p class="flex items-center gap-2">
        <span class="text-blue-400">ℹ️</span>
        Only displays images from your workflows (browser security limitation)
      </p>
      <p class="flex items-center gap-2">
        <span class="text-purple-400">💾</span>
        Gallery persists across browser sessions
      </p>
      {#if galleryState.promptHistory.length > 0}
        <p class="flex items-center gap-2">
          <span class="text-yellow-400">📊</span>
          Tracking {galleryState.promptHistory.length} workflow{galleryState.promptHistory.length === 1 ? '' : 's'}
        </p>
      {/if}
      {#if galleryState.lastRefresh > 0}
        <p class="flex items-center gap-2">
          <span class="text-gray-400">🕒</span>
          Last updated: {formatTimestamp(galleryState.lastRefresh)}
        </p>
      {/if}
    </div>
  </div>
  
  <!-- Error Display -->
  {#if galleryState.errors.length > 0}
    <div class="mb-6">
      <Alert color="red" class="mb-3">
        <span slot="icon" class="text-red-400">⚠️</span>
        <span class="font-medium">Gallery Errors ({galleryState.errors.length})</span>
        <div class="mt-2 text-sm">
          {#each galleryState.errors as error, index}
            <div class="mb-1 last:mb-0">
              {index + 1}. {error}
            </div>
          {/each}
        </div>
        <div class="mt-3">
          <Button size="xs" color="red" on:click={clearErrors}>
            Clear Errors
          </Button>
        </div>
      </Alert>
    </div>
  {/if}
  
  <!-- Empty State -->
  {#if galleryState.images.length === 0 && !galleryState.loading}
    <div class="text-center py-12 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600">
      <ImageOutline class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-white mb-2">No Images Yet</h3>
      <div class="text-gray-400 text-sm space-y-1 max-w-md mx-auto">
        <p>Generate some images to see them here!</p>
        <p class="text-xs">
          Images from your ComfyUI workflows will automatically appear in this gallery.
        </p>
      </div>
    </div>
  {/if}
  
  <!-- Image Grid -->
  {#if galleryState.images.length > 0}
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {#each galleryState.images as image, index (image.filename)}
        <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
          <!-- Image Container -->
          <div class="relative aspect-square bg-gray-700">
            <img 
              src={image.url} 
              alt={image.filename}
              class="w-full h-full object-cover"
              loading="lazy"
              on:error={(e) => {
                console.warn('[Gallery] Failed to load image:', image.filename);
                e.target.classList.add('opacity-50');
              }}
            />
            
            <!-- Image Overlay with Actions -->
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div class="flex gap-2">
                <!-- View in Workspace -->
                <Button 
                  size="xs" 
                  color="blue"
                  on:click={() => handleViewImage(image)}
                  class="flex items-center gap-1"
                >
                  <ImageOutline class="w-3 h-3" />
                  View
                </Button>
                
                <!-- Remove from Gallery -->
                <Button 
                  size="xs" 
                  color="red"
                  on:click={() => handleRemoveImage(image.filename)}
                  class="flex items-center gap-1"
                >
                  ✖ Remove
                </Button>
              </div>
            </div>
          </div>
          
          <!-- Image Info -->
          <div class="p-3">
            <div class="text-sm text-gray-300 mb-1">
              <p class="truncate font-medium" title={image.filename}>
                {image.filename}
              </p>
            </div>
            
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span title={`Generated: ${new Date(image.timestamp).toLocaleString()}`}>
                {formatTimestamp(image.timestamp)}
              </span>
              
              <div class="flex items-center gap-1">
                {#if image.type === 'output'}
                  <Badge color="green" class="bg-green-600 text-xs py-0">Output</Badge>
                {:else}
                  <Badge color="yellow" class="bg-yellow-600 text-xs py-0">Temp</Badge>
                {/if}
              </div>
            </div>
            
            {#if image.subfolder}
              <div class="text-xs text-gray-500 mt-1 truncate" title={`Subfolder: ${image.subfolder}`}>
                📁 {image.subfolder}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Gallery Stats -->
    <div class="mt-6 pt-4 border-t border-gray-700">
      <div class="flex justify-between items-center text-sm text-gray-400">
        <span>
          Showing {galleryState.images.length} image{galleryState.images.length === 1 ? '' : 's'}
          from {galleryState.promptHistory.length} workflow{galleryState.promptHistory.length === 1 ? '' : 's'}
        </span>
        
        <div class="flex items-center gap-4">
          {#if galleryState.lastRefresh > 0}
            <span>
              Updated {formatTimestamp(galleryState.lastRefresh)}
            </span>
          {/if}
          
          <Button 
            size="xs" 
            color="gray"
            on:click={handleRefresh}
            disabled={galleryState.loading}
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom scrollbar for image grid if needed */
  .grid {
    scrollbar-width: thin;
    scrollbar-color: #4B5563 #1F2937;
  }
  
  .grid::-webkit-scrollbar {
    width: 6px;
  }
  
  .grid::-webkit-scrollbar-track {
    background: #1F2937;
  }
  
  .grid::-webkit-scrollbar-thumb {
    background: #4B5563;
    border-radius: 3px;
  }
  
  .grid::-webkit-scrollbar-thumb:hover {
    background: #6B7280;
  }
</style>
