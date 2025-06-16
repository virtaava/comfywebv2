/**
 * ComfyWeb Gallery API - ComfyUI History Integration
 * 
 * Provides gallery functionality using ComfyUI's history API endpoints
 * Compatible with our dynamic serverHost system and error handling patterns
 */

import { get } from 'svelte/store';
import { serverHost } from '../stores';

export interface GalleryImage {
  promptId: string;
  filename: string;
  subfolder: string;
  url: string;
  timestamp: number;
  nodeId: string;
  type: 'output' | 'temp';
}

export interface GalleryAPIResult {
  images: GalleryImage[];
  errors: string[];
}

export interface PromptHistoryData {
  [promptId: string]: {
    prompt: any[];
    outputs: {
      [nodeId: string]: {
        images?: Array<{
          filename: string;
          subfolder: string;
          type: string;
        }>;
      };
    };
    status: {
      status_str: string;
      completed: boolean;
      messages: string[];
    };
  };
}

export class GalleryAPI {
  private serverHost: string;

  constructor(serverHost?: string) {
    this.serverHost = serverHost || get(serverHost) || '127.0.0.1:8188';
    // Ensure serverHost includes http:// prefix
    if (!this.serverHost.startsWith('http://') && !this.serverHost.startsWith('https://')) {
      this.serverHost = `http://${this.serverHost}`;
    }
  }

  /**
   * Load images for multiple prompt IDs using ComfyUI history API
   */
  async loadImagesForPrompts(promptIds: string[]): Promise<GalleryAPIResult> {
    const allImages: GalleryImage[] = [];
    const errors: string[] = [];

    for (const promptId of promptIds) {
      try {
        const promptImages = await this.loadImagesForPrompt(promptId);
        allImages.push(...promptImages);
      } catch (error) {
        const errorMessage = `Failed to load images for prompt ${promptId}: ${error.message}`;
        console.warn('[Gallery API]', errorMessage);
        errors.push(errorMessage);
      }
    }

    // Sort by timestamp (newest first)
    allImages.sort((a, b) => b.timestamp - a.timestamp);

    return {
      images: allImages,
      errors
    };
  }

