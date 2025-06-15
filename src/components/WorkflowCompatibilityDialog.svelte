<!--
  ComfyWeb v2 - Workflow Compatibility Dialog
  
  Professional dialog for handling UE (Use Everywhere) virtual links compatibility issues.
  Provides guided solutions with clear explanations and user choice.
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Modal, Button, Alert, Badge, Accordion, AccordionItem, Spinner } from 'flowbite-svelte';
  import { InfoCircleSolid, ExclamationCircleSolid, CheckCircleSolid, LinkOutline } from 'flowbite-svelte-icons';
  import type { UEAnalysisResult, UENodeInfo } from '../lib/ue-detection';
  import type { ConversionResult } from '../lib/ue-converter';

  // Props
  export let open = false;
  export let ueAnalysis: UEAnalysisResult;
  export let isConverting = false;
  export let conversionResult: ConversionResult | null = null;
  export let ueConversionResult: ConversionResult | null = null;



  // Event dispatcher
  const dispatch = createEventDispatcher<{
    convert: void;
    strip: void;
    loadAnyway: void;
    cancel: void;
    close: void;
  }>();

  // Reactive values
  $: nodeCount = ueAnalysis?.ueNodes?.length || 0;
  $: connectionCount = ueAnalysis?.virtualConnections || 0;
  $: hasRegexNodes = ueAnalysis?.ueNodes?.some(node => node.regexRules) || false;
  $: complexityLevel = getComplexityLevel(ueAnalysis);
  
  function getComplexityLevel(analysis: UEAnalysisResult): 'simple' | 'moderate' | 'complex' {
    if (!analysis?.hasUENodes) return 'simple';
    
    const regexCount = analysis.ueNodes.filter(node => node.regexRules).length;
    const connectionCount = analysis.virtualConnections;
    
    if (regexCount > 2 || connectionCount > 10) return 'complex';
    if (regexCount > 0 || connectionCount > 5) return 'moderate';
    return 'simple';
  }

  function getNodeTypeIcon(nodeType: string): string {
    if (nodeType.includes('Seed')) return '🌱';
    if (nodeType.includes('Prompts')) return '💬';
    if (nodeType.includes('3') || nodeType.includes('Triplet')) return '3️⃣';
    if (nodeType.includes('?') || nodeType.includes('Somewhere')) return '🎯';
    return '🔗';
  }

  function getNodeTypeDescription(nodeType: string): string {
    switch (nodeType) {
      case 'SeedEverywhere':
      case 'Seed Everywhere':
        return 'Broadcasts seed values to unconnected seed inputs';
      case 'AnythingEverywhere':
      case 'Anything Everywhere':
        return 'Broadcasts any data type to matching unconnected inputs';
      case 'AnythingEverywherePrompts':
      case 'Prompts Everywhere':
        return 'Broadcasts positive and negative prompts to matching inputs';
      case 'AnythingEverywhereTriplet':
      case 'Anything Everywhere3':
        return 'Broadcasts up to 3 different data types simultaneously';
      case 'AnythingSomewhere':
      case 'Anything Everywhere?':
        return 'Broadcasts data using regex pattern matching for precise targeting';
      case 'SimpleString':
        return 'Helper node for providing string values to UE nodes';
      default:
        return 'Use Everywhere virtual connection node';
    }
  }

  function handleConvert() {
    dispatch('convert');
  }

  function handleStrip() {
    dispatch('strip');
  }

  function handleLoadAnyway() {
    dispatch('loadAnyway');
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function handleClose() {
    dispatch('close');
  }

</script>

<Modal bind:open title="🔗 Workflow Compatibility Issues Detected" size="lg" class="w-full max-w-4xl">
  <div class="space-y-6">
    
    <!-- Main Alert -->
    <Alert color="blue" class="border-l-4 border-blue-500">
      <InfoCircleSolid slot="icon" class="w-5 h-5" />
      <span class="font-medium">Use Everywhere Virtual Links Detected</span>
      <p class="mt-2 text-sm">
        This workflow contains <strong>{nodeCount} UE node{nodeCount > 1 ? 's' : ''}</strong> 
        with virtual connections that need conversion for backend compatibility.
      </p>
    </Alert>

    <!-- Analysis Summary -->
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <LinkOutline class="w-5 h-5 text-blue-400" />
        Analysis Summary
      </h3>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-400">{nodeCount}</div>
          <div class="text-sm text-gray-400">UE Nodes</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-400">{connectionCount}</div>
          <div class="text-sm text-gray-400">Virtual Links</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-yellow-400">{ueAnalysis?.ueNodeTypes?.length || 0}</div>
          <div class="text-sm text-gray-400">Node Types</div>
        </div>
        <div class="text-center">
          <Badge color={complexityLevel === 'simple' ? 'green' : complexityLevel === 'moderate' ? 'yellow' : 'red'} class="text-sm">
            {complexityLevel.charAt(0).toUpperCase() + complexityLevel.slice(1)}
          </Badge>
        </div>
      </div>

      {#if ueAnalysis?.compatibilityIssues?.length > 0}
        <Alert color="yellow" class="mb-4">
          <ExclamationCircleSolid slot="icon" class="w-4 h-4" />
          <span class="font-medium">Compatibility Notes:</span>
          <ul class="mt-2 list-disc list-inside text-sm">
            {#each ueAnalysis.compatibilityIssues as issue}
              <li>{issue}</li>
            {/each}
          </ul>
        </Alert>
      {/if}
    </div>

    <!-- UE Nodes Details -->
    <Accordion flush>
      <AccordionItem>
        <span slot="header" class="text-white font-medium">
          📋 UE Nodes Details ({nodeCount} nodes)
        </span>
        <div class="space-y-3">
          {#each ueAnalysis?.ueNodes || [] as ueNode}
            <div class="flex items-start gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div class="text-2xl">{getNodeTypeIcon(ueNode.type)}</div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-white">{ueNode.type}</span>
                  {#if ueNode.title}
                    <Badge color="dark" class="text-xs">Title: {ueNode.title}</Badge>
                  {/if}
                  <Badge color={ueNode.hasConnections ? 'green' : 'gray'} class="text-xs">
                    {ueNode.hasConnections ? 'Connected' : 'Unconnected'}
                  </Badge>
                </div>
                <p class="text-sm text-gray-400 mb-2">
                  {getNodeTypeDescription(ueNode.type)}
                </p>
                {#if ueNode.regexRules}
                  <div class="text-xs text-gray-500">
                    <strong>Regex Rules:</strong>
                    Title: <code class="bg-gray-700 px-1 rounded">{ueNode.regexRules.title}</code>,
                    Input: <code class="bg-gray-700 px-1 rounded">{ueNode.regexRules.input}</code>,
                    Group: <code class="bg-gray-700 px-1 rounded">{ueNode.regexRules.group}</code>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </AccordionItem>
    </Accordion>

    <!-- Conversion Result -->
    {#if conversionResult}
      <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          {#if conversionResult.success}
            <CheckCircleSolid class="w-5 h-5 text-green-400" />
            Conversion Successful
          {:else}
            <ExclamationCircleSolid class="w-5 h-5 text-red-400" />
            Conversion Failed
          {/if}
        </h3>
        
        {#if conversionResult.success}
          <Alert color="green" class="mb-4">
            <span class="font-medium">Conversion completed successfully!</span>
            <ul class="mt-2 list-disc list-inside text-sm">
              <li>Added {conversionResult.addedLinks} real links</li>
              <li>Removed {conversionResult.removedNodes.length} UE nodes</li>
              <li>Made {conversionResult.changes.length} total changes</li>
            </ul>
          </Alert>
          
          {#if conversionResult.changes.length > 0}
            <Accordion flush>
              <AccordionItem>
                <span slot="header" class="text-white font-medium">
                  📝 Conversion Details ({conversionResult.changes.length} changes)
                </span>
                <div class="space-y-1">
                  {#each conversionResult.changes as change}
                    <div class="text-sm text-gray-300 flex items-center gap-2">
                      <CheckCircleSolid class="w-3 h-3 text-green-400 flex-shrink-0" />
                      {change}
                    </div>
                  {/each}
                </div>
              </AccordionItem>
            </Accordion>
          {/if}
          
          {#if conversionResult.warnings.length > 0}
            <Alert color="yellow" class="mt-4">
              <span class="font-medium">Warnings:</span>
              <ul class="mt-2 list-disc list-inside text-sm">
                {#each conversionResult.warnings as warning}
                  <li>{warning}</li>
                {/each}
              </ul>
            </Alert>
          {/if}
        {:else}
          <Alert color="red">
            <span class="font-medium">Conversion failed:</span>
            <p class="mt-2 text-sm">{conversionResult.error}</p>
          </Alert>
        {/if}
      </div>
    {/if}

    <!-- Solution Options -->
    {#if !conversionResult || !conversionResult.success}
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-white mb-3">🛠️ Solution Options</h3>
        
        <!-- Convert to Real Links (Recommended) -->
        <button 
          class="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg border border-blue-500 text-left transition-colors"
          disabled={isConverting}
          on:click={handleConvert}
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">✨</div>
            <div class="flex-1">
              <div class="font-medium text-white flex items-center gap-2">
                Convert to Real Links
                <Badge color="green" class="text-xs">Recommended</Badge>
                {#if isConverting}
                  <Spinner class="w-4 h-4" />
                {/if}
              </div>
              <p class="text-sm text-blue-100 mt-1">
                Transform virtual connections to actual node links for backend compatibility.
                This preserves all functionality while making the workflow compatible with ComfyUI's backend.
              </p>
              <div class="text-xs text-blue-200 mt-2">
                ✅ Maintains all connections • ✅ Backend compatible • ✅ No data loss
              </div>
            </div>
          </div>
        </button>
        
        <!-- Remove UE System -->
        <button 
          class="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 text-left transition-colors"
          disabled={isConverting}
          on:click={handleStrip}
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">🧹</div>
            <div class="flex-1">
              <div class="font-medium text-white">Remove UE System</div>
              <p class="text-sm text-gray-300 mt-1">
                Strip UE nodes and create direct connections between nodes.
                This creates a cleaner workflow but may lose some advanced UE functionality.
              </p>
              <div class="text-xs text-gray-400 mt-2">
                ⚠️ May lose regex patterns • ✅ Simpler workflow • ✅ Backend compatible
              </div>
            </div>
          </div>
        </button>
        
        <!-- Load Anyway -->
        <button 
          class="w-full p-4 bg-yellow-700 hover:bg-yellow-600 rounded-lg border border-yellow-600 text-left transition-colors"
          disabled={isConverting}
          on:click={handleLoadAnyway}
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">⚠️</div>
            <div class="flex-1">
              <div class="font-medium text-white">Load Anyway</div>
              <p class="text-sm text-yellow-100 mt-1">
                Attempt to load the workflow as-is without conversion.
                This may result in "missing nodes" errors or workflow failures.
              </p>
              <div class="text-xs text-yellow-200 mt-2">
                ❌ May fail to load • ❌ Backend incompatible • ⚠️ Use for testing only
              </div>
            </div>
          </div>
        </button>
      </div>
      
      <!-- Educational Info -->
      <Alert color="blue" class="border-l-4 border-blue-500">
        <InfoCircleSolid slot="icon" class="w-5 h-5" />
        <span class="font-medium">About Use Everywhere (UE) Nodes</span>
        <p class="mt-2 text-sm">
          Use Everywhere nodes create virtual connections that work in the ComfyUI frontend 
          but need conversion for backend/API compatibility. 
          <a href="https://github.com/chrisgoringe/cg-use-everywhere" target="_blank" class="text-blue-400 hover:text-blue-300 underline">
            Learn more about UE nodes
          </a>
        </p>
      </Alert>
    {/if}
  </div>

  <!-- Modal Footer -->
  <svelte:fragment slot="footer">
    <div class="flex items-center justify-between w-full">
      <div class="text-sm text-gray-400">
        {#if conversionResult?.success}
          Workflow ready to load with real links
        {:else}
          Choose an option above to proceed
        {/if}
      </div>
      <div class="flex gap-2">
        {#if conversionResult?.success}
          <Button color="green" on:click={handleClose} class="px-6">
            Continue with Converted Workflow
          </Button>
        {:else}
          <Button color="alternative" on:click={handleCancel} disabled={isConverting}>
            Cancel
          </Button>
        {/if}
      </div>
    </div>
  </svelte:fragment>
</Modal>
