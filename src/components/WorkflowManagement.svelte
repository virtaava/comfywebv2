<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Modal, Input, Label, Badge, Dropdown, DropdownItem, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { TrashBinSolid, EditSolid, PlaySolid, DotsVerticalOutline, ClockSolid, LayersSolid, DownloadSolid } from 'flowbite-svelte-icons';
  import type { WorkflowMetadata } from '../lib/workflow-storage';
  import { workflowStorage } from '../lib/workflow-storage';

  export let isOpen = false;
  export let workflows: WorkflowMetadata[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    workflowsChanged: void;
    loadWorkflow: { id: string };
  }>();

  let selectedWorkflows = new Set<string>();
  let editingWorkflow: string | null = null;
  let editName = '';
  let showDeleteConfirm = false;
  let workflowToDelete: string | null = null;
  let searchQuery = '';
  let sortBy: 'name' | 'date' | 'steps' = 'date';
  let sortOrder: 'asc' | 'desc' = 'desc';

  // Filtered and sorted workflows
  $: filteredWorkflows = workflows
    .filter(workflow => 
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.dateModified).getTime() - new Date(b.dateModified).getTime();
          break;
        case 'steps':
          comparison = a.stepCount - b.stepCount;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  function toggleWorkflowSelection(id: string) {
    if (selectedWorkflows.has(id)) {
      selectedWorkflows.delete(id);
    } else {
      selectedWorkflows.add(id);
    }
    selectedWorkflows = selectedWorkflows; // Trigger reactivity
  }

  function selectAll() {
    selectedWorkflows = new Set(filteredWorkflows.map(w => w.id));
  }

  function clearSelection() {
    selectedWorkflows = new Set();
  }

  function startEdit(workflow: WorkflowMetadata) {
    editingWorkflow = workflow.id;
    editName = workflow.name;
  }

  function cancelEdit() {
    editingWorkflow = null;
    editName = '';
  }

  async function saveEdit() {
    if (!editingWorkflow || !editName.trim()) return;

    try {
      const success = await workflowStorage.renameWorkflow(editingWorkflow, editName.trim());
      if (success) {
        console.log('✅ [Workflow Management] Renamed workflow:', editingWorkflow, 'to:', editName.trim());
        dispatch('workflowsChanged');
        cancelEdit();
      } else {
        console.error('❌ [Workflow Management] Failed to rename workflow');
      }
    } catch (error) {
      console.error('❌ [Workflow Management] Error renaming workflow:', error);
    }
  }

  function confirmDelete(id: string) {
    workflowToDelete = id;
    showDeleteConfirm = true;
  }

  async function deleteWorkflow() {
    if (!workflowToDelete) return;

    try {
      const success = await workflowStorage.deleteWorkflow(workflowToDelete);
      if (success) {
        console.log('✅ [Workflow Management] Deleted workflow:', workflowToDelete);
        selectedWorkflows.delete(workflowToDelete);
        selectedWorkflows = selectedWorkflows;
        dispatch('workflowsChanged');
      } else {
        console.error('❌ [Workflow Management] Failed to delete workflow');
      }
    } catch (error) {
      console.error('❌ [Workflow Management] Error deleting workflow:', error);
    }

    showDeleteConfirm = false;
    workflowToDelete = null;
  }

  async function deleteSelected() {
    if (selectedWorkflows.size === 0) return;

    try {
      for (const id of selectedWorkflows) {
        await workflowStorage.deleteWorkflow(id);
        console.log('✅ [Workflow Management] Deleted workflow:', id);
      }
      
      clearSelection();
      dispatch('workflowsChanged');
    } catch (error) {
      console.error('❌ [Workflow Management] Error deleting workflows:', error);
    }
  }

  async function exportWorkflow(id: string) {
    try {
      const workflow = workflowStorage.loadWorkflow(id);
      if (workflow) {
        const dataStr = JSON.stringify(workflow, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        link.click();
        
        console.log('✅ [Workflow Management] Exported workflow:', workflow.name);
      }
    } catch (error) {
      console.error('❌ [Workflow Management] Error exporting workflow:', error);
    }
  }

  function loadWorkflow(id: string) {
    dispatch('loadWorkflow', { id });
    handleClose();
  }

  function handleClose() {
    clearSelection();
    cancelEdit();
    isOpen = false;
    dispatch('close');
  }

  function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function setSortBy(newSortBy: typeof sortBy) {
    if (sortBy === newSortBy) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = newSortBy;
      sortOrder = 'desc';
    }
  }
</script>

