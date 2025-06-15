<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ConflictAnalysis, Extension, Conflict } from '../lib/missing-nodes';

	export let conflictAnalysis: ConflictAnalysis;
	export let selectedExtensions: Map<string, Extension>;

	const dispatch = createEventDispatcher();

	let currentStep = 0;
	let resolvedSelections = new Map(selectedExtensions);
	let conflictResolutions = new Map<string, string>();

	$: conflicts = conflictAnalysis.conflicts;
	$: totalSteps = conflicts.length;
	$: currentConflict = conflicts[currentStep];
	$: canProceed = totalSteps === 0 || currentStep >= totalSteps - 1;
	$: hasUnresolvedConflicts = conflicts.some(conflict => !conflictResolutions.has(conflict.id));

	function handleConflictResolution(conflictId: string, resolution: string, selectedExtension?: Extension) {
		conflictResolutions.set(conflictId, resolution);
		conflictResolutions = conflictResolutions; // Trigger reactivity
		
		// Update resolved selections if an extension was chosen
		if (selectedExtension && resolution === 'choose') {
			// Remove conflicting extensions and add the chosen one
			const conflict = conflicts.find(c => c.id === conflictId);
			if (conflict) {
				// Remove all conflicting extensions from selection
				conflict.affectedExtensions.forEach(ext => {
					const nodeTypes = findNodeTypesForExtension(ext);
					nodeTypes.forEach(nodeType => {
						resolvedSelections.delete(nodeType);
					});
				});
				
				// Add the chosen extension
				const nodeTypes = findNodeTypesForExtension(selectedExtension);
				nodeTypes.forEach(nodeType => {
					resolvedSelections.set(nodeType, selectedExtension);
				});
				
				resolvedSelections = resolvedSelections; // Trigger reactivity
			}
		}
	}

	function findNodeTypesForExtension(extension: Extension): string[] {
		const nodeTypes: string[] = [];
		selectedExtensions.forEach((ext, nodeType) => {
			if (ext.name === extension.name) {
				nodeTypes.push(nodeType);
			}
		});
		return nodeTypes;
	}

	function nextStep() {
		if (currentStep < totalSteps - 1) {
			currentStep++;
		}
	}

	function previousStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function handleResolveAll() {
		// Auto-resolve remaining conflicts by choosing the first (recommended) option
		conflicts.forEach(conflict => {
			if (!conflictResolutions.has(conflict.id)) {
				const recommendedExtension = conflict.affectedExtensions[0]; // First is usually recommended
				handleConflictResolution(conflict.id, 'choose', recommendedExtension);
			}
		});
	}

	function handleComplete() {
		dispatch('resolved', {
			resolvedSelections: resolvedSelections,
			conflictResolutions: conflictResolutions
		});
	}

	function handleCancel() {
		dispatch('cancel');
	}

	// Get conflict type styling
	function getConflictTypeStyle(type: string): string {
		switch (type) {
			case 'duplicate-nodes':
				return 'text-yellow-400';
			case 'dependency-conflict':
				return 'text-red-400';
			case 'version-conflict':
				return 'text-orange-400';
			default:
				return 'text-gray-400';
		}
	}

	function getConflictTypeIcon(type: string): string {
		switch (type) {
			case 'duplicate-nodes':
				return '⚠️';
			case 'dependency-conflict':
				return '❌';
			case 'version-conflict':
				return '🔄';
			default:
				return '❓';
		}
	}
</script>

