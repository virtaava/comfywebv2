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
  let hasUserEditedName = false; // Track if user has manually edited the name

  // Auto-generate name only when dialog first opens and field is empty
  $: if (isOpen && !hasUserEditedName && workflowName === '') {
    const now = new Date();
    workflowName = `Workflow ${now.toLocaleDateString()}`;
    console.log('📝 [Save Dialog] Auto-generated name:', workflowName);
  }

  // Track when user manually edits the name
  function handleNameInput(event: Event) {
    hasUserEditedName = true;
    workflowName = (event.target as HTMLInputElement).value;
    console.log('📝 [Save Dialog] User edited name to:', workflowName);
  }

  async function handleSave() {
    console.log('💾 [Save Dialog] Attempting to save workflow:', workflowName.trim());
    
    if (!workflowName.trim()) {
      error = 'Workflow name is required';
      console.log('🚨 [Save Dialog] Save failed: name required');
      return;
    }

    if (workflowSteps.length === 0) {
      error = 'Cannot save empty workflow';
      console.log('🚨 [Save Dialog] Save failed: no workflow steps');
      return;
    }

    saving = true;
    error = '';

    try {
      console.log('💾 [Save Dialog] Calling workflowStorage.saveWorkflow...');
      const id = await workflowStorage.saveWorkflow(
        workflowName.trim(),
        workflowSteps
      );

      console.log('✅ [Save Dialog] Workflow saved successfully with ID:', id);
      dispatch('saved', { id, name: workflowName.trim() });
      handleClose();
    } catch (err) {
      console.error('🚨 [Save Dialog] Save error:', err);
      error = err instanceof Error ? err.message : 'Failed to save workflow';
    } finally {
      saving = false;
    }
  }

  function handleClose() {
    workflowName = '';
    hasUserEditedName = false; // Reset edit tracking
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
        value={workflowName}
        on:input={handleNameInput}
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
