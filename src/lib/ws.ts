import { getWsUrl, getImageUrl } from "./api";
import { Message } from "./comfy";
import { GalleryItem } from "./gallery";
import { errorMessage, gallery, infoMessage, sessionImages, serverHost, generationState } from "../stores";
import { get } from "svelte/store";

export function spawnWebSocketListener(host: string): WebSocket {
  const ws = new WebSocket(getWsUrl(host));

  ws.addEventListener("open", () => {
    infoMessage.set("Established a WebSocket connection to the ComfyUI server");
  });

  ws.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (Message.isProgress(payload)) {
      gallery.update((state) => {
        const existing = state[payload.data.prompt_id];
        if (existing !== undefined) {
          state[payload.data.prompt_id] = GalleryItem.newQueued(
            existing.id,
            existing.workflow,
            payload.data.value,
            payload.data.max,
            payload.data.node,
          );
        }
        return state;
      });
    } else if (Message.isExecuting(payload)) {
      gallery.update((state) => {
        const existing = state[payload.data.prompt_id];
        if (existing !== undefined && GalleryItem.isQueued(existing)) {
          existing.nodeId = payload.data.node;
        }
        return state;
      });
    } else if (Message.isExecuted(payload)) {
      gallery.update((state) => {
        const existing = state[payload.data.prompt_id];
        if (existing !== undefined) {
          const newItem = GalleryItem.newExecuted(
            existing.id,
            existing.workflow,
            payload.data.output?.images,
          );
          state[payload.data.prompt_id] = newItem;
          
          // Add generated images to session store for Gallery tab
          if (newItem.images && newItem.images.length > 0) {
            const currentHost = get(serverHost);
            newItem.images.forEach(image => {
              const imageUrl = getImageUrl(currentHost, image);
              sessionImages.addImage(imageUrl);
            });
          }
          
          // Reset generation state when this prompt completes
          const currentState = get(generationState);
          if (currentState.currentPromptId === payload.data.prompt_id) {
            generationState.set({
              isGenerating: false,
              currentPromptId: undefined
            });
          }
        }
        return state;
      });
    } else if (Message.isExecutionError(payload)) {
      gallery.update((state) => {
        const existing = state[payload.data.prompt_id];
        if (existing !== undefined) {
          state[payload.data.prompt_id] = GalleryItem.newFailed(
            existing.id,
            existing.workflow,
            payload.data.exception_message,
            payload.data.exception_type,
            payload.data.node_type,
          );
          
          // Reset generation state on error too
          const currentState = get(generationState);
          if (currentState.currentPromptId === payload.data.prompt_id) {
            generationState.set({
              isGenerating: false,
              currentPromptId: undefined
            });
          }
        }
        return state;
      });
    }
  });

  ws.addEventListener("close", () => {
    errorMessage.set(
      "Disconnected from websocket. Check if the ComfyUI server is running and refresh the page.",
    );
  });

  return ws;
}
