<script lang="ts">
    import { onMount } from "svelte";
    import { Button } from "flowbite-svelte";
    import { galleryHistory, refreshGalleryImages, imageViewer } from "../stores";

    // Subscribe to our gallery state
    $: galleryState = $galleryHistory;

    async function handleRefresh() {
        console.log('[Gallery Tab] Manual refresh triggered');
        console.log('[Gallery Tab] Current gallery state:', galleryState);
        console.log('[Gallery Tab] Prompt history length:', galleryState.promptHistory.length);
        await refreshGalleryImages();
    }

    onMount(() => {
        // Auto-refresh on mount if we have prompt history
        if (galleryState.promptHistory.length > 0) {
            refreshGalleryImages();
        }
    });

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

    // Handle image viewing in workspace
    function handleViewImage(image) {
        console.log('[Gallery Tab] View image clicked:', image);
        
        // Pass all gallery images for navigation
        imageViewer.viewImage(image, galleryState.images);
        
        console.log('[Gallery Tab] Image viewer state after call:', $imageViewer);
    }

    // Handle image removal
    function handleRemoveImage(filename: string) {
        galleryHistory.removeImage(filename);
    }
</script>

<div class="p-4 h-full overflow-y-auto">
    <!-- Clean, Professional Header -->
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 class="text-xl font-bold text-white">Generated Images</h2>
            <p class="text-sm text-gray-400">Your AI creations showcase</p>
        </div>
        <Button 
            color="blue" 
            size="sm"
            on:click={handleRefresh}
            disabled={galleryState.loading}
            class="shadow-md hover:shadow-lg transition-shadow duration-200"
        >
            {#if galleryState.loading}
                <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            {/if}
            {galleryState.loading ? 'Loading...' : 'Refresh'}
        </Button>
    </div>

    <!-- Gallery Information -->
    {#if galleryState.images.length === 0}
        <div class="mb-6 text-center">
            <div class="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm text-blue-300">Only shows images generated through this interface</span>
            </div>
        </div>
    {/if}

    <!-- Error Display -->
    {#if galleryState.errors.length > 0}
        <div class="mb-6 p-4 bg-red-900/50 rounded-lg border border-red-700">
            <h3 class="text-red-300 font-medium mb-2">Gallery Errors ({galleryState.errors.length})</h3>
            <div class="text-red-200 text-sm space-y-1">
                {#each galleryState.errors as error, index}
                    <div>{index + 1}. {error}</div>
                {/each}
            </div>
            <Button 
                size="xs" 
                color="red" 
                class="mt-3"
                on:click={() => galleryHistory.clearErrors()}
            >
                Clear Errors
            </Button>
        </div>
    {/if}

    <!-- Images Grid - 2 columns, larger cards, expandable down -->
    {#if galleryState.images.length > 0}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {#each galleryState.images as image (image.filename)}
                <div class="bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 border border-gray-700">
                    <!-- Image Container -->
                    <div class="relative aspect-square bg-gray-700">
                        <img 
                            src={image.url} 
                            alt={image.filename}
                            class="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                            loading="lazy"
                            on:error={(e) => {
                                console.warn('[Gallery] Failed to load image:', image.filename);
                                e.target.classList.add('opacity-50');
                            }}
                        />
                    </div>
                    
                    <!-- Image Information and Actions -->
                    <div class="p-4">
                        <!-- Filename -->
                        <div class="mb-3">
                            <h3 class="text-sm font-medium text-gray-200 truncate" title={image.filename}>
                                {image.filename}
                            </h3>
                        </div>
                        
                        <!-- Timestamp and Subfolder -->
                        <div class="mb-4 space-y-2">
                            <div class="flex items-center gap-2 text-xs text-gray-400">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span title={`Generated: ${new Date(image.timestamp).toLocaleString()}`}>
                                    {formatTimestamp(image.timestamp)}
                                </span>
                            </div>
                            
                            {#if image.subfolder}
                                <div class="flex items-center gap-2 text-xs text-gray-500">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    <span class="truncate" title={`Subfolder: ${image.subfolder}`}>
                                        {image.subfolder}
                                    </span>
                                </div>
                            {/if}
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex gap-3">
                            <Button 
                                size="sm" 
                                color="blue"
                                class="flex-1 shadow-md hover:shadow-lg transition-shadow duration-200"
                                on:click={() => handleViewImage(image)}
                            >
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                            </Button>
                            
                            <Button 
                                size="sm" 
                                color="red"
                                class="shadow-md hover:shadow-lg transition-shadow duration-200"
                                on:click={() => handleRemoveImage(image.filename)}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </Button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
        
        <!-- Clean Gallery Statistics -->
        <div class="mt-8 pt-4 border-t border-gray-700">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-sm">
                <div class="text-gray-300 font-medium">
                    Showing {galleryState.images.length} image{galleryState.images.length === 1 ? '' : 's'}
                    {#if galleryState.promptHistory.length > 0}
                        from {galleryState.promptHistory.length} workflow{galleryState.promptHistory.length === 1 ? '' : 's'}
                    {/if}
                </div>
                
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                    {#if galleryState.lastRefresh > 0}
                        <span class="text-gray-400">
                            Updated {formatTimestamp(galleryState.lastRefresh)}
                        </span>
                    {/if}
                    
                    <Button 
                        size="xs" 
                        color="gray"
                        on:click={handleRefresh}
                        disabled={galleryState.loading}
                    >
                        {galleryState.loading ? 'Loading...' : 'Refresh Gallery'}
                    </Button>
                </div>
            </div>
        </div>
    {:else}
        <!-- Professional Empty State -->
        <div class="text-center py-16 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-600">
            <div class="text-gray-400 mb-6">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16v12H4V4zm16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM12 9.5c0-.83-.67-1.5-1.5-1.5S9 8.67 9 9.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zM17 16H7l2.5-3.15L11.5 15l2.5-3.15L17 16z"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-3">No Images Yet</h3>
            <div class="text-gray-400">
                <p>Generate some images to see them here!</p>
                <p class="text-sm mt-2 opacity-75">Use the Generate button in the Workflow tab</p>
            </div>
        </div>
    {/if}
</div>
