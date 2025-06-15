<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { missingNodesState, installationProgress, userSelections, serverHost, installationState } from '../stores';
	import { createInstallationPlan, analyzeConflicts, createMissingNodeDetector, type MissingNodeInfo, type Extension, type InstallationPlan, type ConflictAnalysis } from '../lib/missing-nodes';
	import { InstallationQueue } from '../lib/installation-queue';
	import ExtensionChoiceCard from './ExtensionChoiceCard.svelte';
	import ConflictResolutionDialog from './ConflictResolutionDialog.svelte';
	import InstallationProgressMonitor from './InstallationProgressMonitor.svelte';

	const dispatch = createEventDispatcher();

	// Component state
	let installationPlan: InstallationPlan | null = null;
	let conflictAnalysis: ConflictAnalysis | null = null;
	let showConflictResolution = false;
	let showProgressMonitor = false;
	let selectedExtensions: Map<string, Extension> = new Map();
	let skippedNodes: Set<string> = new Set(); // Track skipped nodes
	let installationQueue: InstallationQueue | null = null;
	let missingNodeDetector: any = null;

	// Reactive state from stores
	$: missingNodes = $missingNodesState.missingNodes || [];
	$: isInstalling = $installationProgress.isInstalling;
	$: dialogOpen = $missingNodesState.isDialogOpen;

	// Initialize installation queue and missing node detector
	onMount(() => {
		// Get server host from store
		installationQueue = new InstallationQueue($serverHost);
		missingNodeDetector = createMissingNodeDetector($serverHost);
	});

	// Auto-select recommended extensions on load
	$: if (missingNodes.length > 0 && selectedExtensions.size === 0) {
		autoSelectRecommended();
	}

	function autoSelectRecommended() {
		const newSelections = new Map<string, Extension>();
		
		missingNodes.forEach(nodeInfo => {
			if (nodeInfo.availableExtensions.length > 0) {
				// Select the first (highest rated) extension by default
				const recommended = nodeInfo.availableExtensions[0];
				newSelections.set(nodeInfo.nodeType, recommended);
			}
		});
		
		selectedExtensions = newSelections;
		userSelections.update(state => ({
			...state,
			selectedExtensions: newSelections
		}));
	}

	function handleExtensionSelection(nodeType: string, extension: Extension) {
		selectedExtensions.set(nodeType, extension);
		skippedNodes.delete(nodeType); // Un-skip if selecting
		selectedExtensions = selectedExtensions; // Trigger reactivity
		
		userSelections.update(state => ({
			...state,
			selectedExtensions: new Map(selectedExtensions),
			skippedNodes: new Set(skippedNodes)
		}));
		
		// Re-analyze conflicts when selection changes
		analyzeCurrentSelections();
	}

	function handleNodeSkip(nodeType: string) {
		skippedNodes.add(nodeType);
		selectedExtensions.delete(nodeType); // Remove selection if skipping
		skippedNodes = skippedNodes; // Trigger reactivity
		selectedExtensions = selectedExtensions;
		
		userSelections.update(state => ({
			...state,
			selectedExtensions: new Map(selectedExtensions),
			skippedNodes: new Set(skippedNodes)
		}));
		
		// Re-analyze conflicts when selection changes
		analyzeCurrentSelections();
	}

	function handleNodeUnskip(nodeType: string) {
		skippedNodes.delete(nodeType);
		// Auto-select recommended extension when un-skipping
		const nodeInfo = missingNodes.find(n => n.nodeType === nodeType);
		if (nodeInfo?.availableExtensions.length > 0) {
			selectedExtensions.set(nodeType, nodeInfo.availableExtensions[0]);
		}
		skippedNodes = skippedNodes;
		selectedExtensions = selectedExtensions;
		
		userSelections.update(state => ({
			...state,
			selectedExtensions: new Map(selectedExtensions),
			skippedNodes: new Set(skippedNodes)
		}));
		
		analyzeCurrentSelections();
	}

	async function analyzeCurrentSelections() {
		if (selectedExtensions.size === 0) return;
		
		try {
			const extensionList = Array.from(selectedExtensions.values());
			conflictAnalysis = await analyzeConflicts(extensionList);
			
			// Update store
			missingNodesState.update(state => ({
				...state,
				conflictAnalysis
			}));
		} catch (error) {
			console.error('Failed to analyze conflicts:', error);
		}
	}

	async function createPlan() {
		if (selectedExtensions.size === 0) return;
		
		try {
			const extensionList = Array.from(selectedExtensions.values());
			installationPlan = await createInstallationPlan(extensionList);
			
			// Update store
			missingNodesState.update(state => ({
				...state,
				installationPlan
			}));
		} catch (error) {
			console.error('Failed to create installation plan:', error);
		}
	}

	async function handleInstallAll() {
		if (!installationQueue) return;
		
		await createPlan();
		
		// Check for conflicts first
		if (conflictAnalysis && conflictAnalysis.conflicts.length > 0) {
			showConflictResolution = true;
			return;
		}
		
		// No conflicts, proceed with installation
		proceedWithInstallation();
	}

	async function proceedWithInstallation() {
		if (!installationQueue || selectedExtensions.size === 0) return;
		
		showProgressMonitor = true;
		
		try {
			// Convert selections to installation items
			const extensionList = Array.from(selectedExtensions.values());
			const extensions = extensionList.map(ext => ({
				extensionId: ext.id,
				version: 'latest',
				nodeType: ext.nodeType || 'unknown',
				gitUrl: ext.repository,
				title: ext.title,
				author: ext.author
			}));
			
			// Start installation state
			installationState.startInstallation(extensions);
			
			// Start installation with automatic restart
			await installationQueue.installWithAutoRestart(
				extensions,
				(progress) => {
					// Update progress in stores
					installationProgress.update(state => ({
						...state,
						progress: progress.completedExtensions / progress.totalExtensions,
						currentOperation: progress.currentOperation
					}));
					
					installationState.updateProgress(
						progress.completedExtensions,
						progress.currentExtension,
						progress.currentOperation
					);
				},
				() => {
					// Restart started callback
					installationState.startRestart();
					console.log('[Enhanced Dialog] ComfyUI restart initiated');
				},
				(result) => {
					// Installation and restart complete
					installationState.completeRestart();
					handleInstallationComplete();
				},
				(error) => {
					// Installation or restart error
					installationState.restartFailed(error.message);
					handleInstallationError(error);
				}
			);
			
		} catch (error) {
			console.error('Installation failed:', error);
			installationState.restartFailed(error.message);
			handleInstallationError(error);
		}
	}

	function handleInstallationComplete() {
		// Reset dialog state
		resetDialogState();
		
		// Show success message
		dispatch('installationComplete', {
			installedExtensions: Array.from(selectedExtensions.values())
		});
		
		// Close dialog
		closeDialog();
	}

	function handleInstallationError(error: any) {
		console.error('Installation error:', error);
		showProgressMonitor = false;
		
		// Show error message but keep dialog open for retry
		dispatch('installationError', { error });
	}

	function handleConflictResolved(event: CustomEvent) {
		const { resolvedSelections } = event.detail;
		selectedExtensions = new Map(resolvedSelections);
		showConflictResolution = false;
		
		// Proceed with installation after conflict resolution
		proceedWithInstallation();
	}

	function handleSkipAll() {
		dispatch('skipInstallation');
		closeDialog();
	}

	function closeDialog() {
		resetDialogState();
		missingNodesState.update(state => ({
			...state,
			isDialogOpen: false
		}));
	}

	function resetDialogState() {
		selectedExtensions = new Map();
		installationPlan = null;
		conflictAnalysis = null;
		showConflictResolution = false;
		showProgressMonitor = false;
		
		userSelections.update(state => ({
			...state,
			selectedExtensions: new Map(),
			conflictResolutions: new Map()
		}));
	}

	// Calculate summary statistics
	$: totalMissing = missingNodes.length;
	$: totalSelected = selectedExtensions.size;
	$: totalSkipped = skippedNodes.size;
	$: hasConflicts = conflictAnalysis && conflictAnalysis.conflicts.length > 0;
	$: canInstall = totalSelected > 0 && !isInstalling;
	$: hasSelections = totalSelected > 0 || totalSkipped > 0;
