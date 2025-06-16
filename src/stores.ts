import { readable, writable, type Readable, type Writable } from "svelte/store";
import type { DeepReadonly } from "ts-essentials";

import { getObjectInfoUrl, patchLibrary } from "./lib/api";
import type { NodeLibrary } from "./lib/comfy";

import type { GalleryImage } from "./lib/gallery-api";
import type { WorkflowItem } from "./lib/workflow";
import type { WorkflowDoc } from "./lib/missing-nodes";

export const infoMessage: Writable<string | undefined> = writable();
export const errorMessage: Writable<string | undefined> = writable(
  undefined,
  (set) => {
    infoMessage.subscribe(() => set(undefined));
  },
);

export const serverHost: Writable<string> = writable("127.0.0.1:8188");

// Smart caching library store with intelligent loading
interface LibraryCache {
  data: NodeLibrary | null;
  timestamp: number;
  host: string;
}

let libraryCache: LibraryCache = {
  data: null,
  timestamp: 0,
  host: ''
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'comfyweb_library_cache';

export const library: Readable<DeepReadonly<NodeLibrary>> =
  readable<NodeLibrary>({}, (set) => {
    serverHost.subscribe(async (host) => {
      const now = Date.now();
      
      // Check if we have valid cached data for this host
      if (libraryCache.data && 
          libraryCache.host === host && 
          (now - libraryCache.timestamp) < CACHE_DURATION) {
        console.log('📅 [Library] Using cached library data for:', host);
        console.log('📅 [Library] Cache age:', Math.round((now - libraryCache.timestamp) / 1000), 'seconds');
        set(Object.freeze(libraryCache.data));
        return;
      }
      
      console.log('📅 [Library] Fetching fresh node library from:', `http://${host}/api/object_info`);
      console.log('📅 [Library] Cache status:', libraryCache.data ? 'expired' : 'empty');
      
      try {
        const url = `http://${host}/api/object_info`;
        const response = await fetch(url);
        
        console.log('📅 [Library] Response status:', response.status, response.statusText);
        console.log('📅 [Library] Response size:', response.headers.get('content-length') || 'unknown');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const nodeData = await response.json();
        
        console.log('📅 [Library] Raw response keys:', Object.keys(nodeData).length);
        
        // Debug: Check for specific node types
        const hasSetNode = 'SetNode' in nodeData;
        const hasGetNode = 'GetNode' in nodeData;
        const hasRgthree = Object.keys(nodeData).some(key => 
          key.includes('rgthree') || 
          key.includes('Bypasser') ||
          key.includes('Fast Groups')
        );
        
        console.log('📅 [Library] SetNode present:', hasSetNode);
        console.log('📅 [Library] GetNode present:', hasGetNode);
        console.log('📅 [Library] rgthree nodes present:', hasRgthree);
        
        // Debug: Show some example node types
        const nodeTypes = Object.keys(nodeData);
        console.log('📅 [Library] First 10 node types:', nodeTypes.slice(0, 10));
        console.log('📅 [Library] Last 10 node types:', nodeTypes.slice(-10));
        
        // Look for specific missing nodes
        const impactNodes = nodeTypes.filter(name => 
          name.includes('Impact') || 
          name.includes('SetNode') || 
          name.includes('GetNode')
        );
        if (impactNodes.length > 0) {
          console.log('📅 [Library] Impact Pack nodes found:', impactNodes);
        }
        
        // Apply patches and freeze
        patchLibrary(nodeData);
        const frozenData = Object.freeze(nodeData);
        
        // Update cache
        libraryCache = {
          data: nodeData,
          timestamp: now,
          host: host
        };
        
        // Set the library data
        set(frozenData);
        
        console.log('📅 [Library] ✅ Library loaded successfully with', Object.keys(nodeData).length, 'node types');
        console.log('📅 [Library] Cache updated for host:', host);
        
      } catch (error) {
        console.error('❌ [Library] Failed to load node library:', error);
        console.error('❌ [Library] Host:', host);
        console.error('❌ [Library] Error details:', error.message);
        
        // If we have cached data, use it as fallback
        if (libraryCache.data && libraryCache.host === host) {
          console.log('📅 [Library] Using stale cache as fallback');
          set(Object.freeze(libraryCache.data));
        }
      }
    });
  });

// Utility function to invalidate cache (for use after node installations)
export function invalidateLibraryCache(): void {
  console.log('📅 [Library] Cache invalidated manually');
  libraryCache = {
    data: null,
    timestamp: 0,
    host: ''
  };
}

// Utility function to refresh library (force reload)
export function refreshLibrary(): void {
  console.log('📅 [Library] Forcing library refresh');
  invalidateLibraryCache();
  // Trigger reload by updating serverHost with same value
  serverHost.update(host => host);
}

// OLD GALLERY SYSTEM REMOVED - Using only galleryHistory store with ComfyUI history API

// Enhanced session-persistent workflow store
function createSessionWorkflowStore() {
  const SESSION_KEY = 'comfyweb_workflow_session';
  
  // Try to restore from sessionStorage
  let initialValue: WorkflowItem[] = [];
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        initialValue = parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to restore workflow from session:', error);
  }

  const { subscribe, set, update } = writable<WorkflowItem[]>(initialValue);

  return {
    subscribe,
    set: (value: WorkflowItem[]) => {
      // Save to sessionStorage with enhanced error handling
      try {
        if (value && Array.isArray(value) && value.length > 0) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.warn('Session storage quota exceeded. Clearing workflow data.');
          sessionStorage.removeItem(SESSION_KEY);
          // Try again after clearing
          try {
            if (value && value.length > 0) {
              sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
            }
          } catch (retryError) {
            console.error('Failed to save workflow even after clearing storage:', retryError);
          }
        } else {
          console.warn('Failed to save workflow to session:', error);
        }
      }
      set(value);
    },
    update: (updater: (value: WorkflowItem[]) => WorkflowItem[]) => {
      update((current) => {
        const newValue = updater(current);
        // Save to sessionStorage with enhanced error handling
        try {
          if (newValue && Array.isArray(newValue) && newValue.length > 0) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(newValue));
          } else {
            sessionStorage.removeItem(SESSION_KEY);
          }
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('Session storage quota exceeded. Clearing workflow data.');
            sessionStorage.removeItem(SESSION_KEY);
            // Try again after clearing
            try {
              if (newValue && newValue.length > 0) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(newValue));
              }
            } catch (retryError) {
              console.error('Failed to save workflow even after clearing storage:', retryError);
            }
          } else {
            console.warn('Failed to save workflow to session:', error);
          }
        }
        return newValue;
      });
    }
  };
}

