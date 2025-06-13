<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Modal, Badge, Spinner } from 'flowbite-svelte';
  import { CheckCircleSolid, ExclamationCircleSolid, ClockSolid } from 'flowbite-svelte-icons';
  import type { MissingNodeInfo } from '../lib/missing-nodes';

  export let isOpen = false;
  export let missingNodes: MissingNodeInfo[] = [];
  export let serverHost: string;

  const dispatch = createEventDispatcher<{
    install: MissingNodeInfo[];
    skip: void;
    close: void;
  }>();

  interface InstallationStatus {
    status: 'pending' | 'installing' | 'success' | 'error';
    message?: string;
  }

  let installationStatuses: Record<string, InstallationStatus> = {};
  let installing = false;
  let installationComplete = false;
  let needsRestart = false;

  $: installableNodes = missingNodes.filter(node => node.isInstallable);
  $: uninstallableNodes = missingNodes.filter(node => !node.isInstallable);

  // Initialize installation statuses
  $: {
    if (missingNodes.length > 0) {
      installationStatuses = {};
      for (const node of missingNodes) {
        if (node.isInstallable) {
          installationStatuses[node.nodeType] = { status: 'pending' };
        }
      }
    }
  }

  async function handleInstallSelected() {
    if (installableNodes.length === 0) return;

    installing = true;
    needsRestart = false;

    for (const node of installableNodes) {
      installationStatuses[node.nodeType] = { status: 'installing' };
      installationStatuses = { ...installationStatuses };

      try {
        const response = await fetch(`http://${serverHost}/comfyweb/install-node`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_name: node.extensionName,
            git_url: node.gitUrl
          })
        });

        const result = await response.json();

        if (result.status === 'success') {
          installationStatuses[node.nodeType] = { 
            status: 'success',
            message: 'Successfully installed'
          };
          needsRestart = true;
        } else {
          installationStatuses[node.nodeType] = { 
            status: 'error',
            message: result.message || 'Installation failed'
          };
        }
      } catch (error) {
        installationStatuses[node.nodeType] = { 
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      installationStatuses = { ...installationStatuses };
    }

    installing = false;
    installationComplete = true;
  }

  async function handleRestart() {
    try {
      await fetch(`http://${serverHost}/comfyweb/restart-comfyui`, {
        method: 'POST'
      });
      dispatch('close');
    } catch (error) {
      console.error('Failed to restart ComfyUI:', error);
    }
  }

  function getStatusIcon(status: InstallationStatus['status']) {
    switch (status) {
      case 'pending':
        return { component: ClockSolid, class: 'text-gray-400' };
      case 'installing':
        return { component: Spinner, class: 'text-blue-500' };
      case 'success':
        return { component: CheckCircleSolid, class: 'text-green-500' };
      case 'error':
        return { component: ExclamationCircleSolid, class: 'text-red-500' };
    }
  }

  function getStatusBadge(node: MissingNodeInfo) {
    if (!node.isInstallable) {
      return { color: 'red', text: 'Not Available' };
    }

    const status = installationStatuses[node.nodeType];
    if (!status) return { color: 'gray', text: 'Ready' };

    switch (status.status) {
      case 'pending':
        return { color: 'gray', text: 'Ready' };
      case 'installing':
        return { color: 'blue', text: 'Installing...' };
      case 'success':
        return { color: 'green', text: 'Installed' };
      case 'error':
        return { color: 'red', text: 'Failed' };
    }
  }
</script>

