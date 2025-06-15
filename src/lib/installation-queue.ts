// src/lib/installation-queue.ts
// Professional Installation Queue Management for Enhanced Missing Nodes

import { 
  queueExtensionInstallation, 
  startInstallationQueue, 
  getQueueStatus, 
  restartComfyUI,
  waitForComfyUIRestart,
  resetQueue,
  type ExtensionSelection,
  type QueueStatus,
  type InstallationResult
} from './manager-api';

export interface InstallationProgress {
  totalExtensions: number;
  completedExtensions: number;
  currentExtension?: string;
  currentOperation: string;
  errors: InstallationError[];
  estimatedTimeRemaining: number;
}

export interface InstallationError {
  extensionId: string;
  errorType: 'network' | 'conflict' | 'security' | 'unknown';
  message: string;
  recoveryOptions: RecoveryOption[];
}

export interface RecoveryOption {
  action: 'retry' | 'skip' | 'alternative';
  description: string;
}

export class InstallationQueue {
  private serverHost: string;
  private startTime: number = 0;
  private estimatedDuration: number = 0;

  constructor(serverHost: string) {
    this.serverHost = serverHost;
  }

  async queueInstallation(extension: ExtensionSelection): Promise<void> {
    try {
      await queueExtensionInstallation(extension, this.serverHost);
      console.log(`[Installation Queue] Queued: ${extension.extensionId} for ${extension.nodeType}`);
    } catch (error) {
      console.error(`[Installation Queue] Failed to queue ${extension.extensionId}:`, error);
      throw error;
    }
  }

  async queueMultipleInstallations(extensions: ExtensionSelection[]): Promise<void> {
    console.log(`[Installation Queue] Queueing ${extensions.length} extensions`);
    
    for (const extension of extensions) {
      try {
        await this.queueInstallation(extension);
      } catch (error) {
        console.error(`[Installation Queue] Failed to queue ${extension.extensionId}, continuing with others`);
        // Continue with other installations even if one fails to queue
      }
    }
  }

  async startInstallation(): Promise<void> {
    try {
      this.startTime = Date.now();
      await startInstallationQueue(this.serverHost);
      console.log('[Installation Queue] Installation process started');
    } catch (error) {
      console.error('[Installation Queue] Failed to start installation:', error);
      throw error;
    }
  }

  async monitorProgress(
    onProgress: (progress: InstallationProgress) => void,
    onComplete: (result: InstallationResult) => void,
    onError: (error: InstallationError) => void
  ): Promise<void> {
    console.log('[Installation Queue] Starting progress monitoring');
    
    const poll = async () => {
      try {
        const status = await getQueueStatus(this.serverHost);
        
        const progress: InstallationProgress = {
          totalExtensions: status.total_count,
          completedExtensions: status.done_count,
          currentOperation: this.getCurrentOperation(status),
          errors: [],
          estimatedTimeRemaining: this.calculateTimeRemaining(status)
        };
        
        onProgress(progress);
        
        // Check if installation is complete
        if (!status.is_processing && status.done_count >= status.total_count) {
          const result: InstallationResult = {
            status: 'success',
            installedExtensions: [], // Would need to track this from queue responses
            failedExtensions: [],
            needsRestart: true,
            message: `Successfully installed ${status.done_count} extensions`
          };
          
          console.log('[Installation Queue] Installation complete');
          onComplete(result);
          return;
        }
        
        // Continue monitoring if still processing
        if (status.is_processing || status.in_progress_count > 0) {
          setTimeout(poll, 1000);
        } else {
          // Check for errors or completion
          if (status.done_count < status.total_count) {
            const error: InstallationError = {
              extensionId: 'unknown',
              errorType: 'unknown',
              message: 'Some installations may have failed',
              recoveryOptions: [
                { action: 'retry', description: 'Retry failed installations' },
                { action: 'skip', description: 'Continue without failed extensions' }
              ]
            };
            onError(error);
          }
        }
        
      } catch (error) {
        console.error('[Installation Queue] Error monitoring progress:', error);
        const installError: InstallationError = {
          extensionId: 'system',
          errorType: 'network',
          message: `Failed to get installation status: ${error.message}`,
          recoveryOptions: [
            { action: 'retry', description: 'Check connection and retry' }
          ]
        };
        onError(installError);
      }
    };
    
    // Start polling
    poll();
  }

  /**
   * Complete end-to-end installation with automatic restart
   */
  async installWithAutoRestart(
    extensions: ExtensionSelection[],
    onProgress: (progress: InstallationProgress) => void,
    onRestartStarted: () => void,
    onComplete: (result: InstallationResult) => void,
    onError: (error: InstallationError) => void
  ): Promise<void> {
    try {
      // Install extensions
      await this.installWithDependencyOrder(
        extensions,
        onProgress,
        async (installResult) => {
          if (installResult.needsRestart && installResult.status === 'success') {
            // Start restart process
            onRestartStarted();
            
            try {
              // Restart ComfyUI
              await restartComfyUI(this.serverHost);
              
              // Wait for ComfyUI to come back online
              await waitForComfyUIRestart(this.serverHost);
              
              // Complete with success
              const finalResult: InstallationResult = {
                ...installResult,
                needsRestart: false,
                message: 'Installation complete and ComfyUI restarted successfully!'
              };
              
              onComplete(finalResult);
              
            } catch (restartError) {
              console.error('[Installation Queue] Restart failed:', restartError);
              const error: InstallationError = {
                extensionId: 'system',
                errorType: 'unknown',
                message: `Installation succeeded but restart failed: ${restartError.message}`,
                recoveryOptions: [
                  { action: 'retry', description: 'Manually restart ComfyUI' },
                  { action: 'skip', description: 'Continue without restart (requires manual restart)' }
                ]
              };
              onError(error);
            }
          } else {
            // No restart needed or installation failed
            onComplete(installResult);
          }
        },
        onError
      );
      
    } catch (error) {
      console.error('[Installation Queue] Complete installation failed:', error);
      const installError: InstallationError = {
        extensionId: 'system',
        errorType: 'unknown',
        message: `Complete installation failed: ${error.message}`,
        recoveryOptions: [
          { action: 'retry', description: 'Retry complete installation' }
        ]
      };
      onError(installError);
    }
  }

