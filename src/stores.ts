import { readable, writable, type Readable, type Writable } from "svelte/store";
import type { DeepReadonly } from "ts-essentials";

import { getObjectInfoUrl, patchLibrary } from "./lib/api";
import type { NodeLibrary } from "./lib/comfy";
import type { GalleryItem } from "./lib/gallery";
import type { WorkflowItem } from "./lib/workflow";

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