<Modal bind:open={isOpen} size="xl" class="dark" on:close={handleClose}>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-xl font-semibold text-white">Manage Workflows</h3>
        <p class="text-gray-400 text-sm mt-1">{workflows.length} workflow{workflows.length === 1 ? '' : 's'} saved</p>
      </div>
      
      {#if selectedWorkflows.size > 0}
        <div class="flex gap-2">
          <Badge color="blue" class="text-sm">{selectedWorkflows.size} selected</Badge>
          <Button color="red" size="sm" on:click={deleteSelected}>
            <TrashBinSolid class="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      {/if}
    </div>

    <!-- Search and Controls -->
    <div class="flex gap-4 items-center">
      <div class="flex-1">
        <Input
          bind:value={searchQuery}
          placeholder="Search workflows..."
          class="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>
      
      <div class="flex gap-2">
        <Button color="alternative" size="sm" on:click={selectAll}>Select All</Button>
        <Button color="alternative" size="sm" on:click={clearSelection}>Clear</Button>
      </div>
    </div>

    <!-- Workflows Table -->
    {#if filteredWorkflows.length === 0}
      <div class="text-center py-8 text-gray-400">
        {searchQuery ? 'No workflows match your search.' : 'No workflows saved yet.'}
      </div>
    {:else}
      <Table class="dark">
        <TableHead>
          <TableHeadCell class="w-12">
            <input type="checkbox" 
              checked={selectedWorkflows.size === filteredWorkflows.length && filteredWorkflows.length > 0}
              on:change={() => selectedWorkflows.size === filteredWorkflows.length ? clearSelection() : selectAll()}
            />
          </TableHeadCell>
          <TableHeadCell class="cursor-pointer" on:click={() => setSortBy('name')}>
            Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </TableHeadCell>
          <TableHeadCell class="cursor-pointer" on:click={() => setSortBy('steps')}>
            <LayersSolid class="w-4 h-4 inline mr-1" />
            Steps {sortBy === 'steps' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </TableHeadCell>
          <TableHeadCell class="cursor-pointer" on:click={() => setSortBy('date')}>
            <ClockSolid class="w-4 h-4 inline mr-1" />
            Modified {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </TableHeadCell>
          <TableHeadCell class="w-48">Actions</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each filteredWorkflows as workflow (workflow.id)}
            <TableBodyRow class="hover:bg-gray-800">
              <TableBodyCell>
                <input type="checkbox" 
                  checked={selectedWorkflows.has(workflow.id)}
                  on:change={() => toggleWorkflowSelection(workflow.id)}
                />
              </TableBodyCell>
              <TableBodyCell>
                {#if editingWorkflow === workflow.id}
                  <div class="flex gap-2 items-center">
                    <Input
                      bind:value={editName}
                      size="sm"
                      class="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      on:keydown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <Button color="green" size="xs" on:click={saveEdit}>Save</Button>
                    <Button color="alternative" size="xs" on:click={cancelEdit}>Cancel</Button>
                  </div>
                {:else}
                  <div>
                    <div class="font-medium text-white">{workflow.name}</div>
                    {#if workflow.description}
                      <div class="text-sm text-gray-400">{workflow.description}</div>
                    {/if}
                  </div>
                {/if}
              </TableBodyCell>
              <TableBodyCell>
                <Badge color="gray" class="text-xs">{workflow.stepCount}</Badge>
              </TableBodyCell>
              <TableBodyCell class="text-sm text-gray-400">
                {formatDate(workflow.dateModified)}
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex gap-2">
                  <Button 
                    color="blue" 
                    size="sm" 
                    on:click={() => loadWorkflow(workflow.id)}
                    title="Load workflow into workspace"
                    class="!p-2"
                  >
                    <PlaySolid class="w-4 h-4" />
                  </Button>
                  <Button 
                    color="alternative" 
                    size="sm" 
                    on:click={() => startEdit(workflow)}
                    title="Rename workflow"
                    class="!p-2"
                  >
                    <EditSolid class="w-4 h-4" />
                  </Button>
                  <Button 
                    color="green" 
                    size="sm" 
                    on:click={() => exportWorkflow(workflow.id)}
                    title="Download workflow as JSON"
                    class="!p-2"
                  >
                    <DownloadSolid class="w-4 h-4" />
                  </Button>
                  <Button 
                    color="red" 
                    size="sm" 
                    on:click={() => confirmDelete(workflow.id)}
                    title="Delete workflow"
                    class="!p-2"
                  >
                    <TrashBinSolid class="w-4 h-4" />
                  </Button>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    {/if}

    <!-- Actions -->
    <div class="flex justify-between items-center pt-4 border-t border-gray-700">
      <div class="text-sm text-gray-400">
        <div>{filteredWorkflows.length} of {workflows.length} workflow{workflows.length === 1 ? '' : 's'}</div>
        <div class="text-xs mt-1">
          Actions: 
          <span class="text-blue-400">▶ Load</span> • 
          <span class="text-gray-300">✏️ Edit</span> • 
          <span class="text-green-400">⬇️ Export</span> • 
          <span class="text-red-400">🗑️ Delete</span>
        </div>
      </div>
      
      <Button color="alternative" on:click={handleClose}>
        Close
      </Button>
    </div>
  </div>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteConfirm} size="md" class="dark">
  <div class="text-center space-y-4">
    <div class="text-red-400 text-4xl">⚠️</div>
    <h3 class="text-lg font-semibold text-white">Delete Workflow?</h3>
    <p class="text-gray-400">
      This action cannot be undone. The workflow will be permanently deleted.
    </p>
    
    <div class="flex gap-3 justify-center pt-4">
      <Button color="alternative" on:click={() => showDeleteConfirm = false}>
        Cancel
      </Button>
      <Button color="red" on:click={deleteWorkflow}>
        <TrashBinSolid class="w-4 h-4 mr-2" />
        Delete Workflow
      </Button>
    </div>
  </div>
</Modal>