<Modal bind:open={isOpen} size="lg" class="dark">
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h3 class="text-xl font-semibold text-white mb-2">Missing Nodes Detected</h3>
      <p class="text-gray-400 text-sm">
        Your workflow requires custom nodes that aren't currently installed.
      </p>
    </div>

    <!-- Installable Nodes -->
    {#if installableNodes.length > 0}
      <div class="space-y-3">
        <h4 class="text-lg font-medium text-white flex items-center gap-2">
          <CheckCircleSolid class="w-5 h-5 text-green-500" />
          Available for Installation ({installableNodes.length})
        </h4>
        
        <div class="space-y-2 max-h-64 overflow-y-auto">
          {#each installableNodes as node}
            {@const badge = getStatusBadge(node)}
            {@const statusIcon = getStatusIcon(installationStatuses[node.nodeType]?.status || 'pending')}
            
            <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-white truncate">{node.nodeType}</span>
                    <Badge color={badge.color} class="text-xs">{badge.text}</Badge>
                  </div>
                  
                  {#if node.extensionName}
                    <p class="text-sm text-gray-400 mb-1">
                      Extension: <span class="font-mono">{node.extensionName}</span>
                    </p>
                  {/if}
                  
                  {#if node.description}
                    <p class="text-sm text-gray-300 line-clamp-2">{node.description}</p>
                  {/if}
                  
                  {#if node.author}
                    <p class="text-xs text-gray-500 mt-1">by {node.author}</p>
                  {/if}

                  {#if installationStatuses[node.nodeType]?.message}
                    <p class="text-sm mt-2 {installationStatuses[node.nodeType].status === 'error' ? 'text-red-400' : 'text-green-400'}">
                      {installationStatuses[node.nodeType].message}
                    </p>
                  {/if}
                </div>
                
                <div class="flex-shrink-0 ml-4">
                  <svelte:component 
                    this={statusIcon.component} 
                    class="w-5 h-5 {statusIcon.class}"
                    size="16"
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Uninstallable Nodes -->
    {#if uninstallableNodes.length > 0}
      <div class="space-y-3">
        <h4 class="text-lg font-medium text-white flex items-center gap-2">
          <ExclamationCircleSolid class="w-5 h-5 text-red-500" />
          Not Available ({uninstallableNodes.length})
        </h4>
        
        <div class="space-y-2 max-h-32 overflow-y-auto">
          {#each uninstallableNodes as node}
            <div class="bg-red-900/20 rounded-lg p-3 border border-red-700/50">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-medium text-white">{node.nodeType}</span>
                  {#if node.reason}
                    <p class="text-sm text-red-400 mt-1">{node.reason}</p>
                  {/if}
                </div>
                <ExclamationCircleSolid class="w-4 h-4 text-red-500 flex-shrink-0" />
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Restart Notice -->
    {#if needsRestart && installationComplete}
      <div class="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircleSolid class="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 class="font-medium text-white">Installation Complete</h4>
            <p class="text-sm text-blue-300 mt-1">
              ComfyUI needs to restart to load the new nodes. Your workflow will be preserved.
            </p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex justify-between items-center pt-4 border-t border-gray-700">
      <div class="text-sm text-gray-400">
        {#if installableNodes.length > 0}
          {installableNodes.length} node{installableNodes.length === 1 ? '' : 's'} ready to install
        {:else}
          No installable nodes found
        {/if}
      </div>
      
      <div class="flex gap-3">
        {#if needsRestart && installationComplete}
          <Button color="blue" on:click={handleRestart}>
            Restart ComfyUI
          </Button>
          <Button color="alternative" on:click={() => dispatch('close')}>
            Continue Without Restart
          </Button>
        {:else if !installing && !installationComplete}
          <Button 
            color="alternative" 
            on:click={() => dispatch('skip')}
          >
            Skip Installation
          </Button>
          <Button 
            color="purple" 
            on:click={handleInstallSelected}
            disabled={installableNodes.length === 0}
          >
            {#if installableNodes.length === 0}
              No Nodes Available
            {:else}
              Install {installableNodes.length} Node{installableNodes.length === 1 ? '' : 's'}
            {/if}
          </Button>
        {:else if installing}
          <Button color="blue" disabled>
            <Spinner class="mr-3" size="4" color="white" />
            Installing Nodes...
          </Button>
        {:else}
          <Button color="green" on:click={() => dispatch('close')}>
            Close
          </Button>
        {/if}
      </div>
    </div>
  </div>
</Modal>

<style>
  :global(.line-clamp-2) {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
