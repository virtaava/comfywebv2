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

export const gallery: Writable<Record<string, GalleryItem>> = writable({});

// Session-persistent workflow store
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
      // Save to sessionStorage on every change
      try {
        if (value.length > 0) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.warn('Failed to save workflow to session:', error);
      }
      set(value);
    },
    update: (updater: (value: WorkflowItem[]) => WorkflowItem[]) => {
      update((current) => {
        const newValue = updater(current);
        // Save to sessionStorage
        try {
          if (newValue.length > 0) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(newValue));
          } else {
            sessionStorage.removeItem(SESSION_KEY);
          }
        } catch (error) {
          console.warn('Failed to save workflow to session:', error);
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