  /**
   * Load images for a single prompt ID
   */
  private async loadImagesForPrompt(promptId: string): Promise<GalleryImage[]> {
    // Try both API endpoints - ComfyUI supports both /api/history/{id} and /history/{id}
    const urls = [
      `${this.serverHost}/api/history/${promptId}`,
      `${this.serverHost}/history/${promptId}`
    ];
    
    for (const url of urls) {
      try {
        console.log(`[Gallery API] Trying endpoint: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`[Gallery API] Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`[Gallery API] Prompt ${promptId} not found at ${url}`);
            continue; // Try next URL
          }
          throw new Error(`History API returned ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        console.log(`[Gallery API] Content-Type: ${contentType}`);
        
        if (!contentType || !contentType.includes('application/json')) {
          // Log the actual response content for debugging
          const responseText = await response.text();
          console.warn(`[Gallery API] Expected JSON but got ${contentType} for prompt ${promptId}`);
          console.warn(`[Gallery API] Response content preview:`, responseText.substring(0, 200));
          
          // If it's HTML, this endpoint doesn't exist - try next one
          if (contentType && contentType.includes('text/html')) {
            continue;
          }
          return [];
        }

        const historyData: PromptHistoryData = await response.json();
        
        if (!historyData[promptId]) {
          console.warn('[Gallery API] No history data found for prompt:', promptId);
          return [];
        }

        const images = this.parseHistoryResponse(historyData[promptId], promptId);
        console.log(`[Gallery API] ✅ Loaded ${images.length} images for prompt ${promptId} from ${url}`);
        
        return images;
      } catch (error) {
        console.warn(`[Gallery API] Failed to load from ${url}:`, error.message);
        if (error instanceof SyntaxError) {
          console.warn(`[Gallery API] Invalid JSON response for prompt ${promptId}:`, error.message);
          continue; // Try next URL
        }
        // For network errors, continue trying other URLs
        continue;
      }
    }
    
    // If we get here, all URLs failed
    console.error(`[Gallery API] All endpoints failed for prompt ${promptId}`);
    return [];
  }

  /**
   * Parse ComfyUI history response and extract image information
   */
  private parseHistoryResponse(promptData: any, promptId: string): GalleryImage[] {
    const images: GalleryImage[] = [];

    if (!promptData.outputs) {
      console.warn(`[Gallery API] No outputs found for prompt ${promptId}`);
      return images;
    }

    // Get timestamp from status or use current time as fallback
    const timestamp = this.extractTimestamp(promptData);

    // Iterate through all node outputs
    for (const [nodeId, nodeOutput] of Object.entries(promptData.outputs)) {
      const output = nodeOutput as any;
      
      if (output.images && Array.isArray(output.images)) {
        for (const imageInfo of output.images) {
          const image: GalleryImage = {
            promptId,
            filename: imageInfo.filename,
            subfolder: imageInfo.subfolder || '',
            url: this.buildImageURL(imageInfo.filename, imageInfo.subfolder || '', imageInfo.type || 'output'),
            timestamp,
            nodeId,
            type: (imageInfo.type as 'output' | 'temp') || 'output'
          };
          
          images.push(image);
        }
      }
    }

    return images;
  }

  /**
   * Build image URL for ComfyUI view endpoint
   */
  private buildImageURL(filename: string, subfolder: string, type: string = 'output'): string {
    const params = new URLSearchParams({
      filename: filename,
      type: type
    });

    if (subfolder) {
      params.append('subfolder', subfolder);
    }

    return `${this.serverHost}/view?${params.toString()}`;
  }

  /**
   * Extract timestamp from prompt data
   */
  private extractTimestamp(promptData: any): number {
    // Try to extract timestamp from various possible locations
    if (promptData.status?.completed_at) {
      return new Date(promptData.status.completed_at).getTime();
    }
    
    if (promptData.status?.started_at) {
      return new Date(promptData.status.started_at).getTime();
    }

    // Fallback to current time
    return Date.now();
  }

  /**
   * Load metadata for a specific prompt (for future enhancements)
   */
  async loadPromptMetadata(promptId: string): Promise<any> {
    const urls = [
      `${this.serverHost}/api/history/${promptId}`,
      `${this.serverHost}/history/${promptId}`
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          continue;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          continue;
        }

        const data = await response.json();
        return data[promptId] || null;
      } catch (error) {
        console.warn(`[Gallery API] Failed to load metadata from ${url}:`, error);
        continue;
      }
    }
    
    console.warn('[Gallery API] Failed to load metadata for prompt:', promptId);
    return null;
  }

  /**
   * Test connectivity to ComfyUI server
   */
  async testConnection(): Promise<boolean> {
    const urls = [
      `${this.serverHost}/api/history?max_items=1`,
      `${this.serverHost}/history?max_items=1`
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          console.log(`[Gallery API] ✅ Connection test successful: ${url}`);
          return true;
        }
      } catch (error) {
        console.warn(`[Gallery API] Connection test failed for ${url}:`, error);
      }
    }
    
    console.warn('[Gallery API] All connection tests failed');
    return false;
  }
}

/**
 * Create gallery API instance using current serverHost
 */
export function createGalleryAPI(): GalleryAPI {
  const currentHost = get(serverHost);
  return new GalleryAPI(currentHost);
}

/**
 * Utility function for quick image loading
 */
export async function loadGalleryImages(promptIds: string[]): Promise<GalleryAPIResult> {
  console.log(`[Gallery] Loading images for ${promptIds.length} prompt(s):`, promptIds);
  const api = createGalleryAPI();
  const result = await api.loadImagesForPrompts(promptIds);
  console.log(`[Gallery] Loaded ${result.images.length} images, ${result.errors.length} errors`);
  return result;
}
