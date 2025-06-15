<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { installationProgress, installationState, INSTALLATION_STATUS_MESSAGES } from '../stores';
	import type { InstallationQueue } from '../lib/installation-queue';

	export let installationQueue: InstallationQueue;

	const dispatch = createEventDispatcher();

	let progressInterval: NodeJS.Timeout | null = null;
	let logEntries: { timestamp: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }[] = [];
	let showLogs = false;
	let autoScroll = true;

	// Reactive progress data
	$: progress = $installationProgress;
	$: state = $installationState;
	$: queueItems = progress.queue || [];
	$: currentItem = queueItems.find(item => item.status === 'installing');
	$: completedItems = queueItems.filter(item => item.status === 'completed');
	$: errorItems = queueItems.filter(item => item.status === 'error');
	$: pendingItems = queueItems.filter(item => item.status === 'pending' || item.status === 'queued');
	$: overallProgress = queueItems.length > 0 ? (completedItems.length / queueItems.length) * 100 : 0;
	$: isComplete = completedItems.length === queueItems.length && queueItems.length > 0 && !state.isRestarting;
	$: hasErrors = errorItems.length > 0;
	$: statusMessage = INSTALLATION_STATUS_MESSAGES[state.status] || state.currentOperation;

	onMount(() => {
		// Start monitoring progress
		startProgressMonitoring();
		
		// Add initial log entry
		addLogEntry('Installation started...', 'info');
	});

	onDestroy(() => {
		if (progressInterval) {
			clearInterval(progressInterval);
		}
	});

	function startProgressMonitoring() {
		progressInterval = setInterval(async () => {
			if (installationQueue) {
				try {
					// Update progress from queue
					const queueStatus = await installationQueue.getStatus();
					
					installationProgress.update(state => ({
						...state,
						queue: queueStatus.items,
						currentExtension: queueStatus.currentExtension,
						isInstalling: queueStatus.isActive
					}));

					// Check for completion
					if (queueStatus.isComplete) {
						handleInstallationComplete();
					}
					
					// Check for errors
					if (queueStatus.hasErrors) {
						const errors = queueStatus.items.filter(item => item.status === 'error');
						errors.forEach(errorItem => {
							if (!logEntries.some(log => log.message.includes(errorItem.extension.name))) {
								addLogEntry(`Failed to install ${errorItem.extension.title || errorItem.extension.name}: ${errorItem.error || 'Unknown error'}`, 'error');
							}
						});
					}

					// Add progress updates to log
					if (currentItem && !logEntries.some(log => log.message.includes(`Installing ${currentItem.extension.name}`))) {
						addLogEntry(`Installing ${currentItem.extension.title || currentItem.extension.name}...`, 'info');
					}

				} catch (error) {
					console.error('Progress monitoring error:', error);
					addLogEntry(`Monitoring error: ${error}`, 'error');
				}
			}
		}, 1000); // Update every second
	}

	function handleInstallationComplete() {
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = null;
		}
		
		addLogEntry('Installation completed!', 'success');
		
		// Dispatch completion event
		dispatch('complete', {
			completedItems,
			errorItems,
			totalItems: queueItems.length
		});
	}

	function addLogEntry(message: string, type: 'info' | 'success' | 'error' | 'warning') {
		const timestamp = new Date().toLocaleTimeString();
		logEntries = [...logEntries, { timestamp, message, type }];
		
		// Auto-scroll to bottom if enabled
		if (autoScroll) {
			setTimeout(() => {
				const logContainer = document.getElementById('log-container');
				if (logContainer) {
					logContainer.scrollTop = logContainer.scrollHeight;
				}
			}, 100);
		}
	}

	function retryFailedInstallations() {
		if (installationQueue && errorItems.length > 0) {
			addLogEntry(`Retrying ${errorItems.length} failed installations...`, 'info');
			
			// Restart failed items
			errorItems.forEach(item => {
				installationQueue.retryItem(item.id);
			});
		}
	}

	function cancelInstallation() {
		if (installationQueue) {
			installationQueue.cancel();
			addLogEntry('Installation cancelled by user', 'warning');
			
			dispatch('cancel');
		}
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'completed':
				return '✅';
			case 'installing':
				return '⚙️';
			case 'error':
				return '❌';
			case 'pending':
			case 'queued':
				return '⏳';
			default:
				return '❓';
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed':
				return 'text-green-400';
			case 'installing':
				return 'text-blue-400';
			case 'error':
				return 'text-red-400';
			case 'pending':
			case 'queued':
				return 'text-gray-400';
			default:
				return 'text-gray-400';
		}
	}

	function getLogTypeColor(type: string): string {
		switch (type) {
			case 'success':
				return 'text-green-400';
			case 'error':
				return 'text-red-400';
			case 'warning':
				return 'text-yellow-400';
			case 'info':
			default:
				return 'text-gray-300';
		}
	}
