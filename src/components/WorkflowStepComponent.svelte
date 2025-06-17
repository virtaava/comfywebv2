<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { DeepReadonly } from "ts-essentials";

    import { Tooltip, Button } from "flowbite-svelte";
    import { ChevronDownOutline, ChevronRightOutline, TrashBinSolid } from "flowbite-svelte-icons";

    import type { NodeInputSchema } from "../lib/comfy";

    import WorkflowFormComponent from "./WorkflowFormComponent.svelte";

    export let header: string;
    export let fields: Record<string, any>;
    export let schema: DeepReadonly<Record<string, NodeInputSchema>>;
    export let tooltip: string | undefined = undefined;
    export let expanded = false;

    let containsFields = Object.keys(fields).length > 0;

    const dispatcher = createEventDispatcher<{ delete: void }>();

    // Node type configuration for professional appearance
    const NODE_TYPE_CONFIG = {
        // Model Loading
        'CheckpointLoaderSimple': { icon: '🎯', color: 'purple', category: 'Model', preview: (f: any) => f.ckpt_name || 'No model selected' },
        'LoraLoader': { icon: '🔗', color: 'purple', category: 'Model', preview: (f: any) => f.lora_name || 'No LoRA selected' },
        'VAELoader': { icon: '🎨', color: 'purple', category: 'Model', preview: (f: any) => f.vae_name || 'No VAE selected' },
        
        // Text Processing
        'CLIPTextEncode': { icon: '📝', color: 'green', category: 'Text', preview: (f: any) => f.text ? `"${f.text.substring(0, 30)}${f.text.length > 30 ? '...' : ''}"` : 'No text' },
        'CLIPTextEncodeSDXL': { icon: '📝', color: 'green', category: 'Text', preview: (f: any) => f.text ? `"${f.text.substring(0, 30)}${f.text.length > 30 ? '...' : ''}"` : 'No text' },
        
        // Sampling
        'KSampler': { icon: '⚡', color: 'blue', category: 'Sampling', preview: (f: any) => `Steps: ${f.steps || 20}, CFG: ${f.cfg || 7}, Seed: ${f.seed || 'random'}` },
        'KSamplerAdvanced': { icon: '⚡', color: 'blue', category: 'Sampling', preview: (f: any) => `Steps: ${f.steps || 20}, CFG: ${f.cfg || 7}` },
        
        // Image Processing
        'VAEDecode': { icon: '🖼️', color: 'orange', category: 'Image', preview: () => 'Decode latent to image' },
        'VAEEncode': { icon: '🖼️', color: 'orange', category: 'Image', preview: () => 'Encode image to latent' },
        'LoadImage': { icon: '📷', color: 'orange', category: 'Image', preview: (f: any) => f.image || 'No image selected' },
        'SaveImage': { icon: '💾', color: 'orange', category: 'Image', preview: (f: any) => f.filename_prefix || 'ComfyUI' },
        'EmptyLatentImage': { icon: '🆕', color: 'orange', category: 'Image', preview: (f: any) => `${f.width || 512}x${f.height || 512}, Batch: ${f.batch_size || 1}` },
        
        // Upscaling
        'UpscaleModelLoader': { icon: '🔍', color: 'teal', category: 'Upscale', preview: (f: any) => f.model_name || 'No upscale model' },
        'ImageUpscaleWithModel': { icon: '🔍', color: 'teal', category: 'Upscale', preview: () => 'Upscale image' },
        
        // Prompts
        'Prompt': { icon: '💭', color: 'green', category: 'Text', preview: (f: any) => f.positive ? `"${f.positive.substring(0, 40)}${f.positive.length > 40 ? '...' : ''}"` : 'Empty prompt' },
        
        // Default fallback
        'default': { icon: '⚙️', color: 'gray', category: 'Other', preview: () => 'Configure settings' }
    };

    // Get node configuration
    function getNodeConfig(nodeType: string) {
        return NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.default;
    }

    // Get color classes for node type
    function getColorClasses(color: string) {
        const colorMap = {
            purple: { 
                border: 'border-purple-500/30', 
                bg: 'from-purple-900/20 to-purple-800/10', 
                text: 'text-purple-300',
                accent: 'bg-purple-600/20'
            },
            blue: { 
                border: 'border-blue-500/30', 
                bg: 'from-blue-900/20 to-blue-800/10', 
                text: 'text-blue-300',
                accent: 'bg-blue-600/20'
            },
            green: { 
                border: 'border-green-500/30', 
                bg: 'from-green-900/20 to-green-800/10', 
                text: 'text-green-300',
                accent: 'bg-green-600/20'
            },
            orange: { 
                border: 'border-orange-500/30', 
                bg: 'from-orange-900/20 to-orange-800/10', 
                text: 'text-orange-300',
                accent: 'bg-orange-600/20'
            },
            teal: { 
                border: 'border-teal-500/30', 
                bg: 'from-teal-900/20 to-teal-800/10', 
                text: 'text-teal-300',
                accent: 'bg-teal-600/20'
            },
            gray: { 
                border: 'border-gray-500/30', 
                bg: 'from-gray-900/20 to-gray-800/10', 
                text: 'text-gray-300',
                accent: 'bg-gray-600/20'
            }
        };
        return colorMap[color] || colorMap.gray;
    }

    // Extract node type from header (remove " (missing)" suffix if present)
    $: nodeType = header.replace(' (missing)', '');
    $: nodeConfig = getNodeConfig(nodeType);
    $: colorClasses = getColorClasses(nodeConfig.color);
    $: isMissing = header.includes('(missing)');
    $: contentPreview = nodeConfig.preview(fields);

    // Handle click to toggle expansion
    function handleCardClick(event: MouseEvent) {
        // Don't toggle if clicking on action buttons
        if ((event.target as Element).closest('.action-button')) {
            return;
        }
        expanded = !expanded;
    }

    // Handle delete with event stopping
    function handleDelete(event: MouseEvent) {
        event.stopPropagation();
        dispatcher("delete");
    }
