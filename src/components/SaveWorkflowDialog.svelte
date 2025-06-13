<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Modal, Input, Label, Textarea, Badge } from 'flowbite-svelte';
  import { SaveSolid, CloseSolid } from 'flowbite-svelte-icons';
  import type { WorkflowStep } from '../lib/workflow';
  import { workflowStorage } from '../lib/workflow-storage';

  export let isOpen = false;
  export let workflowSteps: WorkflowStep[] = [];

  const dispatch = createEventDispatcher<{
    saved: { id: string; name: string };
    close: void;
  }>();

  let workflowName = '';
  let workflowDescription = '';
  let saving = false;
  let error = '';

  // Auto-generate name based on current date/time
  $: if (isOpen && !workflowName) {
    const now = new Date();
    workflowName = `Workflow ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  async function handleSave() {
    if (!workflowName.trim()) {
      error = 'Workflow name is required';
      return;
    }

    if (workflowSteps.length === 0) {
      error = 'Cannot save empty workflow';
      return;
    }

    saving = true;
    error = '';

    try {
      const id = await workflowStorage.saveWorkflow(
        workflowName.trim(),
        workflowSteps,
        workflowDescription.trim() || undefined
      );

      dispatch('saved', { id, name: workflowName.trim() });
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save workflow';
    } finally {
      saving = false;
    }
  }

  function handleClose() {
    workflowName = '';
    workflowDescription = '';
    error = '';
    saving = false;
    isOpen = false;
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      handleSave();
    }
  }

  $: stepCount = workflowSteps.length;
  $: nodeTypes = workflowSteps
    .filter(step => step.type === 'Node')
    .map(step => (step as any).nodeType)
    .slice(0, 5); // Show first 5 node types
</script>

<Modal bind:open={isOpen} size="lg" class="dark" on:close={handleClose}>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h3 class="text-xl font-semibold text-white mb-2">Save Workflow</h3>
      <p class="text-gray-400 text-sm">
        Save this workflow to your local ComfyWeb library for easy access later.
      </p>
    </div>

    <!-- Workflow Info -->
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-300">Workflow Info</span>
        <Badge color="blue" class="text-xs">{stepCount} step{stepCount === 1 ? '' : 's'}</Badge>
      </div>
      
      {#if nodeTypes.length > 0}
        <div class="flex flex-wrap gap-1">
          {#each nodeTypes as nodeType}
            <Badge color="gray" class="text-xs">{nodeType}</Badge>
          {/each}
          {#if workflowSteps.length > 5}
            <Badge color="gray" class="text-xs">+{workflowSteps.length - 5} more</Badge>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Form -->
    <div class="space-y-4">
      <!-- Workflow Name -->
      <div>
        <Label for="workflow-name" class="text-white mb-2">Workflow Name *</Label>
        <Input
          id="workflow-name"
          bind:value={workflowName}
          placeholder="Enter workflow name..."
          class="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          on:keydown={handleKeydown}
          disabled={saving}
        />
      </div>

      <!-- Description -->
      <div>
        <Label for="workflow-description" class="text-white mb-2">Description (Optional)</Label>
        <Textarea
          id="workflow-description"
          bind:value={workflowDescription}
          placeholder="Describe what this workflow does..."
          rows="3"
          class="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          disabled={saving}
        />
      </div>
    </div>

    <!-- Error Message -->
    {#if error}
      <div class="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
        <p class="text-red-400 text-sm">{error}</p>
      </div>
    {/if}

    <!-- Storage Info -->
    <div class="text-xs text-gray-500">
      <p>Workflows are saved locally in your browser and will persist across sessions.</p>
    </div>

    <!-- Actions -->
    <div class="flex justify-between items-center pt-4 border-t border-gray-700">
      <div class="text-sm text-gray-400">
        Tip: Press Ctrl+Enter to save quickly
      </div>
      
      <div class="flex gap-3">
        <Button 
          color="alternative" 
          on:click={handleClose}
          disabled={saving}
        >
          <CloseSolid class="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          color="purple" 
          on:click={handleSave}
          disabled={saving || !workflowName.trim()}
        >
          {#if saving}
            <div class="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Saving...
          {:else}
            <SaveSolid class="w-4 h-4 mr-2" />
            Save Workflow
          {/if}
        </Button>
      </div>
    </div>
  </div>
</Modal>