export const workflow = createSessionWorkflowStore();

// Installation status store
export const installationStatus = writable<{
  installing: boolean;
  progress: Record<string, 'pending' | 'installing' | 'success' | 'error'>;
}>({
  installing: false,
  progress: {}
});

// Enhanced Missing Nodes System Stores
export interface MissingNodesState {
  isDialogOpen: boolean;
  missingNodes: import('./lib/missing-nodes').MissingNodeInfo[];
  installationPlan: import('./lib/missing-nodes').InstallationPlan | null;
  conflictAnalysis: import('./lib/missing-nodes').ConflictAnalysis | null;
}

export interface InstallationProgressState {
  isInstalling: boolean;
  currentExtension: string | null;
  progress: number;
  queue: import('./lib/installation-queue').InstallationQueueItem[];
  errors: import('./lib/installation-queue').InstallationError[];
}

export interface UserSelectionsState {
  selectedExtensions: Map<string, import('./lib/missing-nodes').Extension>;
  conflictResolutions: Map<string, any>;
  installationOptions: any;
}

// Missing Nodes State Store
function createMissingNodesStore() {
  const initialState: MissingNodesState = {
    isDialogOpen: false,
    missingNodes: [],
    installationPlan: null,
    conflictAnalysis: null
  };

  const { subscribe, set, update } = writable<MissingNodesState>(initialState);

  return {
    subscribe,
    set,
    update
  };
}

// Installation Progress Store
function createInstallationProgressStore() {
  const initialState: InstallationProgressState = {
    isInstalling: false,
    currentExtension: null,
    progress: 0,
    queue: [],
    errors: []
  };

  const { subscribe, set, update } = writable<InstallationProgressState>(initialState);

  return {
    subscribe,
    set,
    update
  };
}

