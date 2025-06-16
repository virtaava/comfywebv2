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
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-white">Generated Images</h2>
        <Button 
            size="sm" 
            color="blue" 
            on:click={handleRefresh}
            disabled={galleryState.loading}
        >
            {galleryState.loading ? 'Loading...' : 'Refresh'}
        </Button>
    </div>

    <!-- Gallery Information - Only show when no images -->
    {#if galleryState.images.length === 0}
        <div class="mb-4 text-center text-gray-400 text-sm">
            <p class="text-xs text-gray-500">Only shows images generated through this interface (browser security limitation)</p>
        </div>
    {/if}

    <!-- Error Display -->
    {#if galleryState.errors.length > 0}
        <div class="mb-6 p-4 bg-red-900 rounded-lg border border-red-700">
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

    <!-- Images Grid -->
    {#if galleryState.images.length > 0}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {#each galleryState.images as image (image.filename)}
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
                                >
                                    View
                                </Button>
                                
                                <!-- Remove from Gallery -->
                                <Button 
                                    size="xs" 
                                    color="red"
                                    on:click={() => handleRemoveImage(image.filename)}
                                >
                                    Remove
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
                                    <span class="px-2 py-1 bg-green-600 text-white text-xs rounded">Output</span>
                                {:else}
                                    <span class="px-2 py-1 bg-yellow-600 text-white text-xs rounded">Temp</span>
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
                    {#if galleryState.promptHistory.length > 0}
                        from {galleryState.promptHistory.length} workflow{galleryState.promptHistory.length === 1 ? '' : 's'}
                    {/if}
                </span>
                
                <div class="flex items-center gap-4">
                    {#if galleryState.lastRefresh > 0}
                        <span class="text-xs">
                            Updated {formatTimestamp(galleryState.lastRefresh)}
                        </span>
                    {/if}
                    
                    <Button 
                        size="xs" 
                        color="gray"
                        on:click={handleRefresh}
                        disabled={galleryState.loading}
                    >
                        {galleryState.loading ? 'Loading...' : 'Refresh'}
                    </Button>
                </div>
            </div>
        </div>
    {:else}
        <!-- Empty State -->
        <div class="text-center py-12 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600">
            <div class="text-gray-500 mb-4">
                <svg class="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16v12H4V4zm16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM12 9.5c0-.83-.67-1.5-1.5-1.5S9 8.67 9 9.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zM17 16H7l2.5-3.15L11.5 15l2.5-3.15L17 16z"/>
                </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">No Images Yet</h3>
            <div class="text-gray-400 text-sm">
                <p>Generate some images to see them here!</p>
            </div>
        </div>
    {/if}
</div>
