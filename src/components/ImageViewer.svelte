<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { imageViewer, galleryHistory } from '../stores';
  import { Button, Badge } from 'flowbite-svelte';
  import { ChevronLeftOutline, ChevronRightOutline, CloseOutline, DownloadOutline, InfoCircleOutline, ZoomInOutline, ZoomOutOutline, ExpandOutline } from 'flowbite-svelte-icons';
  
  // Subscribe to image viewer state
  $: viewerState = $imageViewer;
  $: currentImage = viewerState.currentImage;
  $: showMetadata = viewerState.showMetadata;
  
  // Professional zoom and pan state
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let imageElement: HTMLImageElement;
  let containerElement: HTMLDivElement;
  let imageNaturalWidth = 0;
  let imageNaturalHeight = 0;
  
  // Zoom constraints
  const minScale = 0.1;
  const maxScale = 10;
  
  // Enhanced metadata state
  let enhancedMetadata: {
    seed?: number;
    model?: string;
    steps?: number;
    cfg?: number;
    sampler?: string;
    scheduler?: string;
    width?: number;
    height?: number;
    prompt?: string;
    negativePrompt?: string;
    denoise?: number;
  } = {};
  let isLoadingMetadata = false;
  
  // Enhanced download state
  let showDownloadMenu = false;
  let downloadMenuContainer: HTMLDivElement;
  
  // Computed properties
  $: hasMetadata = !!(enhancedMetadata.seed || enhancedMetadata.model || enhancedMetadata.prompt);
  
  // Load enhanced metadata from ComfyUI with comprehensive debugging
  async function loadEnhancedMetadata() {
    if (!currentImage?.promptId) {
      enhancedMetadata = {};
      return;
    }
    
    isLoadingMetadata = true;
    try {
      console.log('[Image Viewer] 🔍 Loading metadata for prompt:', currentImage.promptId);
      
      // Try to fetch from ComfyUI history API (use same endpoint as Gallery)
      const response = await fetch(`http://127.0.0.1:8188/api/history/${currentImage.promptId}`);
      console.log('[Image Viewer] 📡 Response status:', response.status, response.statusText);
      console.log('[Image Viewer] 📄 Response headers:', response.headers.get('content-type'));
      
      if (response.ok) {
        // Check content type before parsing
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        console.log('[Image Viewer] 📝 Raw response text (first 200 chars):', responseText.substring(0, 200));
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const historyData = JSON.parse(responseText);
            console.log('[Image Viewer] 📊 Parsed JSON successfully:', historyData);
            enhancedMetadata = parseHistoryMetadata(historyData);
          } catch (jsonError) {
            console.error('[Image Viewer] ❌ JSON parse error:', jsonError);
            console.log('[Image Viewer] 📝 Response that failed to parse:', responseText);
            enhancedMetadata = {};
          }
        } else {
          console.warn('[Image Viewer] ⚠️ Response is not JSON, content-type:', contentType);
          console.log('[Image Viewer] 📝 Non-JSON response:', responseText);
          
          // Try alternative API endpoints
          await tryAlternativeEndpoints();
        }
      } else {
        console.warn('[Image Viewer] ❌ HTTP error:', response.status, response.statusText);
        
        // Try alternative API endpoints
        await tryAlternativeEndpoints();
      }
    } catch (error) {
      console.warn('[Image Viewer] ❌ Network error loading metadata:', error);
      enhancedMetadata = {};
    } finally {
      isLoadingMetadata = false;
    }
  }
  
  // Try alternative API endpoints
  async function tryAlternativeEndpoints() {
    const endpoints = [
      `http://127.0.0.1:8188/api/history/${currentImage.promptId}`,
      `http://127.0.0.1:8188/history`,
      `http://127.0.0.1:8188/api/history`,
      `http://127.0.0.1:8188/queue/history/${currentImage.promptId}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log('[Image Viewer] 🔄 Trying alternative endpoint:', endpoint);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const responseText = await response.text();
            const historyData = JSON.parse(responseText);
            
            console.log('[Image Viewer] ✅ Alternative endpoint worked:', endpoint);
            console.log('[Image Viewer] 📊 Data from alternative endpoint:', historyData);
            
            // Check if this endpoint has our prompt data
            if (historyData[currentImage.promptId]) {
              enhancedMetadata = parseHistoryMetadata(historyData);
              return;
            } else {
              console.log('[Image Viewer] ⚠️ Endpoint works but no data for prompt:', currentImage.promptId);
            }
          }
        }
      } catch (error) {
        console.log('[Image Viewer] ❌ Alternative endpoint failed:', endpoint, error);
      }
    }
    
    console.warn('[Image Viewer] ❌ All API endpoints failed, metadata not available');
    enhancedMetadata = {};
  }
  
  // Parse metadata from ComfyUI history response with enhanced debugging
  function parseHistoryMetadata(historyData: any): typeof enhancedMetadata {
    try {
      const promptData = historyData[currentImage.promptId];
      if (!promptData?.prompt) {
        console.warn('[Image Viewer] ⚠️ No prompt data found in history response');
        return {};
      }
      
      // ComfyUI history format: prompt is [number, promptId, workflowObject]
      console.log('[Image Viewer] 📋 Prompt data structure:', promptData.prompt);
      const workflow = promptData.prompt[2]; // Get the workflow object from index 2
      
      if (!workflow || typeof workflow !== 'object') {
        console.warn('[Image Viewer] ⚠️ No workflow object found in prompt data');
        return {};
      }
      
      const metadata: typeof enhancedMetadata = {};
      
      console.log('[Image Viewer] 🔍 Analyzing workflow nodes...');
      
      // Find nodes by class type with comprehensive logging
      for (const [nodeId, nodeData] of Object.entries(workflow)) {
        const node = nodeData as any;
        
        console.log(`[Image Viewer] 📝 Node ${nodeId}:`, {
          class_type: node.class_type,
          inputs: node.inputs
        });
        
        // Enhanced KSampler detection with multiple types
        if (node.class_type === 'KSampler' || 
            node.class_type === 'KSamplerAdvanced' ||
            node.class_type === 'SamplerCustom' ||
            node.class_type.includes('Sampler')) {
          
          console.log('[Image Viewer] 🎯 Found sampler node:', node);
          
          // Extract seed - handle both number and string formats
          const seedValue = node.inputs?.seed || 
                           node.inputs?.noise_seed || 
                           node.inputs?.random_seed ||
                           node.inputs?.seed_value;
          
          if (seedValue !== undefined) {
            // Convert to number if it's a string, otherwise use as-is
            metadata.seed = typeof seedValue === 'string' ? parseInt(seedValue, 10) : seedValue;
            console.log('[Image Viewer] 🌱 Extracted seed:', metadata.seed);
          }
          
          metadata.steps = node.inputs?.steps;
          metadata.cfg = node.inputs?.cfg || node.inputs?.cfg_scale;
          metadata.sampler = node.inputs?.sampler_name || node.inputs?.sampler;
          metadata.scheduler = node.inputs?.scheduler;
          metadata.denoise = node.inputs?.denoise;
          
          console.log('[Image Viewer] 🔧 Extracted sampler data:', {
            seed: metadata.seed,
            steps: metadata.steps,
            cfg: metadata.cfg,
            sampler: metadata.sampler,
            scheduler: metadata.scheduler,
            denoise: metadata.denoise
          });
        }
        
        // CheckpointLoaderSimple nodes contain model information
        if (node.class_type === 'CheckpointLoaderSimple' || 
            node.class_type.includes('CheckpointLoader')) {
          metadata.model = node.inputs?.ckpt_name || node.inputs?.model_name;
          console.log('[Image Viewer] 🏭 Found model:', metadata.model);
        }
        
        // CLIPTextEncode nodes contain prompts
        if (node.class_type === 'CLIPTextEncode' || 
            node.class_type.includes('TextEncode')) {
          const text = node.inputs?.text;
          if (text) {
            console.log('[Image Viewer] 📝 Found text node with content:', text.substring(0, 100) + '...');
            
            // Determine positive vs negative prompt based on content and length
            if (text.trim() === '' || text.length < 5) {
              // Empty or very short text is likely negative prompt
              metadata.negativePrompt = text;
              console.log('[Image Viewer] ➖ Assigned as negative prompt (empty/short)');
            } else if (!metadata.prompt) {
              // First non-empty text becomes positive prompt
              metadata.prompt = text;
              console.log('[Image Viewer] ➕ Assigned as positive prompt (first non-empty)');
            } else if (text.length < metadata.prompt.length) {
              // Shorter text is likely negative prompt
              metadata.negativePrompt = text;
              console.log('[Image Viewer] ➖ Assigned as negative prompt (shorter)');
            } else {
              // If we already have a positive prompt and this is longer, 
              // move the shorter one to negative and this becomes positive
              metadata.negativePrompt = metadata.prompt;
              metadata.prompt = text;
              console.log('[Image Viewer] ➕ Reassigned as positive prompt (longer)');
            }
          }
        }
        
        // EmptyLatentImage nodes contain dimensions
        if (node.class_type === 'EmptyLatentImage' || 
            node.class_type.includes('LatentImage')) {
          metadata.width = node.inputs?.width;
          metadata.height = node.inputs?.height;
          console.log('[Image Viewer] 📐 Found dimensions:', metadata.width, 'x', metadata.height);
        }
      }
      
      // Also check execution outputs for additional metadata
      if (promptData.outputs) {
        console.log('[Image Viewer] 📤 Execution outputs:', promptData.outputs);
        // Sometimes metadata is in outputs rather than inputs
      }
      
      console.log('[Image Viewer] ✅ Final parsed metadata:', metadata);
      return metadata;
    } catch (error) {
      console.warn('[Image Viewer] ❌ Error parsing history metadata:', error);
      return {};
    }
  }
  
  // Copy text to clipboard with visual feedback
  async function copyToClipboard(text: string, type: string) {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`[Image Viewer] ✅ Copied ${type} to clipboard:`, text);
      // TODO: Add toast notification for copy success
    } catch (error) {
      console.warn(`[Image Viewer] ❌ Failed to copy ${type}:`, error);
      // Fallback: create temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
  
  // Toggle download menu
  function toggleDownloadMenu() {
    showDownloadMenu = !showDownloadMenu;
  }
  
  // Download original image (existing functionality)
  async function downloadOriginal() {
    showDownloadMenu = false;
    await downloadImage();
  }
  
  // Download with embedded metadata
  async function downloadWithMetadata() {
    if (!currentImage || !hasMetadata) return;
    showDownloadMenu = false;
    
    console.log('[Image Viewer] 🚀 Starting metadata embedding download...');
    
    try {
      // Fetch original image
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      
      // For now, create a JSON sidecar file until PNG chunk embedding is implemented
      const metadataString = JSON.stringify({
        ComfyUI_Seed: enhancedMetadata.seed,
        ComfyUI_Model: enhancedMetadata.model,
        ComfyUI_Steps: enhancedMetadata.steps,
        ComfyUI_CFG: enhancedMetadata.cfg,
        ComfyUI_Sampler: enhancedMetadata.sampler,
        ComfyUI_Scheduler: enhancedMetadata.scheduler,
        ComfyUI_Prompt: enhancedMetadata.prompt,
        ComfyUI_NegativePrompt: enhancedMetadata.negativePrompt,
        ComfyUI_Width: enhancedMetadata.width,
        ComfyUI_Height: enhancedMetadata.height,
        ComfyWeb_Version: '2.0.0',
        ComfyWeb_Export: new Date().toISOString()
      }, null, 2);
      
      // Download original image
      const imageLink = document.createElement('a');
      imageLink.href = URL.createObjectURL(blob);
      imageLink.download = currentImage.filename;
      document.body.appendChild(imageLink);
      imageLink.click();
      document.body.removeChild(imageLink);
      
      // Download metadata JSON
      const metadataBlob = new Blob([metadataString], { type: 'application/json' });
      const metadataLink = document.createElement('a');
      metadataLink.href = URL.createObjectURL(metadataBlob);
      metadataLink.download = `${currentImage.filename.replace(/\.[^/.]+$/, '')}_metadata.json`;
      document.body.appendChild(metadataLink);
      metadataLink.click();
      document.body.removeChild(metadataLink);
      
      console.log('[Image Viewer] ✅ Downloaded image with metadata sidecar');
      
    } catch (error) {
      console.error('[Image Viewer] ❌ Error downloading with metadata:', error);
      // Fallback to original download
      downloadOriginal();
    }
  }
  
  // Download metadata as JSON
  async function downloadMetadataJSON() {
    if (!hasMetadata) return;
    showDownloadMenu = false;
    
    const metadataExport = {
      image: {
        filename: currentImage.filename,
        resolution: `${enhancedMetadata.width || imageNaturalWidth}x${enhancedMetadata.height || imageNaturalHeight}`,
        type: currentImage.type,
        url: currentImage.url
      },
      generation: {
        seed: enhancedMetadata.seed,
        model: enhancedMetadata.model,
        steps: enhancedMetadata.steps,
        cfg: enhancedMetadata.cfg,
        sampler: enhancedMetadata.sampler,
        scheduler: enhancedMetadata.scheduler,
        denoise: enhancedMetadata.denoise
      },
      prompts: {
        positive: enhancedMetadata.prompt,
        negative: enhancedMetadata.negativePrompt
      },
      workflow: {
        promptId: currentImage.promptId,
        nodeId: currentImage.nodeId,
        timestamp: new Date(currentImage.timestamp).toISOString()
      },
      export: {
        comfyWebVersion: '2.0.0',
        exportTimestamp: new Date().toISOString(),
        exportedBy: 'ComfyWeb v2 Professional Image Viewer'
      }
    };
    
    const jsonBlob = new Blob([JSON.stringify(metadataExport, null, 2)], {
      type: 'application/json'
    });
    
    const filename = `${currentImage.filename.replace(/\.[^/.]+$/, '')}_metadata.json`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(jsonBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('[Image Viewer] ✅ Downloaded metadata JSON');
  }
  
  // Close download menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (downloadMenuContainer && !downloadMenuContainer.contains(event.target as Node)) {
      showDownloadMenu = false;
    }
  }
  
  // Reset transform and load metadata when image changes
  $: if (currentImage) {
    resetTransform();
    loadEnhancedMetadata();
  }
  
  // Professional mouse wheel zoom with cursor targeting
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    
    if (!imageElement || !containerElement) return;
    
    const delta = event.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));
    
    if (newScale === scale) return; // No change needed
    
    // Get mouse position relative to container
    const containerRect = containerElement.getBoundingClientRect();
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    
    // Zoom towards cursor position
    zoomToPoint(newScale, mouseX, mouseY);
  }
  
  // Professional click and drag panning
  function handleMouseDown(event: MouseEvent) {
    if (scale <= 1) return; // Only allow pan when zoomed in
    
    event.preventDefault();
    isDragging = true;
    dragStart = { 
      x: event.clientX - translateX, 
      y: event.clientY - translateY 
    };
    
    // Change cursor
    if (containerElement) {
      containerElement.style.cursor = 'grabbing';
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;
    
    event.preventDefault();
    const newTranslateX = event.clientX - dragStart.x;
    const newTranslateY = event.clientY - dragStart.y;
    
    const constrainedTransform = constrainTransform(scale, newTranslateX, newTranslateY);
    updateTransform(constrainedTransform.scale, constrainedTransform.x, constrainedTransform.y);
  }
  
  function handleMouseUp() {
    isDragging = false;
    
    // Reset cursor
    if (containerElement) {
      containerElement.style.cursor = scale > 1 ? 'grab' : 'default';
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  // Double-click to fit screen
  function handleDoubleClick() {
    fitToScreen();
  }
  
  // Constrain transform to reasonable boundaries
  function constrainTransform(newScale: number, newTranslateX: number, newTranslateY: number) {
    if (!imageElement || !containerElement) {
      return { scale: newScale, x: newTranslateX, y: newTranslateY };
    }
    
    const containerWidth = containerElement.clientWidth;
    const containerHeight = containerElement.clientHeight;
    const imageWidth = imageNaturalWidth * newScale;
    const imageHeight = imageNaturalHeight * newScale;
    
    // Constrain translation to keep image visible
    let constrainedX = newTranslateX;
    let constrainedY = newTranslateY;
    
    if (imageWidth > containerWidth) {
      // Image is wider than container
      const maxX = (imageWidth - containerWidth) / 2;
      const minX = -maxX;
      constrainedX = Math.max(minX, Math.min(maxX, newTranslateX));
    } else {
      // Image is smaller than container, center it
      constrainedX = 0;
    }
    
    if (imageHeight > containerHeight) {
      // Image is taller than container
      const maxY = (imageHeight - containerHeight) / 2;
      const minY = -maxY;
      constrainedY = Math.max(minY, Math.min(maxY, newTranslateY));
    } else {
      // Image is smaller than container, center it
      constrainedY = 0;
    }
    
    return { scale: newScale, x: constrainedX, y: constrainedY };
  }
  
  // Update transform with smooth animation
  function updateTransform(newScale: number, newTranslateX: number, newTranslateY: number) {
    scale = newScale;
    translateX = newTranslateX;
    translateY = newTranslateY;
    
    if (imageElement) {
      imageElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
    
    // Update cursor based on zoom level
    if (containerElement) {
      containerElement.style.cursor = scale > 1 ? 'grab' : 'default';
    }
  }
  
  // Reset transform to initial state
  function resetTransform() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    if (imageElement) {
      imageElement.style.transform = `translate(0px, 0px) scale(1)`;
    }
    if (containerElement) {
      containerElement.style.cursor = 'default';
    }
  }
  
  // Fit image to screen with padding
  function fitToScreen() {
    if (!imageElement || !containerElement) return;
    
    const containerWidth = containerElement.clientWidth - 40; // Padding
    const containerHeight = containerElement.clientHeight - 40;
    const imageAspect = imageNaturalWidth / imageNaturalHeight;
    const containerAspect = containerWidth / containerHeight;
    
    let newScale;
    if (imageAspect > containerAspect) {
      // Image is wider relative to container
      newScale = containerWidth / imageNaturalWidth;
    } else {
      // Image is taller relative to container
      newScale = containerHeight / imageNaturalHeight;
    }
    
    // Center the image
    const newTranslateX = 0;
    const newTranslateY = 0;
    
    const constrainedTransform = constrainTransform(newScale, newTranslateX, newTranslateY);
    updateTransform(constrainedTransform.scale, constrainedTransform.x, constrainedTransform.y);
  }
  
  // Zoom to specific point (for mouse wheel zoom)
  function zoomToPoint(newScale: number, pointX: number, pointY: number) {
    if (!imageElement || !containerElement) return;
    
    // Calculate the zoom center relative to current image position
    const currentImageX = translateX;
    const currentImageY = translateY;
    
    // Calculate new translation to keep the point under the cursor
    const scaleRatio = newScale / scale;
    const newTranslateX = pointX - (pointX - currentImageX) * scaleRatio;
    const newTranslateY = pointY - (pointY - currentImageY) * scaleRatio;
    
    const constrainedTransform = constrainTransform(newScale, newTranslateX, newTranslateY);
    updateTransform(constrainedTransform.scale, constrainedTransform.x, constrainedTransform.y);
  }
  
  // Handle image load to get natural dimensions
  function handleImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    imageNaturalWidth = img.naturalWidth;
    imageNaturalHeight = img.naturalHeight;
    resetTransform();
  }
  
  // Keyboard navigation with enhanced zoom controls
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
        const zoomInPoint = { x: containerElement?.clientWidth / 2 || 0, y: containerElement?.clientHeight / 2 || 0 };
        zoomToPoint(scale * 1.2, zoomInPoint.x, zoomInPoint.y);
        break;
      case '-':
        const zoomOutPoint = { x: containerElement?.clientWidth / 2 || 0, y: containerElement?.clientHeight / 2 || 0 };
        zoomToPoint(scale / 1.2, zoomOutPoint.x, zoomOutPoint.y);
        break;
      case '0':
        resetZoom();
        break;
      case 'f':
      case 'F':
        fitToScreen();
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
  
  // Enhanced zoom controls (buttons)
  function zoomIn() {
    const centerPoint = { x: containerElement?.clientWidth / 2 || 0, y: containerElement?.clientHeight / 2 || 0 };
    zoomToPoint(scale * 1.2, centerPoint.x, centerPoint.y);
  }
  
  function zoomOut() {
    const centerPoint = { x: containerElement?.clientWidth / 2 || 0, y: containerElement?.clientHeight / 2 || 0 };
    zoomToPoint(scale / 1.2, centerPoint.x, centerPoint.y);
  }
  
  function resetZoom() {
    resetTransform();
  }
  
  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleClickOutside);
  });
  
  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleClickOutside);
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
            {Math.round(scale * 100)}%
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
        
        <!-- Enhanced Download Button with Options -->
        <div class="relative" bind:this={downloadMenuContainer}>
          <Button 
            size="sm" 
            color="blue" 
            on:click={toggleDownloadMenu} 
            class="flex items-center gap-1"
          >
            <DownloadOutline class="w-4 h-4" />
            Download
            <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </Button>
          
          {#if showDownloadMenu}
            <div class="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
              <div class="p-2">
                <!-- Original Download -->
                <button 
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center gap-3"
                  on:click={downloadOriginal}
                >
                  <DownloadOutline class="w-4 h-4 text-gray-400" />
                  <div>
                    <div>Save Image (Original)</div>
                    <div class="text-xs text-gray-400">Downloads image as-is</div>
                  </div>
                </button>
                
                <!-- Save with Metadata -->
                <button 
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center gap-3 {!hasMetadata ? 'opacity-50 cursor-not-allowed' : ''}"
                  on:click={downloadWithMetadata}
                  disabled={!hasMetadata}
                >
                  <DownloadOutline class="w-4 h-4 text-blue-400" />
                  <div>
                    <div class="flex items-center gap-2">
                      Save with Metadata
                      <Badge color="blue" class="text-xs">⭐ Pro</Badge>
                    </div>
                    <div class="text-xs text-gray-400">
                      {hasMetadata ? 'Embeds generation parameters' : 'Metadata not available'}
                    </div>
                  </div>
                </button>
                
                <!-- Save Metadata JSON -->
                <button 
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center gap-3 {!hasMetadata ? 'opacity-50 cursor-not-allowed' : ''}"
                  on:click={downloadMetadataJSON}
                  disabled={!hasMetadata}
                >
                  <InfoCircleOutline class="w-4 h-4 text-green-400" />
                  <div>
                    <div>Save Metadata JSON</div>
                    <div class="text-xs text-gray-400">
                      {hasMetadata ? 'Exports parameters as JSON' : 'Metadata not available'}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          {/if}
        </div>
        
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
      <div 
        class="flex-1 flex items-center justify-center p-4 bg-gray-900 overflow-hidden"
        bind:this={containerElement}
        on:wheel={handleWheel}
        on:mousedown={handleMouseDown}
        on:dblclick={handleDoubleClick}
      >
        <div class="relative">
          <img 
            bind:this={imageElement}
            src={currentImage.url} 
            alt={currentImage.filename}
            class="max-w-none h-auto shadow-2xl"
            style="transform: translate({translateX}px, {translateY}px) scale({scale}); transform-origin: center;"
            loading="lazy"
            on:load={handleImageLoad}
            on:error={(e) => {
              console.warn('[Image Viewer] Failed to load image:', currentImage.filename);
              e.target.classList.add('opacity-50');
            }}
          />
        </div>
      </div>
      
      <!-- Metadata panel -->
      {#if showMetadata}
        <div class="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
          <!-- Fixed header -->
          <div class="p-4 border-b border-gray-700 flex-shrink-0">
            <h3 class="text-lg font-semibold text-white">Image Details</h3>
          </div>
          
          <!-- Scrollable content -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="space-y-4">
            <!-- File Information -->
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
                
                {#if enhancedMetadata.width && enhancedMetadata.height}
                  <div>
                    <span class="text-gray-400">Resolution:</span>
                    <p class="text-white text-sm">{enhancedMetadata.width} × {enhancedMetadata.height}</p>
                  </div>
                {:else if imageNaturalWidth && imageNaturalHeight}
                  <div>
                    <span class="text-gray-400">Resolution:</span>
                    <p class="text-white text-sm">{imageNaturalWidth} × {imageNaturalHeight}</p>
                  </div>
                {/if}
                
                {#if currentImage.subfolder}
                  <div>
                    <span class="text-gray-400">Subfolder:</span>
                    <p class="text-white font-mono text-xs">{currentImage.subfolder}</p>
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Generation Parameters -->
            <div>
              <h4 class="text-sm font-medium text-gray-400 mb-2">🎯 Generation Parameters</h4>
              {#if isLoadingMetadata}
                <div class="text-gray-500 text-sm">Loading metadata...</div>
              {:else}
                <div class="space-y-3">
                  <!-- SEED - Most Critical -->
                  {#if enhancedMetadata.seed !== undefined}
                    <div class="bg-blue-900 rounded-lg p-3 border border-blue-700">
                      <div class="flex items-center justify-between">
                        <span class="text-blue-200 font-medium">Seed:</span>
                        <button 
                          class="text-xs text-blue-300 hover:text-blue-100 px-2 py-1 rounded bg-blue-800 hover:bg-blue-700"
                          on:click={() => copyToClipboard(enhancedMetadata.seed.toString(), 'seed')}
                          title="Copy seed to clipboard"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <p class="text-white font-mono text-lg font-bold">{enhancedMetadata.seed}</p>
                    </div>
                  {:else}
                    <div class="bg-gray-700 rounded-lg p-3 border border-gray-600">
                      <span class="text-gray-300">Seed: Not available</span>
                    </div>
                  {/if}
                  
                  <!-- Model Information -->
                  {#if enhancedMetadata.model}
                    <div>
                      <span class="text-gray-400">Model:</span>
                      <p class="text-white font-mono text-sm break-all">{enhancedMetadata.model}</p>
                    </div>
                  {/if}
                  
                  <!-- Generation Settings -->
                  <div class="grid grid-cols-2 gap-3">
                    {#if enhancedMetadata.steps}
                      <div>
                        <span class="text-gray-400 text-xs">Steps:</span>
                        <p class="text-white font-semibold">{enhancedMetadata.steps}</p>
                      </div>
                    {/if}
                    
                    {#if enhancedMetadata.cfg}
                      <div>
                        <span class="text-gray-400 text-xs">CFG Scale:</span>
                        <p class="text-white font-semibold">{enhancedMetadata.cfg}</p>
                      </div>
                    {/if}
                    
                    {#if enhancedMetadata.sampler}
                      <div class="col-span-2">
                        <span class="text-gray-400 text-xs">Sampler:</span>
                        <p class="text-white text-sm">{enhancedMetadata.sampler}</p>
                      </div>
                    {/if}
                    
                    {#if enhancedMetadata.scheduler}
                      <div class="col-span-2">
                        <span class="text-gray-400 text-xs">Scheduler:</span>
                        <p class="text-white text-sm">{enhancedMetadata.scheduler}</p>
                      </div>
                    {/if}
                    
                    {#if enhancedMetadata.denoise !== undefined}
                      <div>
                        <span class="text-gray-400 text-xs">Denoise:</span>
                        <p class="text-white font-semibold">{enhancedMetadata.denoise}</p>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
            
            <!-- Prompts -->
            {#if enhancedMetadata.prompt || enhancedMetadata.negativePrompt}
              <div>
                <h4 class="text-sm font-medium text-gray-400 mb-2">📝 Prompts</h4>
                <div class="space-y-3">
                  {#if enhancedMetadata.prompt}
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-green-400 text-sm font-medium">Positive Prompt:</span>
                        <button 
                          class="text-xs text-green-300 hover:text-green-100 px-2 py-1 rounded bg-green-800 hover:bg-green-700"
                          on:click={() => copyToClipboard(enhancedMetadata.prompt, 'positive prompt')}
                          title="Copy positive prompt"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div class="bg-gray-900 rounded p-3 max-h-32 overflow-y-auto">
                        <p class="text-white text-sm whitespace-pre-wrap">{enhancedMetadata.prompt}</p>
                      </div>
                    </div>
                  {/if}
                  
                  {#if enhancedMetadata.negativePrompt}
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-red-400 text-sm font-medium">Negative Prompt:</span>
                        <button 
                          class="text-xs text-red-300 hover:text-red-100 px-2 py-1 rounded bg-red-800 hover:bg-red-700"
                          on:click={() => copyToClipboard(enhancedMetadata.negativePrompt, 'negative prompt')}
                          title="Copy negative prompt"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div class="bg-gray-900 rounded p-3 max-h-32 overflow-y-auto">
                        <p class="text-white text-sm whitespace-pre-wrap">{enhancedMetadata.negativePrompt}</p>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
            
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
                <span class="text-white text-sm">{Math.round(scale * 100)}%</span>
                <div class="flex-1 bg-gray-700 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all"
                    style="width: {Math.min(100, (scale / 3) * 100)}%"
                  ></div>
                </div>
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
        <span class="mr-4">Wheel/+/- Zoom</span>
        <span class="mr-4">Drag Pan</span>
        <span class="mr-4">0 Reset</span>
        <span class="mr-4">F Fit</span>
        <span class="mr-4">I Info</span>
        <span>Esc Close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Professional image viewer styling */
  img {
    transition: none; /* Disable transitions for smooth drag performance */
    image-rendering: auto;
    image-rendering: crisp-edges;
    image-rendering: -webkit-optimize-contrast;
  }
  
  /* Professional cursor states */
  .overflow-hidden {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
  }
  
  /* Disable text selection during drag */
  .overflow-hidden * {
    pointer-events: none;
  }
  
  .overflow-hidden img {
    pointer-events: auto;
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
  
  /* Prevent image dragging */
  img {
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    user-drag: none;
  }
</style>