// User Selections Store
function createUserSelectionsStore() {
  const initialState: UserSelectionsState = {
    selectedExtensions: new Map(),
    conflictResolutions: new Map(),
    installationOptions: {}
  };

  const { subscribe, set, update } = writable<UserSelectionsState>(initialState);

  return {
    subscribe,
    set,
    update
  };
}

export const missingNodesState = createMissingNodesStore();
export const installationProgress = createInstallationProgressStore();
export const userSelections = createUserSelectionsStore();


export type InstallationStatus = 
  | "idle" 
  | "detecting" 
  | "installing" 
  | "restarting"  // NEW
  | "complete" 
  | "error";

export interface InstallationState {
  status: InstallationStatus;
  isInstalling: boolean;
  totalExtensions: number;
  completedExtensions: number;
  currentExtension?: string;
  currentOperation: string;
  errors: InstallationError[];
  estimatedTimeRemaining: number;
  needsRestart: boolean;
  installationQueue: ExtensionSelection[];
  completedExtensions: string[];
  failedExtensions: string[];
  isRestarting: boolean;
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

export interface ExtensionSelection {
  extensionId: string;
  version: string;
  nodeType: string;
  gitUrl: string;
  title?: string;
  author?: string;
}

// Status messages for UI display
export const INSTALLATION_STATUS_MESSAGES = {
  idle: "Ready to install extensions",
  detecting: "Detecting missing nodes...",
  installing: "Installing extensions...",
  restarting: "Restarting ComfyUI...",  // NEW
  complete: "Installation complete!",
  error: "Installation failed"
};

function createInstallationStateStore() {
  const initialState: InstallationState = {
    status: "idle",
    isInstalling: false,
    totalExtensions: 0,
    completedExtensions: 0,
    currentExtension: undefined,
    currentOperation: 'Ready',
    errors: [],
    estimatedTimeRemaining: 0,
    needsRestart: false,
    installationQueue: [],
    completedExtensions: [],
    failedExtensions: [],
    isRestarting: false
  };

  const { subscribe, set, update } = writable<InstallationState>(initialState);

  return {
    subscribe,
    set,
    update,
    
    // Start installation process
    startInstallation: (queue: ExtensionSelection[]) => {
      update(state => ({
        ...state,
        isInstalling: true,
        totalExtensions: queue.length,
        completedExtensions: 0,
        currentOperation: 'Starting installation...',
        installationQueue: queue,
        errors: [],
        completedExtensions: [],
        failedExtensions: []
      }));
    },
    
    // Update progress
    updateProgress: (completed: number, current?: string, operation?: string) => {
      update(state => ({
        ...state,
        completedExtensions: completed,
        currentExtension: current,
        currentOperation: operation || state.currentOperation,
        estimatedTimeRemaining: state.totalExtensions > 0 
          ? ((state.totalExtensions - completed) * 30000) // 30s per extension
          : 0
      }));
    },
    
    // Add error
    addError: (error: InstallationError) => {
      update(state => ({
        ...state,
        errors: [...state.errors, error]
      }));
    },
    
    // Complete installation
    completeInstallation: (successful: string[], failed: string[]) => {
      update(state => ({
        ...state,
        isInstalling: false,
        currentOperation: failed.length > 0 
          ? `Installation completed with ${failed.length} errors`
          : 'Installation completed successfully',
        needsRestart: successful.length > 0,
        completedExtensions: successful,
        failedExtensions: failed
      }));
    },
    
    // Start restart process
    startRestart: () => {
      update(state => ({
        ...state,
        status: "restarting",
        isRestarting: true,
        currentOperation: INSTALLATION_STATUS_MESSAGES.restarting
      }));
    },
    
    // Complete restart process
    completeRestart: () => {
      update(state => ({
        ...state,
        status: "complete",
        isRestarting: false,
        needsRestart: false,
        currentOperation: "ComfyUI restarted successfully!"
      }));
    },
    
    // Restart failed
    restartFailed: (error: string) => {
      update(state => ({
        ...state,
        status: "error",
        isRestarting: false,
        currentOperation: `Restart failed: ${error}`
      }));
    },
    
    // Reset state
    reset: () => {
      set(initialState);
    },
    
    // Mark restart as completed (legacy)
    restartCompleted: () => {
      update(state => ({
        ...state,
        needsRestart: false,
        currentOperation: 'Ready'
      }));
    }
  };
}

export const installationState = createInstallationStateStore();

// Missing Nodes Dialog State
export interface MissingNodesDialogState {
  isOpen: boolean;
  missingNodePlan: import('./lib/missing-nodes').MissingNodePlan | null;
  userSelections: Record<string, string>; // nodeType -> extensionId
  showConflictDialog: boolean;
  conflictResolutions: Record<string, any>;
}

function createMissingNodesDialogStore() {
  const initialState: MissingNodesDialogState = {
    isOpen: false,
    missingNodePlan: null,
    userSelections: {},
    showConflictDialog: false,
    conflictResolutions: {}
  };

  const { subscribe, set, update } = writable<MissingNodesDialogState>(initialState);

  return {
    subscribe,
    set,
    update,
    
    // Open dialog with missing node plan
    openDialog: (plan: import('./lib/missing-nodes').MissingNodePlan) => {
      update(state => ({
        ...state,
        isOpen: true,
        missingNodePlan: plan,
        userSelections: { ...plan.recommendedSelections },
        showConflictDialog: false,
        conflictResolutions: {}
      }));
    },
    
    // Close dialog
    closeDialog: () => {
      update(state => ({
        ...state,
        isOpen: false,
        missingNodePlan: null,
        userSelections: {},
        showConflictDialog: false,
        conflictResolutions: {}
      }));
    },
    
    // Update user selection for a node type
    updateSelection: (nodeType: string, extensionId: string) => {
      update(state => ({
        ...state,
        userSelections: {
          ...state.userSelections,
          [nodeType]: extensionId
        }
      }));
    },
    
    // Show conflict resolution dialog
    showConflicts: () => {
      update(state => ({
        ...state,
        showConflictDialog: true
      }));
    },
    
    // Hide conflict resolution dialog
    hideConflicts: () => {
      update(state => ({
        ...state,
        showConflictDialog: false
      }));
    }
  };
}

export const missingNodesDialog = createMissingNodesDialogStore();

// Generation state store for stop functionality
export const generationState = writable<{
  isGenerating: boolean;
  currentPromptId?: string;
}>({
  isGenerating: false,
  currentPromptId: undefined
});

// Saved workflows store (localStorage for permanent storage)
function createSavedWorkflowsStore() {
  const STORAGE_KEY = 'comfyweb_saved_workflows';
  
  let initialValue: import('./lib/workflow-storage').WorkflowMetadata[] = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        initialValue = parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to restore saved workflows:', error);
  }