<div class="space-y-6">
	
	<!-- Header -->
	<div class="text-center">
		<h2 class="text-xl font-bold text-white mb-2">Resolve Extension Conflicts</h2>
		<p class="text-gray-300">
			{totalSteps} conflicts detected • Step {currentStep + 1} of {totalSteps}
		</p>
		
		<!-- Progress Bar -->
		<div class="w-full bg-gray-700 rounded-full h-2 mt-3">
			<div 
				class="bg-blue-600 h-2 rounded-full transition-all duration-300"
				style="width: {((currentStep + 1) / totalSteps) * 100}%">
			</div>
		</div>
	</div>

	{#if currentConflict}
		<!-- Current Conflict Details -->
		<div class="bg-gray-800 border border-gray-600 rounded-lg p-4">
			
			<!-- Conflict Header -->
			<div class="flex items-center mb-3">
				<span class="text-2xl mr-3">{getConflictTypeIcon(currentConflict.type)}</span>
				<div>
					<h3 class="text-white font-medium text-lg">
						{currentConflict.type === 'duplicate-nodes' ? 'Duplicate Node Providers' :
						 currentConflict.type === 'dependency-conflict' ? 'Dependency Conflict' :
						 currentConflict.type === 'version-conflict' ? 'Version Conflict' :
						 'Extension Conflict'}
					</h3>
					<p class="text-gray-300 text-sm">{currentConflict.description}</p>
				</div>
			</div>

			<!-- Affected Nodes -->
			{#if currentConflict.affectedNodes && currentConflict.affectedNodes.length > 0}
				<div class="mb-4">
					<h4 class="text-white font-medium mb-2">Affected Node Types:</h4>
					<div class="flex flex-wrap gap-2">
						{#each currentConflict.affectedNodes as nodeType}
							<span class="px-2 py-1 bg-gray-700 text-gray-300 text-sm rounded">
								{nodeType}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Conflicting Extensions -->
			<div class="mb-4">
				<h4 class="text-white font-medium mb-3">Choose One Extension:</h4>
				<div class="space-y-3">
					{#each currentConflict.affectedExtensions as extension, index}
						<div 
							class="border rounded-lg p-3 cursor-pointer transition-colors {
								conflictResolutions.get(currentConflict.id) === 'choose' && 
								resolvedSelections.has(findNodeTypesForExtension(extension)[0])
									? 'border-blue-500 bg-blue-900' 
									: 'border-gray-600 bg-gray-700 hover:border-gray-500'
							}"
							on:click={() => handleConflictResolution(currentConflict.id, 'choose', extension)}>
							
							<div class="flex items-start justify-between">
								<div class="flex items-center">
									<!-- Radio Button -->
									<input 
										type="radio" 
										name="conflict-{currentConflict.id}"
										value={extension.name}
										checked={conflictResolutions.get(currentConflict.id) === 'choose' && 
												resolvedSelections.has(findNodeTypesForExtension(extension)[0])}
										on:change={() => handleConflictResolution(currentConflict.id, 'choose', extension)}
										class="mr-3 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
									
									<!-- Extension Info -->
									<div>
										<h5 class="text-white font-medium">
											{extension.title || extension.name}
											{#if index === 0}
												<span class="text-green-400 text-sm ml-2">(Recommended)</span>
											{/if}
										</h5>
										{#if extension.author}
											<p class="text-gray-400 text-sm">by {extension.author}</p>
										{/if}
										{#if extension.description}
											<p class="text-gray-300 text-sm mt-1">{extension.description}</p>
										{/if}
									</div>
								</div>

								<!-- Extension Stats -->
								<div class="text-right text-xs text-gray-400">
									{#if extension.stars !== undefined}
										<div class="flex items-center">
											<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
												<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
											</svg>
											{extension.stars}
										</div>
									{/if}
									{#if extension.nodeCount !== undefined}
										<div class="mt-1">{extension.nodeCount} nodes</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Alternative Actions -->
			<div class="border-t border-gray-600 pt-3">
				<h4 class="text-white font-medium mb-2">Alternative Actions:</h4>
				<div class="space-y-2">
					<button 
						on:click={() => handleConflictResolution(currentConflict.id, 'skip')}
						class="w-full text-left p-2 rounded border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors {
							conflictResolutions.get(currentConflict.id) === 'skip' ? 'border-yellow-500 bg-yellow-900' : ''
						}">
						⏭️ Skip this conflict (install none of these extensions)
					</button>
					<button 
						on:click={() => handleConflictResolution(currentConflict.id, 'manual')}
						class="w-full text-left p-2 rounded border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors {
							conflictResolutions.get(currentConflict.id) === 'manual' ? 'border-blue-500 bg-blue-900' : ''
						}">
						🔧 Resolve manually later (will need manual installation)
					</button>
				</div>
			</div>
		</div>

		<!-- Navigation -->
		<div class="flex items-center justify-between">
			<button 
				on:click={previousStep}
				disabled={currentStep === 0}
				class="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
				← Previous
			</button>

			<div class="text-center">
				<p class="text-gray-300 text-sm">
					{#if conflictResolutions.has(currentConflict.id)}
						<span class="text-green-400">✅ Resolved</span>
					{:else}
						<span class="text-yellow-400">⏳ Choose resolution</span>
					{/if}
				</p>
			</div>

			{#if currentStep < totalSteps - 1}
				<button 
					on:click={nextStep}
					disabled={!conflictResolutions.has(currentConflict.id)}
					class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
					Next →
				</button>
			{:else}
				<button 
					on:click={handleComplete}
					disabled={hasUnresolvedConflicts}
					class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium">
					Complete Resolution
				</button>
			{/if}
		</div>
	{/if}

	<!-- Summary Footer -->
	<div class="bg-gray-800 border border-gray-600 rounded-lg p-4">
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-white font-medium">Resolution Summary</h3>
			{#if hasUnresolvedConflicts}
				<button 
					on:click={handleResolveAll}
					class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
					Auto-Resolve All
				</button>
			{/if}
		</div>
		
		<div class="grid grid-cols-3 gap-4 text-center text-sm">
			<div>
				<div class="text-gray-400">Total Conflicts</div>
				<div class="text-white font-medium">{totalSteps}</div>
			</div>
			<div>
				<div class="text-gray-400">Resolved</div>
				<div class="text-green-400 font-medium">{conflictResolutions.size}</div>
			</div>
			<div>
				<div class="text-gray-400">Remaining</div>
				<div class="text-yellow-400 font-medium">{totalSteps - conflictResolutions.size}</div>
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex space-x-3 pt-4 border-t border-gray-700">
		<button 
			on:click={handleCancel}
			class="flex-1 px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors">
			Cancel
		</button>
		<button 
			on:click={handleComplete}
			disabled={hasUnresolvedConflicts}
			class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium">
			Apply Resolutions ({conflictResolutions.size}/{totalSteps})
		</button>
	</div>
</div>

<style>
	/* Custom radio button styling for dark theme */
	input[type="radio"] {
		appearance: none;
		width: 16px;
		height: 16px;
		border: 2px solid #6B7280;
		border-radius: 50%;
		background: #374151;
		position: relative;
		cursor: pointer;
	}
	
	input[type="radio"]:checked {
		border-color: #3B82F6;
		background: #1E40AF;
	}
	
	input[type="radio"]:checked::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 6px;
		height: 6px;
		background: white;
		border-radius: 50%;
	}
	
	input[type="radio"]:focus {
		outline: none;
		box-shadow: 0 0 0 2px #3B82F6;
	}
</style>