</script>

<!-- Professional Workflow Step Card -->
<div class="group">
    <!-- Main Card -->
    <div
        class="relative bg-gradient-to-r {colorClasses.bg} border-l-4 {colorClasses.border} 
               border-r border-t border-b border-gray-700/50 
               hover:border-gray-600/60 transition-all duration-200 
               shadow-lg hover:shadow-xl cursor-pointer"
        class:border-b-0={expanded && containsFields}
        class:border-red-500={isMissing}
        class:bg-red-900={isMissing}
        on:click={handleCardClick}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && handleCardClick(e)}
    >
        <!-- Card Content -->
        <div class="p-4 flex items-center gap-4">
            <!-- Node Icon -->
            <div class="flex-shrink-0">
                <div class="w-10 h-10 rounded-lg {colorClasses.accent} flex items-center justify-center text-xl shadow-md">
                    {nodeConfig.icon}
                </div>
            </div>

            <!-- Main Content -->
            <div class="flex-1 min-w-0">
                <!-- Header Row -->
                <div class="flex items-center gap-2 mb-1">
                    <!-- Node Type Name -->
                    <h3 class="font-semibold text-white text-sm truncate">
                        {nodeType}
                    </h3>
                    
                    <!-- Category Badge -->
                    <span class="px-2 py-0.5 text-xs font-medium rounded-full {colorClasses.accent} {colorClasses.text}">
                        {nodeConfig.category}
                    </span>
                    
                    <!-- Missing Badge -->
                    {#if isMissing}
                        <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-600/80 text-red-200">
                            Missing
                        </span>
                    {/if}
                </div>

                <!-- Content Preview -->
                <div class="text-sm text-gray-300 truncate">
                    {contentPreview}
                </div>
            </div>

            <!-- Action Area -->
            <div class="flex items-center gap-2 flex-shrink-0">
                <!-- Expand/Collapse Indicator -->
                {#if containsFields}
                    <div class="text-gray-400 transition-transform duration-200" class:rotate-90={expanded}>
                        {#if expanded}
                            <ChevronDownOutline class="w-4 h-4" />
                        {:else}
                            <ChevronRightOutline class="w-4 h-4" />
                        {/if}
                    </div>
                {/if}

                <!-- Info Button -->
                <button 
                    class="action-button p-1.5 rounded-md hover:bg-gray-700/50 transition-colors duration-200 text-gray-400 hover:text-gray-300"
                    on:click={(e) => e.stopPropagation()}
                >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                    <Tooltip>{tooltip || nodeType}</Tooltip>
                </button>

                <!-- Delete Button -->
                <button
                    class="action-button p-1.5 rounded-md hover:bg-red-600/20 transition-colors duration-200 text-gray-400 hover:text-red-400"
                    on:click={handleDelete}
                >
                    <TrashBinSolid class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Configuration Indicator -->
        {#if !isMissing}
            <div class="absolute bottom-1 right-1">
                {#if Object.keys(fields).length > 0}
                    <div class="w-2 h-2 rounded-full bg-green-500/60"></div>
                {:else}
                    <div class="w-2 h-2 rounded-full bg-yellow-500/60"></div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Expanded Content -->
    {#if expanded && containsFields}
        <div class="border-l-4 {colorClasses.border} border-r border-b border-gray-700/50 bg-gray-800/30">
            <div class="p-4 pt-0">
                <WorkflowFormComponent {fields} {schema} />
            </div>
        </div>
    {/if}
</div>