</script>

<div class="space-y-6">
	
	<!-- Header -->
	<div class="text-center">
		<h2 class="text-xl font-bold text-white mb-2">
			{#if state.isRestarting}
				🔄 Restarting ComfyUI
			{:else if state.status === 'complete'}
				✅ Installation Complete
			{:else}
				📦 Installing Extensions
			{/if}
		</h2>
		<p class="text-gray-300">
			{#if state.isRestarting}
				Waiting for ComfyUI to restart...
			{:else if state.status === 'complete'}
				All extensions installed and ComfyUI restarted successfully!
			{:else}
				{completedItems.length} of {queueItems.length} extensions installed
				{#if hasErrors}
					<span class="text-red-400 ml-2">• {errorItems.length} failed</span>
				{/if}
			{/if}
		</p>
		{#if statusMessage && statusMessage !== 'Ready'}
			<p class="text-blue-300 text-sm mt-1">{statusMessage}</p>
		{/if}
	</div>

	<!-- Overall Progress -->
	<div class="bg-gray-800 border border-gray-600 rounded-lg p-4">
		<div class="flex items-center justify-between mb-2">
			<h3 class="text-white font-medium">Overall Progress</h3>
			<span class="text-gray-300 text-sm">{Math.round(overallProgress)}%</span>
		</div>
		
		<!-- Progress Bar -->
		<div class="w-full bg-gray-700 rounded-full h-3">
			<div 
				class="h-3 rounded-full transition-all duration-500 {
					hasErrors ? 'bg-gradient-to-r from-green-600 to-red-600' : 'bg-blue-600'
				}"
				style="width: {overallProgress}%">
			</div>
		</div>
		
		<!-- Status Summary -->
		<div class="grid grid-cols-4 gap-4 mt-3 text-center text-sm">
			<div>
				<div class="text-gray-400">Completed</div>
				<div class="text-green-400 font-medium">{completedItems.length}</div>
			</div>
			<div>
				<div class="text-gray-400">Installing</div>
				<div class="text-blue-400 font-medium">{currentItem ? 1 : 0}</div>
			</div>
			<div>
				<div class="text-gray-400">Pending</div>
				<div class="text-gray-300 font-medium">{pendingItems.length}</div>
			</div>
			<div>
				<div class="text-gray-400">Failed</div>
				<div class="text-red-400 font-medium">{errorItems.length}</div>
			</div>
		</div>
	</div>

	<!-- Restart Progress -->
	{#if state.isRestarting}
		<div class="bg-blue-900 border border-blue-700 rounded-lg p-4">
			<div class="flex items-center mb-3">
				<span class="text-blue-400 text-xl mr-3 animate-spin">🔄</span>
				<div>
					<h3 class="text-blue-100 font-medium">Restarting ComfyUI</h3>
					<p class="text-blue-200">Please wait while ComfyUI restarts to load new extensions...</p>
				</div>
			</div>
			
			<!-- Indeterminate progress for restart -->
			<div class="w-full bg-blue-800 rounded-full h-3 overflow-hidden">
				<div class="bg-blue-400 h-3 rounded-full animate-pulse w-full"></div>
			</div>
			
			<p class="text-blue-200 text-sm mt-2 text-center">
				This may take 30-60 seconds depending on your system...
			</p>
		</div>
	{/if}

	<!-- Current Installation -->
	{#if currentItem}
		<div class="bg-blue-900 border border-blue-700 rounded-lg p-4">
			<div class="flex items-center mb-2">
				<span class="text-blue-400 text-xl mr-3">⚙️</span>
				<div>
					<h3 class="text-blue-100 font-medium">Currently Installing</h3>
					<p class="text-blue-200">{currentItem.extension.title || currentItem.extension.name}</p>
				</div>
			</div>
			
			<!-- Individual Progress -->
			{#if currentItem.progress !== undefined}
				<div class="w-full bg-blue-800 rounded-full h-2 mt-2">
					<div 
						class="bg-blue-400 h-2 rounded-full transition-all duration-300"
						style="width: {currentItem.progress}%">
					</div>
				</div>
			{:else}
				<!-- Indeterminate progress -->
				<div class="w-full bg-blue-800 rounded-full h-2 mt-2 overflow-hidden">
					<div class="bg-blue-400 h-2 rounded-full animate-pulse"></div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Installation Queue -->
	<div class="bg-gray-800 border border-gray-600 rounded-lg p-4">
		<h3 class="text-white font-medium mb-3">Installation Queue</h3>
		
		{#if queueItems.length === 0}
			<p class="text-gray-400 text-center py-4">No items in queue</p>
		{:else}
			<div class="space-y-2 max-h-64 overflow-y-auto">
				{#each queueItems as item (item.id)}
					<div class="flex items-center justify-between p-2 bg-gray-700 rounded border {
						item.status === 'installing' ? 'border-blue-500' :
						item.status === 'completed' ? 'border-green-500' :
						item.status === 'error' ? 'border-red-500' :
						'border-gray-600'
					}">
						<div class="flex items-center">
							<span class="mr-3 {getStatusColor(item.status)}">
								{getStatusIcon(item.status)}
							</span>
							<div>
								<h4 class="text-white text-sm font-medium">
									{item.extension.title || item.extension.name}
								</h4>
								{#if item.extension.author}
									<p class="text-gray-400 text-xs">by {item.extension.author}</p>
								{/if}
							</div>
						</div>
						
						<div class="text-right">
							<span class="text-xs {getStatusColor(item.status)} capitalize">
								{item.status}
							</span>
							{#if item.error}
								<p class="text-red-400 text-xs mt-1 max-w-32 truncate" title={item.error}>
									{item.error}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Installation Logs -->
	<div class="bg-gray-800 border border-gray-600 rounded-lg">
		<div class="flex items-center justify-between p-4 border-b border-gray-600">
			<h3 class="text-white font-medium">Installation Logs</h3>
			<div class="flex items-center space-x-2">
				<label class="flex items-center text-sm text-gray-300">
					<input 
						type="checkbox" 
						bind:checked={autoScroll}
						class="mr-2 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
					Auto-scroll
				</label>
				<button 
					on:click={() => showLogs = !showLogs}
					class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors">
					{showLogs ? 'Hide' : 'Show'} Logs
				</button>
			</div>
		</div>
		
		{#if showLogs}
			<div 
				id="log-container"
				class="p-4 max-h-48 overflow-y-auto bg-gray-900 font-mono text-sm">
				{#if logEntries.length === 0}
					<p class="text-gray-500">No log entries yet...</p>
				{:else}
					{#each logEntries as entry}
						<div class="flex text-xs mb-1">
							<span class="text-gray-500 mr-2 flex-shrink-0">[{entry.timestamp}]</span>
							<span class="{getLogTypeColor(entry.type)}">{entry.message}</span>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Action Buttons -->
	<div class="flex space-x-3">
		{#if !isComplete && !hasErrors}
			<!-- Installation in progress -->
			<button 
				on:click={cancelInstallation}
				class="flex-1 px-4 py-2 border border-red-600 text-red-400 hover:bg-red-900 rounded-lg transition-colors">
				Cancel Installation
			</button>
		{:else if hasErrors && !isComplete}
			<!-- Has errors, can retry -->
			<button 
				on:click={retryFailedInstallations}
				class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
				Retry Failed ({errorItems.length})
			</button>
			<button 
				on:click={() => dispatch('complete', { completedItems, errorItems, totalItems: queueItems.length })}
				class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
				Continue with Successful ({completedItems.length})
			</button>
		{:else if isComplete}
			<!-- Installation complete -->
			<button 
				on:click={() => dispatch('complete', { completedItems, errorItems, totalItems: queueItems.length })}
				class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
				{#if hasErrors}
					Complete with {errorItems.length} Errors
				{:else}
					✅ Installation Complete!
				{/if}
			</button>
		{/if}
	</div>

	<!-- Restart Notice -->
	{#if isComplete}
		<div class="bg-blue-900 border border-blue-700 rounded-lg p-4">
			<div class="flex items-center mb-2">
				<svg class="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<h3 class="text-blue-100 font-medium">ComfyUI Restart Required</h3>
			</div>
			<p class="text-blue-200 text-sm">
				ComfyUI needs to restart to load the newly installed extensions. 
				This will happen automatically after closing this dialog.
			</p>
		</div>
	{/if}
</div>

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

	/* Animated progress bar */
	@keyframes shimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}
	
	.animate-pulse {
		position: relative;
		overflow: hidden;
	}
	
	.animate-pulse::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
		animation: shimmer 2s infinite;
	}
	
	/* Spinning restart icon */
	.animate-spin {
		animation: spin 2s linear infinite;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
