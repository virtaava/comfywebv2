<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { MissingNodeInfo, Extension } from '../lib/missing-nodes';

	export let nodeInfo: MissingNodeInfo;
	export let selectedExtension: Extension | null = null;
	export let isSkipped: boolean = false;

	const dispatch = createEventDispatcher();

	function handleSkipToggle() {
		if (isSkipped) {
			dispatch('unskip');
		} else {
			dispatch('skip');
		}
	}

	// Trust level styling
	function getTrustLevelStyle(trustLevel: string): string {
		switch (trustLevel) {
			case 'high':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'medium':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'low':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	function getTrustLevelIcon(trustLevel: string): string {
		switch (trustLevel) {
			case 'high':
				return '✅';
			case 'medium':
				return '⚠️';
			case 'low':
				return '🔶';
			default:
				return '❓';
		}
	}

	function handleExtensionSelect(extension: Extension) {
		selectedExtension = extension;
		dispatch('selectionChange', extension);
	}

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	}

	function formatNumber(num: number): string {
		if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'k';
		}
		return num.toString();
	}

	// Get the recommended (first) extension
	$: recommendedExtension = nodeInfo.availableExtensions[0];
	$: hasMultipleOptions = nodeInfo.availableExtensions.length > 1;
	$: hasNoOptions = nodeInfo.availableExtensions.length === 0;
</script>

<div class="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors {isSkipped ? 'opacity-60' : ''}">
	
	<!-- Node Type Header -->
	<div class="mb-3 flex items-start justify-between">
		<div class="flex-1">
			<h3 class="text-white font-medium text-lg">{nodeInfo.nodeType}</h3>
			{#if nodeInfo.description}
				<p class="text-gray-300 text-sm mt-1">{nodeInfo.description}</p>
			{/if}
		</div>
		
		<!-- Skip Toggle -->
		<div class="ml-3">
			<button 
				on:click={handleSkipToggle}
				class="px-3 py-1 text-xs rounded-md transition-colors {
					isSkipped 
						? 'bg-orange-600 hover:bg-orange-700 text-white' 
						: 'bg-gray-600 hover:bg-gray-500 text-gray-300'
				}">
				{isSkipped ? '↩️ Include' : '⏭️ Skip'}
			</button>
		</div>
	</div>

	{#if isSkipped}
		<!-- Skipped State -->
		<div class="bg-orange-900 border border-orange-700 rounded-lg p-3">
			<div class="flex items-center mb-2">
				<span class="text-orange-400 mr-2">⏭️</span>
				<span class="text-orange-100 font-medium">Node Skipped</span>
			</div>
			<p class="text-orange-200 text-sm">
				This node will not be installed. The workflow may not work correctly without it.
			</p>
			<button 
				on:click={handleSkipToggle}
				class="mt-2 text-xs text-orange-300 hover:text-orange-200 underline">
				Click to include this node
			</button>
		</div>
		
	{:else if hasNoOptions}
		<!-- No Extensions Available -->
		<div class="bg-red-900 border border-red-700 rounded-lg p-3">
			<div class="flex items-center mb-2">
				<span class="text-red-400 mr-2">❌</span>
				<span class="text-red-100 font-medium">No Extensions Found</span>
			</div>
			<p class="text-red-200 text-sm">
				This node type is not available in the ComfyUI Manager registry. 
				You may need to install it manually.
			</p>
		</div>
		
	{:else}
		<!-- Extension Options -->
		<div class="space-y-3">
			
			{#if hasMultipleOptions}
				<!-- Multiple Options Header -->
				<div class="text-sm text-gray-300 mb-2">
					{nodeInfo.availableExtensions.length} extensions available • Select preferred option:
				</div>
			{/if}

			{#each nodeInfo.availableExtensions as extension, index (extension.name)}
				<!-- Extension Option Card -->
				<div 
					class="border rounded-lg p-3 cursor-pointer transition-colors {
						selectedExtension?.name === extension.name 
							? 'border-blue-500 bg-blue-900' 
							: 'border-gray-600 bg-gray-800 hover:border-gray-500'
					}"
					on:click={() => handleExtensionSelect(extension)}>
					
					<!-- Selection Radio + Extension Header -->
					<div class="flex items-start justify-between mb-2">
						<div class="flex items-center">
							<!-- Radio Button -->
							<input 
								type="radio" 
								name="extension-{nodeInfo.nodeType}"
								value={extension.name}
								checked={selectedExtension?.name === extension.name}
								on:change={() => handleExtensionSelect(extension)}
								class="mr-3 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
							
							<!-- Extension Name -->
							<div>
								<h4 class="text-white font-medium">
									{extension.title || extension.name}
									{#if index === 0 && hasMultipleOptions}
										<span class="text-green-400 text-sm ml-2">(Recommended)</span>
									{/if}
								</h4>
								
								<!-- Author -->
								{#if extension.author}
									<p class="text-gray-400 text-sm">by {extension.author}</p>
								{/if}
							</div>
						</div>

						<!-- Trust Level Badge -->
						<div class="flex items-center space-x-2">
							<span class="text-sm">
								{getTrustLevelIcon(extension.trustLevel)}
							</span>
							<span class="px-2 py-1 text-xs font-medium rounded-full border {getTrustLevelStyle(extension.trustLevel)}">
								{extension.trustLevel === 'high' ? 'Trusted' : 
								 extension.trustLevel === 'medium' ? 'Community' : 
								 extension.trustLevel === 'low' ? 'Experimental' : 'Unknown'}
							</span>
						</div>
					</div>

					<!-- Extension Description -->
					{#if extension.description}
						<p class="text-gray-300 text-sm mb-2">{extension.description}</p>
					{/if}

					<!-- Extension Stats -->
					<div class="flex items-center space-x-4 text-xs text-gray-400">
						
						<!-- GitHub Stars -->
						{#if extension.stars !== undefined}
							<div class="flex items-center">
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
								{formatNumber(extension.stars)}
							</div>
						{/if}

						<!-- Last Updated -->
						{#if extension.lastUpdate}
							<div class="flex items-center">
								<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								{formatDate(extension.lastUpdate)}
							</div>
						{/if}

						<!-- Installation Size -->
						{#if extension.installSize}
							<div class="flex items-center">
								<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
								</svg>
								{extension.installSize}
							</div>
						{/if}

						<!-- Node Count -->
						{#if extension.nodeCount !== undefined}
							<div class="flex items-center">
								<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
								{extension.nodeCount} nodes
							</div>
						{/if}
					</div>

					<!-- Repository Link -->
					{#if extension.repository}
						<div class="mt-2">
							<a 
								href={extension.repository} 
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center text-blue-400 hover:text-blue-300 text-xs"
								on:click|stopPropagation>
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd" />
								</svg>
								View Repository
								<svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</a>
						</div>
					{/if}

					<!-- Installation Preview -->
					{#if selectedExtension?.name === extension.name}
						<div class="mt-3 p-2 bg-blue-800 border border-blue-600 rounded text-xs">
							<div class="flex items-center text-blue-100">
								<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Selected for installation
							</div>
							{#if extension.installCommand}
								<div class="text-blue-200 mt-1 font-mono text-xs">
									{extension.installCommand}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
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