</script>

{#if dialogOpen}
	<!-- Main Dialog Backdrop -->
	<div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" 
		 on:click|self={closeDialog}>
		
		<!-- Dialog Container -->
		<div class="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
			
			<!-- Dialog Header -->
			<div class="bg-gray-900 px-6 py-4 border-b border-gray-700">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-xl font-bold text-white">Missing Custom Nodes</h2>
						<p class="text-gray-300 text-sm mt-1">
							{totalMissing} missing node types found • {totalSelected} extensions selected
							{#if totalSkipped > 0}
								• {totalSkipped} skipped
							{/if}
							{#if hasConflicts}
								<span class="text-yellow-400 ml-2">⚠️ Conflicts detected</span>
							{/if}
						</p>
					</div>
					<button 
						on:click={closeDialog}
						class="text-gray-400 hover:text-white transition-colors p-2">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<!-- Conflict Warning -->
				{#if hasConflicts}
					<div class="mt-3 p-3 bg-yellow-900 border border-yellow-700 rounded-lg">
						<div class="flex items-center">
							<svg class="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							<span class="text-yellow-100 font-medium">Extension Conflicts Detected</span>
						</div>
						<p class="text-yellow-200 text-sm mt-1">
							{conflictAnalysis?.conflicts.length} conflicts found. Review and resolve before installation.
						</p>
					</div>
				{/if}
			</div>

			<!-- Dialog Content -->
			<div class="p-6 overflow-y-auto max-h-[60vh]">
				{#if showProgressMonitor}
					<!-- Installation Progress View -->
					<InstallationProgressMonitor 
						{installationQueue}
						on:complete={handleInstallationComplete}
						on:error={handleInstallationError} />
						
				{:else if showConflictResolution}
					<!-- Conflict Resolution View -->
					<ConflictResolutionDialog 
						{conflictAnalysis}
						{selectedExtensions}
						on:resolved={handleConflictResolved}
						on:cancel={() => showConflictResolution = false} />
						
				{:else}
					<!-- Main Extension Selection View -->
					<div class="space-y-4">
						
						<!-- Instructions -->
						<div class="bg-blue-900 border border-blue-700 rounded-lg p-4">
							<h3 class="text-blue-100 font-medium mb-2">📦 Install Missing Extensions</h3>
							<p class="text-blue-200 text-sm">
								This workflow requires custom nodes that aren't installed. Select the best extension for each missing node type, then install them all at once.
							</p>
						</div>

						<!-- Missing Nodes Grid -->
						<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each missingNodes as nodeInfo (nodeInfo.nodeType)}
						<ExtensionChoiceCard 
						{nodeInfo}
						selectedExtension={selectedExtensions.get(nodeInfo.nodeType)}
						isSkipped={skippedNodes.has(nodeInfo.nodeType)}
						  on:selectionChange={(e) => handleExtensionSelection(nodeInfo.nodeType, e.detail)}
						   on:skip={() => handleNodeSkip(nodeInfo.nodeType)}
								on:unskip={() => handleNodeUnskip(nodeInfo.nodeType)} />
						{/each}
					</div>

						<!-- No Extensions Available Warning -->
						{#if missingNodes.some(node => node.availableExtensions.length === 0)}
							<div class="bg-red-900 border border-red-700 rounded-lg p-4">
								<h3 class="text-red-100 font-medium mb-2">⚠️ Some Nodes Unavailable</h3>
								<p class="text-red-200 text-sm">
									Some missing nodes don't have known extensions in the ComfyUI Manager registry. 
									You may need to install them manually or find alternative workflows.
								</p>
								<ul class="mt-2 text-red-200 text-sm list-disc list-inside">
									{#each missingNodes.filter(node => node.availableExtensions.length === 0) as unavailableNode}
										<li>{unavailableNode.nodeType}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Dialog Footer -->
			{#if !showProgressMonitor && !showConflictResolution}
				<div class="bg-gray-900 px-6 py-4 border-t border-gray-700">
					<div class="flex items-center justify-between">
						
						<!-- Installation Summary -->
						<div class="text-sm text-gray-300">
							{#if hasSelections}
								{#if totalSelected > 0}
									<span class="text-green-400 font-medium">{totalSelected} extensions</span> ready to install
								{/if}
								{#if totalSkipped > 0}
									{#if totalSelected > 0} • {/if}
									<span class="text-orange-400">{totalSkipped} skipped</span>
								{/if}
								{#if hasConflicts}
									<span class="text-yellow-400 ml-2">• Conflicts need resolution</span>
								{/if}
							{:else}
								<span class="text-gray-400">Select extensions to install or skip nodes</span>
							{/if}
						</div>

						<!-- Action Buttons -->
						<div class="flex space-x-3">
							<button 
								on:click={handleSkipAll}
								class="px-4 py-2 text-gray-300 hover:text-white transition-colors border border-gray-600 rounded-lg hover:border-gray-500">
								Skip All
							</button>
							
							{#if hasConflicts}
								<button 
									on:click={() => showConflictResolution = true}
									disabled={!canInstall}
									class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
									Resolve Conflicts
								</button>
							{:else}
								<button 
									on:click={handleInstallAll}
									disabled={!canInstall}
									class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium">
									{#if isInstalling}
										Installing...
									{:else}
										Install All ({totalSelected})
									{/if}
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for dark theme */
	.overflow-y-auto::-webkit-scrollbar {
		width: 8px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-track {
		background: #374151;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: #6B7280;
		border-radius: 4px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background: #9CA3AF;
	}
</style>
