<script lang="ts">
    import { onMount } from "svelte";
    import { Button } from "flowbite-svelte";
    import { sessionImages, outputImages, serverHost } from "../stores";

    let session: string[] = [];
    let output: string[] = [];

    sessionImages.subscribe(val => session = val);
    outputImages.subscribe(val => output = val);

    async function loadOutputImages() {
        outputImages.refresh($serverHost);
    }

    onMount(() => {
        loadOutputImages();
    });
</script>

<div class="p-4 h-full overflow-y-auto">
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-white">Image Gallery</h2>
        <Button size="sm" color="blue" on:click={loadOutputImages}>
            Refresh
        </Button>
    </div>

    {#if session.length > 0}
        <div class="mb-6">
            <h3 class="text-md font-medium text-gray-300 mb-3">Session Images ({session.length})</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {#each session as img}
                    <div class="relative group">
                        <img 
                            src={img} 
                            alt="session image" 
                            class="w-full h-24 object-cover rounded-lg border border-gray-600 hover:border-purple-400 transition-colors cursor-pointer" 
                        />
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg"></div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    {#if output.length > 0}
        <div class="mb-6">
            <h3 class="text-md font-medium text-gray-300 mb-3">ComfyUI Output Folder ({output.length})</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {#each output as img}
                    <div class="relative group">
                        <img 
                            src={img} 
                            alt="output image" 
                            class="w-full h-24 object-cover rounded-lg border border-gray-600 hover:border-blue-400 transition-colors cursor-pointer" 
                        />
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg"></div>
                    </div>
                {/each}
            </div>
        </div>
    {:else}
        <div class="text-center py-8">
            <p class="text-gray-400 mb-4">No output images found</p>
            <p class="text-sm text-gray-500">ComfyUI output folder may not be accessible or empty</p>
        </div>
    {/if}

    {#if session.length === 0 && output.length === 0}
        <div class="text-center py-12">
            <div class="text-gray-500 mb-4">
                <svg class="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16v12H4V4zm16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM12 9.5c0-.83-.67-1.5-1.5-1.5S9 8.67 9 9.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zM17 16H7l2.5-3.15L11.5 15l2.5-3.15L17 16z"/>
                </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">No Images Found</h3>
            <p class="text-gray-400 mb-4">Generate some images to see them here</p>
            <p class="text-sm text-gray-500">Session images will appear after generation</p>
        </div>
    {/if}
</div>
