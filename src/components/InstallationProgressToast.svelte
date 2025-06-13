<script lang="ts">
  import { Toast, Spinner } from 'flowbite-svelte';
  import { CheckCircleSolid, ExclamationCircleSolid } from 'flowbite-svelte-icons';
  
  export let show = false;
  export let status: 'installing' | 'success' | 'error' = 'installing';
  export let message = '';
  export let nodeCount = 0;

  let toastStatus = 'none';
  
  $: {
    if (show) {
      toastStatus = status === 'error' ? 'red' : status === 'success' ? 'green' : 'blue';
    } else {
      toastStatus = 'none';
    }
  }

  function getIcon() {
    switch (status) {
      case 'installing':
        return { component: Spinner, class: 'text-blue-500' };
      case 'success':
        return { component: CheckCircleSolid, class: 'text-green-500' };
      case 'error':
        return { component: ExclamationCircleSolid, class: 'text-red-500' };
    }
  }

  $: icon = getIcon();
</script>

{#if show}
  <Toast color={toastStatus} position="top-right" class="mb-4">
    <div class="flex items-center gap-3">
      <svelte:component this={icon.component} class="w-5 h-5 {icon.class}" size="16" />
      <div>
        <div class="font-medium text-white">
          {#if status === 'installing'}
            Installing Custom Nodes
          {:else if status === 'success'}
            Installation Complete
          {:else}
            Installation Failed
          {/if}
        </div>
        {#if message}
          <div class="text-sm text-gray-300 mt-1">{message}</div>
        {/if}
        {#if nodeCount > 0}
          <div class="text-xs text-gray-400 mt-1">
            {nodeCount} node{nodeCount === 1 ? '' : 's'}
          </div>
        {/if}
      </div>
    </div>
  </Toast>
{/if}
