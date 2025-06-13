<script lang="ts">
    import {
        Toggle,
        Input,
        NumberInput,
        Select,
        Label,
        Textarea,
        Button,
    } from "flowbite-svelte";
    import { ImageSolid, FolderOpenSolid } from "flowbite-svelte-icons";
    import type { DeepReadonly } from "ts-essentials";

    import { NodeInputSchema } from "../lib/comfy";
    import { serverHost } from "../stores";

    export let fields: Record<string, any>;
    export let schema: DeepReadonly<Record<string, NodeInputSchema>>;

    // Upload state management
    let uploadingFiles: Record<string, boolean> = {};

    // Helper function to detect if this is an image input
    function isImageInput(name: string, input: any): boolean {
        const imageName = name.toLowerCase();
        return imageName === 'image' || 
               imageName.includes('image') || 
               imageName === 'mask' ||
               (NodeInputSchema.isString(input) && 
                (fields[name]?.endsWith?.('.png') || 
                 fields[name]?.endsWith?.('.jpg') || 
                 fields[name]?.endsWith?.('.jpeg') || 
                 fields[name]?.endsWith?.('.webp')));
    }

    // Handle file input change with upload to ComfyUI server
    async function handleFileInput(name: string, event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) return;
        
        // Set uploading state
        uploadingFiles[name] = true;
        uploadingFiles = uploadingFiles;
        
        try {
            console.log(`Uploading ${file.name} to ComfyUI server...`);
            
            // Upload file to ComfyUI server
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch(`http://${$serverHost}/upload/image`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Upload successful:', result);
            
            // Update field with server response filename
            fields[name] = result.name;
            
        } catch (error) {
            console.error('Failed to upload image:', error);
            // Fallback to original filename (won't work for preview but preserves user input)
            fields[name] = file.name;
        } finally {
            // Clear uploading state
            uploadingFiles[name] = false;
            uploadingFiles = uploadingFiles;
        }
        
        // Trigger reactivity
        fields = fields;
    }

    // Generate preview URL for uploaded images
    function getImagePreviewUrl(filename: string): string {
        if (filename && (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.webp'))) {
            // Use dynamic server host and correct type parameter for uploaded images
            return `http://${$serverHost}/view?filename=${encodeURIComponent(filename)}&type=input`;
        }
        return '';
    }
</script>

<div class="grid grid-flow-row grid-cols-[1fr_4fr] gap-2">
    {#each Object.entries(schema) as [name, input] (name)}
        <Label class="text-left my-auto">{name.replaceAll("_", " ")}</Label>
        
        {#if isImageInput(name, input)}
            <!-- Enhanced Image Input with Preview -->
            <div class="space-y-2">
                <div class="flex gap-2">
                    <Input 
                        type="text" 
                        size="sm" 
                        bind:value={fields[name]} 
                        placeholder="Select an image file..."
                        class="flex-1"
                    />
                    <Button 
                        size="sm" 
                        color="alternative"
                        class="px-3"
                        disabled={uploadingFiles[name]}
                        on:click={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => handleFileInput(name, e);
                            input.click();
                        }}
                    >
                        <FolderOpenSolid class="w-4 h-4" />
                    </Button>
                </div>
                
                <!-- Upload Status -->
                {#if uploadingFiles[name]}
                    <div class="flex items-center gap-2 p-3 bg-blue-700 rounded-lg border border-blue-600">
                        <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span class="text-sm text-white">Uploading image...</span>
                    </div>
                {/if}
                
                <!-- Image Preview -->
                {#if uploadingFiles[name]}
                    <!-- Show loading state during upload -->
                {:else if fields[name] && (fields[name].endsWith?.('.png') || fields[name].endsWith?.('.jpg') || fields[name].endsWith?.('.jpeg') || fields[name].endsWith?.('.webp'))}}
                    <div class="relative group">
                        <img 
                            src={getImagePreviewUrl(fields[name])} 
                            alt="Preview of {fields[name]}"
                            class="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-600 bg-gray-700"
                            on:error={() => {
                                // Enhanced error logging for debugging
                                console.warn(`Failed to load image preview: ${fields[name]}`);
                                console.warn(`Attempted URL: ${getImagePreviewUrl(fields[name])}`);
                                console.warn(`Server host: ${$serverHost}`);
                            }}
                        />
                        <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span class="text-white text-sm font-medium truncate px-2">
                                {fields[name]}
                            </span>
                        </div>
                    </div>
                {:else if fields[name]}
                    <!-- Fallback for non-image files or when preview fails -->
                    <div class="flex items-center gap-2 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <ImageSolid class="w-6 h-6 text-gray-400" />
                        <span class="text-sm text-gray-300 truncate">{fields[name]}</span>
                    </div>
                {/if}
            </div>
            
        {:else if NodeInputSchema.isBool(input)}
            <Toggle size="small" bind:checked={fields[name]} />
        {:else if NodeInputSchema.isInt(input)}
            <Input
                type="number"
                step={input[1].step ?? 1}
                min={input[1].min}
                max={input[1].max}
                size="sm"
                bind:value={fields[name]}
            />
        {:else if NodeInputSchema.isFloat(input)}
            <Input
                type="number"
                step={input[1].step}
                min={input[1].min}
                max={input[1].max}
                size="sm"
                bind:value={fields[name]}
            />
        {:else if (NodeInputSchema.isString(input) && name === "prompt") || name == "positive"}
            <Textarea class="min-h-48" size="sm" bind:value={fields[name]} />
        {:else if NodeInputSchema.isString(input)}
            <Input type="text" size="sm" bind:value={fields[name]} />
        {:else if NodeInputSchema.isList(input)}
            <Select
                size="sm"
                items={input[0].map((name) => ({ value: name, name }))}
                bind:value={fields[name]}
            />
        {/if}
    {/each}
</div>

<style>
    /* Custom styles for image previews */
    img {
        transition: transform 0.2s ease;
    }
    
    img:hover {
        transform: scale(1.05);
    }
</style>