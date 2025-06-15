import { readable, writable, type Readable, type Writable } from "svelte/store";
import type { DeepReadonly } from "ts-essentials";

import { getObjectInfoUrl, patchLibrary } from "./lib/api";
import type { NodeLibrary } from "./lib/comfy";
import type { GalleryItem } from "./lib/gallery";
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

export const library: Readable<DeepReadonly<NodeLibrary>> =
  readable<NodeLibrary>({}, (set) => {
    serverHost.subscribe((host) => {
      fetch(getObjectInfoUrl(host))
        .then((resp) => {
          if (!resp.ok) throw new Error("Failed to fetch node library");
          return resp.json();
        })
        .then((resp) => {
          patchLibrary(resp);
          set(Object.freeze(resp));
        });
    });
  });

// Enhanced session-persistent gallery store
function createSessionGalleryStore() {
  const SESSION_KEY = 'comfyweb_gallery_session';
  
  // Try to restore from sessionStorage
  let initialValue: Record<string, GalleryItem> = {};
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        initialValue = parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to restore gallery from session:', error);
  }

  const { subscribe, set, update } = writable<Record<string, GalleryItem>>(initialValue);

  return {
    subscribe,
    set: (value: Record<string, GalleryItem>) => {
      // Save to sessionStorage on every change
      try {
        if (Object.keys(value).length > 0) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.warn('Session storage quota exceeded. Clearing gallery data.');
          sessionStorage.removeItem(SESSION_KEY);
        } else {
          console.warn('Failed to save gallery to session:', error);
        }
      }
      set(value);
    },
    update: (updater: (value: Record<string, GalleryItem>) => Record<string, GalleryItem>) => {
      update((current) => {
        const newValue = updater(current);
        // Save to sessionStorage with quota handling
        try {
          if (Object.keys(newValue).length > 0) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(newValue));
          } else {
            sessionStorage.removeItem(SESSION_KEY);
          }
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('Session storage quota exceeded. Clearing gallery data.');
            sessionStorage.removeItem(SESSION_KEY);
            // Continue with the update anyway
          } else {
            console.warn('Failed to save gallery to session:', error);
          }
        }
        return newValue;
      });
    }
  };
}

export const gallery = createSessionGalleryStore();

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

// Gallery tab stores with session persistence
function createSessionImagesStore() {
  const SESSION_KEY = 'comfyweb_session_images';
  
  // Try to restore from sessionStorage
  let initialValue: string[] = [];
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        initialValue = parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to restore session images:', error);
  }

  const { subscribe, set, update } = writable<string[]>(initialValue);
  
  return {
    subscribe,
    set: (value: string[]) => {
      // Save to sessionStorage
      try {
        if (value.length > 0) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.warn('Failed to save session images:', error);
      }
      set(value);
    },
    update,
    addImage: (imageUrl: string) => {
      update(images => {
        if (!images.includes(imageUrl)) {
          const newImages = [...images, imageUrl];
          // Save to sessionStorage
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(newImages));
          } catch (error) {
            console.warn('Failed to save session images:', error);
          }
          return newImages;
        }
        return images;
      });
    }
  };
}

function createOutputImagesStore() {
  const { subscribe, set, update } = writable<string[]>([]);
  
  return {
    subscribe,
    set,
    update,
    refresh: async (serverHost: string) => {
      try {
        const response = await fetch(`http://${serverHost}/output/`);
        if (response.ok) {
          const html = await response.text();
          const matches = [...html.matchAll(/href=\"([^\"]+\.(png|jpg|jpeg|webp))\"/g)];
          const urls = matches.map(match => `http://${serverHost}/output/${match[1]}`);
          set(urls.reverse()); // Most recent first
        }
      } catch (error) {
        console.warn('Failed to load output images:', error);
        set([]);
      }
    }
  };
}

export const sessionImages = createSessionImagesStore();
export const outputImages = createOutputImagesStore();

// Workflow Documentation Store
export const workflowDocumentation = writable<WorkflowDoc[]>([]);

// Session persistence utilities
export function clearComfyWebSession(): void {
  try {
    sessionStorage.removeItem('comfyweb_workflow_session');
    sessionStorage.removeItem('comfyweb_gallery_session');
    console.info('ComfyWeb session data cleared');
  } catch (error) {
    console.warn('Failed to clear session data:', error);
  }
}

export function hasSessionData(): boolean {
  try {
    return !!(sessionStorage.getItem('comfyweb_workflow_session') || 
             sessionStorage.getItem('comfyweb_gallery_session'));
  } catch (error) {
    return false;
  }
}