  const { subscribe, set, update } = writable(initialValue);

  return {
    subscribe,
    set: (value: import('./lib/workflow-storage').WorkflowMetadata[]) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to save workflows list:', error);
      }
      set(value);
    },
    update: (updater: (value: import('./lib/workflow-storage').WorkflowMetadata[]) => import('./lib/workflow-storage').WorkflowMetadata[]) => {
      update((current) => {
        const newValue = updater(current);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
        } catch (error) {
          console.warn('Failed to save workflows list:', error);
        }
        return newValue;
      });
    }
  };
}

export const savedWorkflows = createSavedWorkflowsStore();

// Workflow Documentation Store
export const workflowDocumentation = writable<WorkflowDoc[]>([]);

// Enhanced Gallery State Management for ComfyUI History Integration
export interface GalleryHistoryState {
  promptHistory: string[];  // Array of prompt IDs
  images: import('./lib/gallery-api').GalleryImage[];
  loading: boolean;
  lastRefresh: number;
  errors: string[];
}

function createGalleryHistoryStore() {
  const STORAGE_KEY = 'comfyweb_gallery_history';
  
  // Try to restore from localStorage for persistence
  let initialState: GalleryHistoryState = {
    promptHistory: [],
    images: [],
    loading: false,
    lastRefresh: 0,
    errors: []
  };
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        initialState = {
          promptHistory: Array.isArray(parsed.promptHistory) ? parsed.promptHistory : [],
          images: Array.isArray(parsed.images) ? parsed.images : [],
          loading: false, // Always start as not loading
          lastRefresh: parsed.lastRefresh || 0,
          errors: Array.isArray(parsed.errors) ? parsed.errors : []
        };
      }
    }
  } catch (error) {
    console.warn('[Gallery] Failed to restore gallery history:', error);
  }

  const { subscribe, set, update } = writable<GalleryHistoryState>(initialState);

  // Save to localStorage on changes (excluding loading state)
  const saveToStorage = (state: GalleryHistoryState) => {
    try {
      const toSave = {
        promptHistory: state.promptHistory,
        images: state.images,
        lastRefresh: state.lastRefresh,
        errors: state.errors
        // Don't save loading state
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[Gallery] Storage quota exceeded, clearing old data');
        localStorage.removeItem(STORAGE_KEY);
      } else {
        console.warn('[Gallery] Failed to save gallery history:', error);
      }
    }
  };

  return {
    subscribe,
    set: (value: GalleryHistoryState) => {
      saveToStorage(value);
      set(value);
    },
    update: (updater: (value: GalleryHistoryState) => GalleryHistoryState) => {
      update((current) => {
        const newValue = updater(current);
        saveToStorage(newValue);
        return newValue;
      });
    },
    
    // Gallery-specific methods
    addPromptId: (promptId: string) => {
      update(state => {
        if (!state.promptHistory.includes(promptId)) {
          const newState = {
            ...state,
            promptHistory: [promptId, ...state.promptHistory].slice(0, 100) // Keep max 100 prompts
          };
          saveToStorage(newState);
          return newState;
        }
        return state;
      });
    },
    
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, loading }));
    },
    
    setImages: (images: import('./lib/gallery-api').GalleryImage[]) => {
      update(state => {
        const newState = {
          ...state,
          images,
          lastRefresh: Date.now(),
          errors: [] // Clear errors on successful load
        };
        saveToStorage(newState);
        return newState;
      });
    },
    
    addError: (error: string) => {
      update(state => {
        const newState = {
          ...state,
          errors: [...state.errors, error].slice(-5) // Keep max 5 errors
        };
        saveToStorage(newState);
        return newState;
      });
    },
    
    clearErrors: () => {
      update(state => {
        const newState = { ...state, errors: [] };
        saveToStorage(newState);
        return newState;
      });
    },
    
    removeImage: (filename: string) => {
      update(state => {
        const newState = {
          ...state,
          images: state.images.filter(img => img.filename !== filename)
        };
        saveToStorage(newState);
        return newState;
      });
    }
  };
}