  async restart(): Promise<void> {
    try {
      console.log('[Installation Queue] Initiating ComfyUI restart');
      await restartComfyUI(this.serverHost);
    } catch (error) {
      console.error('[Installation Queue] Failed to restart ComfyUI:', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      console.log('[Installation Queue] Resetting installation queue');
      await resetQueue(this.serverHost);
    } catch (error) {
      console.error('[Installation Queue] Failed to reset queue:', error);
      throw error;
    }
  }

  private getCurrentOperation(status: QueueStatus): string {
    if (status.is_processing) {
      if (status.in_progress_count > 0) {
        return `Installing extensions... (${status.done_count}/${status.total_count})`;
      } else {
        return 'Processing installation queue...';
      }
    } else if (status.done_count < status.total_count) {
      return 'Installation paused or completed with errors';
    } else {
      return 'Installation complete';
    }
  }

  private calculateTimeRemaining(status: QueueStatus): number {
    if (!status.is_processing || status.total_count === 0) {
      return 0;
    }
    
    const elapsed = Date.now() - this.startTime;
    const progress = status.done_count / status.total_count;
    
    if (progress > 0) {
      const estimated = (elapsed / progress) - elapsed;
      return Math.max(estimated, 0);
    }
    
    // Default estimation if no progress yet
    const remaining = status.total_count - status.done_count;
    return remaining * 30000; // 30 seconds per extension
  }

  // Enhanced installation with dependency order resolution
  async installWithDependencyOrder(
    extensions: ExtensionSelection[],
    onProgress: (progress: InstallationProgress) => void,
    onComplete: (result: InstallationResult) => void,
    onError: (error: InstallationError) => void
  ): Promise<void> {
    try {
      // Reset queue first to ensure clean state
      await this.reset();
      
      // Calculate dependency order (simplified - in practice would analyze dependencies)
      const orderedExtensions = this.calculateInstallationOrder(extensions);
      
      // Queue all extensions in dependency order
      await this.queueMultipleInstallations(orderedExtensions);
      
      // Start installation
      await this.startInstallation();
      
      // Monitor progress
      await this.monitorProgress(onProgress, onComplete, onError);
      
    } catch (error) {
      console.error('[Installation Queue] Failed to install with dependency order:', error);
      const installError: InstallationError = {
        extensionId: 'system',
        errorType: 'unknown',
        message: `Installation failed: ${error.message}`,
        recoveryOptions: [
          { action: 'retry', description: 'Retry installation' },
          { action: 'skip', description: 'Skip this installation' }
        ]
      };
      onError(installError);
    }
  }

  private calculateInstallationOrder(extensions: ExtensionSelection[]): ExtensionSelection[] {
    // Simple ordering for now - in practice would analyze actual dependencies
    // For now, just return as-is, but this is where dependency resolution would go
    console.log(`[Installation Queue] Calculating installation order for ${extensions.length} extensions`);
    
    // TODO: Implement proper dependency analysis
    // 1. Parse each extension's dependencies
    // 2. Create dependency graph
    // 3. Perform topological sort
    // 4. Return ordered list
    
    return extensions;
  }

  // Utility method to check if ComfyUI Manager is available
  async isAvailable(): Promise<boolean> {
    try {
      await getQueueStatus(this.serverHost);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get detailed status for UI display
  async getDetailedStatus(): Promise<QueueStatus> {
    return await getQueueStatus(this.serverHost);
  }
}

// Factory function for creating installation queue
export function createInstallationQueue(serverHost: string): InstallationQueue {
  return new InstallationQueue(serverHost);
}

// Utility functions for error handling
export function categorizeInstallationError(error: any): InstallationError {
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return {
      extensionId: 'unknown',
      errorType: 'network',
      message: 'Network connection error during installation',
      recoveryOptions: [
        { action: 'retry', description: 'Check connection and retry' }
      ]
    };
  } else if (error.message?.includes('security') || error.message?.includes('403')) {
    return {
      extensionId: 'unknown',
      errorType: 'security',
      message: 'Security policy prevents installation',
      recoveryOptions: [
        { action: 'skip', description: 'Skip this extension' }
      ]
    };
  } else {
    return {
      extensionId: 'unknown',
      errorType: 'unknown',
      message: error.message || 'Unknown installation error',
      recoveryOptions: [
        { action: 'retry', description: 'Retry installation' },
        { action: 'skip', description: 'Skip this extension' }
      ]
    };
  }
}
