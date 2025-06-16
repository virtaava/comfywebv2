import { getWsUrl, getImageUrl } from "./api";
import { Message } from "./comfy";
import { errorMessage, infoMessage, serverHost, generationState, addPromptToGallery } from "../stores";
import { get } from "svelte/store";

export function spawnWebSocketListener(host: string): WebSocket {
  const ws = new WebSocket(getWsUrl(host));

  ws.addEventListener("open", () => {
    infoMessage.set("Established a WebSocket connection to the ComfyUI server");
  });

  ws.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    
    // Handle WebSocket messages for generation state tracking
    if (Message.isProgress(payload)) {
      // Progress updates - just log for now
      console.log('[WebSocket] Progress:', payload.data.value, '/', payload.data.max);
    } else if (Message.isExecuting(payload)) {
      // Execution started
      console.log('[WebSocket] Executing node:', payload.data.node);
    } else if (Message.isExecuted(payload)) {
      // Execution completed - images are now available in ComfyUI history
      console.log('[WebSocket] Execution completed for prompt:', payload.data.prompt_id);
      
      // Reset generation state when this prompt completes
      const currentState = get(generationState);
      if (currentState.currentPromptId === payload.data.prompt_id) {
        generationState.set({
          isGenerating: false,
          currentPromptId: undefined
        });
        
        // Trigger gallery refresh to show new images
        // The images will be loaded from ComfyUI history API
        setTimeout(() => {
          // Import refreshGalleryImages dynamically to avoid circular imports
          import('../stores').then(({ refreshGalleryImages }) => {
            refreshGalleryImages();
          });
        }, 1000); // Wait a bit for ComfyUI to update its history
      }
    } else if (Message.isExecutionError(payload)) {
      // Execution failed
      console.error('[WebSocket] Execution error:', payload.data);
      
      // Reset generation state on error too
      const currentState = get(generationState);
      if (currentState.currentPromptId === payload.data.prompt_id) {
        generationState.set({
          isGenerating: false,
          currentPromptId: undefined
        });
      }
    }
  });

  ws.addEventListener("close", () => {
    errorMessage.set(
      "Disconnected from websocket. Check if the ComfyUI server is running and refresh the page.",
    );
  });

  return ws;
}