export const galleryHistory = createGalleryHistoryStore();

// Gallery management utility functions
export async function refreshGalleryImages(): Promise<void> {
  const { loadGalleryImages } = await import('./lib/gallery-api');
  const currentState = get(galleryHistory);
  
  if (currentState.promptHistory.length === 0) {
    console.log('[Gallery] No prompts in history, nothing to refresh');
    return;
  }
  
  galleryHistory.setLoading(true);
  galleryHistory.clearErrors();
  
  try {
    console.log(`[Gallery] Refreshing gallery for ${currentState.promptHistory.length} prompts`);
    const result = await loadGalleryImages(currentState.promptHistory);
    
    galleryHistory.setImages(result.images);
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => galleryHistory.addError(error));
    }
    
    console.log(`[Gallery] Refresh complete: ${result.images.length} images loaded, ${result.errors.length} errors`);
  } catch (error) {
    console.error('[Gallery] Failed to refresh gallery:', error);
    galleryHistory.addError(`Failed to refresh gallery: ${error.message}`);
  } finally {
    galleryHistory.setLoading(false);
  }
}

export function addPromptToGallery(promptId: string): void {
  console.log('[Gallery] Adding prompt to gallery tracking:', promptId);
  galleryHistory.addPromptId(promptId);
}

// Import get function for accessing store values
import { get } from 'svelte/store';

// Session persistence utilities
export function clearComfyWebSession(): void {
  try {
    sessionStorage.removeItem('comfyweb_workflow_session');
    // Note: gallery now uses localStorage (galleryHistory), not sessionStorage
    console.info('ComfyWeb session data cleared');
  } catch (error) {
    console.warn('Failed to clear session data:', error);
  }
}

export function hasSessionData(): boolean {
  try {
    return !!(sessionStorage.getItem('comfyweb_workflow_session'));
  } catch (error) {
    return false;
  }
}
