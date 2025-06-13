<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Modal, Input, Label } from 'flowbite-svelte';
  import type { WorkflowStep } from '../lib/workflow';
  import { workflowStorage } from '../lib/workflow-storage';

  export let isOpen = false;
  export let workflowSteps: WorkflowStep[] = [];

  const dispatch = createEventDispatcher<{
    saved: { id: string; name: string };
    close: void;
  }>();

  let workflowName = '';
  let saving = false;
  let error = '';

  // Auto-generate name based on current date/time
  $: if (isOpen && !workflowName) {
    const now = new Date();
    workflowName = `Workflow ${now.toLocaleDateString()}`;
  }

  async function handleSave() {
    if (!workflowName.trim()) {
      error = 'Workflow name is required';
      return;
    }

    saving = true;
    error = '';

    try {
      const id = await workflowStorage.saveWorkflow(
        workflowName.trim(),
        workflowSteps
      );

      dispatch('saved', { id, name: workflowName.trim() });
      handleClose();
    } catch (err) {
      error = 'Failed to save workflow';
    } finally {
      saving = false;
    }
  }

  function handleClose() {
    workflowName = '';
    error = '';
    saving = false;
    isOpen = false;
    dispatch('close');
  }
</script>

<Modal bind:open={isOpen} size="lg" class="dark" on:close={handleClose}>
  <div class="space-y-6">
    <div class="text-center">
      <h3 class="text-xl font-semibold text-white mb-2">Save Workflow</h3>
    </div>

    <div>
      <Label for="workflow-name" class="text-white mb-2">Workflow Name</Label>
      <Input
        id="workflow-name"
        bind:value={workflowName}
        placeholder="Enter workflow name..."
        disabled={saving}
      />
    </div>

    {#if error}
      <div class="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
        <p class="text-red-400 text-sm">{error}</p>
      </div>
    {/if}

    <div class="flex gap-3 justify-end">
      <Button color="alternative" on:click={handleClose} disabled={saving}>
        Cancel
      </Button>
      <Button color="purple" on:click={handleSave} disabled={saving || !workflowName.trim()}>
        {saving ? 'Saving...' : 'Save Workflow'}
      </Button>
    </div>
  </div>
</Modal>
