<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { imageViewer, galleryHistory } from '../stores';
  import { Button, Badge } from 'flowbite-svelte';
  import { ChevronLeftOutline, ChevronRightOutline, CloseOutline, DownloadOutline, InfoCircleOutline, ZoomInOutline, ZoomOutOutline, ExpandOutline } from 'flowbite-svelte-icons';
  
  // Subscribe to image viewer state
  $: viewerState = $imageViewer;
  $: currentImage = viewerState.currentImage;
  $: zoomLevel = viewerState.zoomLevel;
  $: showMetadata = viewerState.showMetadata;
  
  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    if (!viewerState.isActive) return;
    
    switch (event.key) {
      case 'Escape':
        imageViewer.close();
        break;
      case 'ArrowLeft':
        imageViewer.prevImage();
        break;
      case 'ArrowRight':
        imageViewer.nextImage();
        break;
      case '+':
      case '=':
        imageViewer.setZoom(zoomLevel * 1.2);
        break;
      case '-':
        imageViewer.setZoom(zoomLevel / 1.2);
        break;
      case '0':
        imageViewer.setZoom(1);
        break;
      case 'i':
        imageViewer.toggleMetadata();
        break;
    }
  }
  
  // Handle image removal
  function handleRemoveImage() {
    if (!currentImage) return;
    
    // Remove from gallery
    galleryHistory.removeImage(currentImage.filename);
    
    // Navigate to next image or close if this was the last one
    if (viewerState.galleryImages.length > 1) {
      imageViewer.nextImage();
    } else {
      imageViewer.close();
    }
  }
  
  // Download image with enhanced cross-origin support
  async function downloadImage() {
    if (!currentImage) return;
    
    console.log('[Image Viewer] Download started for:', currentImage.filename);
    console.log('[Image Viewer] Image URL:', currentImage.url);
    
    try {
      // Try to fetch the image data first to handle CORS and ensure download
      const response = await fetch(currentImage.url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      // Get the image as a blob
      const blob = await response.blob();
      
      // Create object URL for the blob
      const blobUrl = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = currentImage.filename;
      
      // Temporarily add to DOM and click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
      console.log('✅ [Image Viewer] Download completed for:', currentImage.filename);
      
    } catch (error) {
      console.error('❌ [Image Viewer] Download failed:', error);
      
      // Fallback: try direct link method
      console.log('[Image Viewer] Attempting fallback download method...');
      
      try {
        const link = document.createElement('a');
        link.href = currentImage.url;
        link.download = currentImage.filename;
        link.target = '_blank'; // Fallback to opening in new tab if download fails
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('⚠️ [Image Viewer] Fallback download attempted');
      } catch (fallbackError) {
        console.error('❌ [Image Viewer] Both download methods failed:', fallbackError);
        
        // Final fallback: open in new tab
        window.open(currentImage.url, '_blank');
        console.log('⚠️ [Image Viewer] Opened image in new tab as final fallback');
      }
    }
  }
  
  // Format timestamp
  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
  
  // Zoom controls
  function zoomIn() {
    imageViewer.setZoom(zoomLevel * 1.2);
  }
  
  function zoomOut() {
    imageViewer.setZoom(zoomLevel / 1.2);
  }
  
  function resetZoom() {
    imageViewer.setZoom(1);
  }
  
  function fitToScreen() {
    imageViewer.setZoom(0.9); // Slightly smaller than full screen for padding
  }
  
  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if viewerState.isActive && currentImage}
  <div class="h-full w-full bg-gray-900 flex flex-col">
    <!-- Header with controls -->
    <div class="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-white">Image Viewer</h2>
        <Badge color="blue" class="bg-blue-600">
          {viewerState.currentIndex + 1} of {viewerState.galleryImages.length}
        </Badge>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Navigation controls -->
        {#if viewerState.galleryImages.length > 1}
          <Button 
            size="sm" 
            color="gray"
            on:click={() => imageViewer.prevImage()}
            disabled={viewerState.galleryImages.length <= 1}
            class="flex items-center gap-1"
          >
            <ChevronLeftOutline class="w-4 h-4" />
            Previous
          </Button>
          
          <Button 
            size="sm" 
            color="gray"
            on:click={() => imageViewer.nextImage()}
            disabled={viewerState.galleryImages.length <= 1}
            class="flex items-center gap-1"
          >
            Next
            <ChevronRightOutline class="w-4 h-4" />
          </Button>
        {/if}
        
        <!-- Zoom controls -->
        <div class="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
          <Button size="xs" color="gray" on:click={zoomOut} class="p-1">
            <ZoomOutOutline class="w-3 h-3" />
          </Button>
          
          <span class="text-xs text-gray-300 px-2 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          
          <Button size="xs" color="gray" on:click={zoomIn} class="p-1">
            <ZoomInOutline class="w-3 h-3" />
          </Button>
          
          <Button size="xs" color="gray" on:click={resetZoom} class="p-1" title="Reset zoom (1:1)">
            1:1
          </Button>
          
          <Button size="xs" color="gray" on:click={fitToScreen} class="p-1" title="Fit to screen">
            <ExpandOutline class="w-3 h-3" />
          </Button>
        </div>
        
        <!-- Action buttons -->
        <Button size="sm" color="gray" on:click={() => imageViewer.toggleMetadata()} class="flex items-center gap-1">
          <InfoCircleOutline class="w-4 h-4" />
          Info
        </Button>
        
        <Button size="sm" color="blue" on:click={downloadImage} class="flex items-center gap-1">
          <DownloadOutline class="w-4 h-4" />
          Download
        </Button>
        
        <Button size="sm" color="red" on:click={handleRemoveImage} class="flex items-center gap-1">
          ✖ Remove
        </Button>
        
        <Button size="sm" color="gray" on:click={() => imageViewer.close()} class="flex items-center gap-1">
          <CloseOutline class="w-4 h-4" />
          Close
        </Button>
      </div>
    </div>
    
    <!-- Main content area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Image display area -->
      <div class="flex-1 flex items-center justify-center p-4 bg-gray-900 overflow-auto">
        <div class="relative">
          <img 
            src={currentImage.url} 
            alt={currentImage.filename}
            class="max-w-none h-auto shadow-2xl"
            style="transform: scale({zoomLevel}); transform-origin: center;"
            loading="lazy"
            on:error={(e) => {
              console.warn('[Image Viewer] Failed to load image:', currentImage.filename);
              e.target.classList.add('opacity-50');
            }}
          />
        </div>
      </div>
      
      <!-- Metadata panel -->
      {#if showMetadata}
        <div class="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <h3 class="text-lg font-semibold text-white mb-4">Image Details</h3>
          
          <div class="space-y-4">
            <!-- Basic info -->
            <div>
              <h4 class="text-sm font-medium text-gray-400 mb-2">File Information</h4>
              <div class="space-y-2 text-sm">
                <div>
                  <span class="text-gray-400">Filename:</span>
                  <p class="text-white font-mono text-xs break-all">{currentImage.filename}</p>
                </div>
                
                <div>
                  <span class="text-gray-400">Type:</span>
                  <Badge color={currentImage.type === 'output' ? 'green' : 'yellow'} class="ml-2">
                    {currentImage.type}
                  </Badge>
                </div>
                
                {#if currentImage.subfolder}
                  <div>
                    <span class="text-gray-400">Subfolder:</span>
                    <p class="text-white font-mono text-xs">{currentImage.subfolder}</p>
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Generation info -->
            <div>
              <h4 class="text-sm font-medium text-gray-400 mb-2">Generation Details</h4>
              <div class="space-y-2 text-sm">
                <div>
                  <span class="text-gray-400">Prompt ID:</span>
                  <p class="text-white font-mono text-xs break-all">{currentImage.promptId}</p>
                </div>
                
                <div>
                  <span class="text-gray-400">Node ID:</span>
                  <p class="text-white font-mono text-xs">{currentImage.nodeId}</p>
                </div>
                
                <div>
                  <span class="text-gray-400">Generated:</span>
                  <p class="text-white text-xs">{formatTimestamp(currentImage.timestamp)}</p>
                </div>
              </div>
            </div>
            
            <!-- Image URL -->
            <div>
              <h4 class="text-sm font-medium text-gray-400 mb-2">Image URL</h4>
              <div class="bg-gray-900 rounded p-2">
                <p class="text-xs text-gray-300 font-mono break-all">{currentImage.url}</p>
              </div>
            </div>
            
            <!-- Zoom info -->
            <div>
              <h4 class="text-sm font-medium text-gray-400 mb-2">Zoom Level</h4>
              <div class="flex items-center gap-2">
                <span class="text-white text-sm">{Math.round(zoomLevel * 100)}%</span>
                <div class="flex-1 bg-gray-700 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all"
                    style="width: {Math.min(100, (zoomLevel / 3) * 100)}%"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Keyboard shortcuts hint -->
    <div class="px-4 py-2 bg-gray-800 border-t border-gray-700">
      <div class="text-xs text-gray-400 text-center">
        <span class="mr-4">← → Navigate</span>
        <span class="mr-4">+/- Zoom</span>
        <span class="mr-4">0 Reset</span>
        <span class="mr-4">I Info</span>
        <span>Esc Close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Smooth zoom transitions */
  img {
    transition: transform 0.2s ease-out;
  }
  
  /* Custom scrollbar for metadata panel */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: #4B5563 #1F2937;
  }
  
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1F2937;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #4B5563;
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #6B7280;
  }
</style>
