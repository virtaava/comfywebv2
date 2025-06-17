import type { DeepReadonly } from "ts-essentials";
import type { WorkflowStep } from "./workflow";
import * as R from "remeda";

export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  dateCreated: Date;
  dateModified: Date;
  steps: WorkflowStep[];
  thumbnail?: string; // Base64 encoded preview
  tags?: string[];
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  dateCreated: Date;
  dateModified: Date;
  stepCount: number;
  tags?: string[];
}

export class WorkflowStorageManager {
  private readonly STORAGE_KEY = 'comfyweb_saved_workflows';
  private readonly METADATA_KEY = 'comfyweb_workflow_metadata';
  private readonly APPDATA_BASE_URL = '/api/storage'; // AppData API endpoint

  /**
   * Check if AppData storage is available
   */
  private async isAppDataAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.APPDATA_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.warn('📂 [AppData] Storage not available, using localStorage fallback');
      return false;
    }
  }

  /**
   * Save workflow to AppData storage
   */
  private async saveToAppData(workflow: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.APPDATA_BASE_URL}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });
      
      if (response.ok) {
        console.log('💾 [AppData] Workflow saved to AppData:', workflow.id);
        return true;
      } else {
        console.warn('⚠️ [AppData] Save failed, status:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ [AppData] Save error:', error);
      return false;
    }
  }

  /**
   * Load workflows from AppData storage
   */
  private async loadFromAppData(): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.APPDATA_BASE_URL}/workflows`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📂 [AppData] Raw API response:', { hasSuccess: 'success' in result, hasData: 'data' in result, isArray: Array.isArray(result) });
        
        // Handle different response formats
        let workflowArray;
        if (result.success && Array.isArray(result.data)) {
          // New format: { success: true, data: [...] }
          workflowArray = result.data;
          console.log('📂 [AppData] Using new API format with data wrapper');
        } else if (Array.isArray(result)) {
          // Direct array format: [...]
          workflowArray = result;
          console.log('📂 [AppData] Using direct array format');
        } else {
          // Assume it's already a Record<string, object>
          console.log('📂 [AppData] Using Record format');
          return result;
        }
        
        // Convert array to Record<string, object>
        const workflows = {};
        for (const workflow of workflowArray) {
          if (workflow && workflow.id) {
            workflows[workflow.id] = workflow;
          }
        }
        
        console.log('📂 [AppData] Loaded workflows from AppData:', Object.keys(workflows).length);
        console.log('📂 [AppData] Sample workflow structure:', Object.keys(workflows)[0] ? Object.keys(workflows[Object.keys(workflows)[0]]) : 'none');
        return workflows;
      } else {
        console.warn('⚠️ [AppData] Load failed, status:', response.status);
        return {};
      }
    } catch (error) {
      console.warn('⚠️ [AppData] Load error:', error);
      return {};
    }
  }

  /**
   * Migrate existing localStorage data to AppData
   */
  private async migrateToAppData(): Promise<void> {
    console.log('🔄 [Migration] Starting localStorage to AppData migration...');
    
    const localWorkflows = this.getLocalStorageWorkflows();
    if (Object.keys(localWorkflows).length === 0) {
      console.log('📂 [Migration] No localStorage workflows to migrate');
      return;
    }
    
    console.log(`🔄 [Migration] Migrating ${Object.keys(localWorkflows).length} workflows to AppData`);
    
    let migrated = 0;
    for (const [id, workflow] of Object.entries(localWorkflows)) {
      const success = await this.saveToAppData(workflow);
      if (success) {
        migrated++;
        console.log(`✅ [Migration] Migrated workflow: ${workflow.name}`);
      } else {
        console.warn(`❌ [Migration] Failed to migrate workflow: ${workflow.name}`);
      }
    }
    
    console.log(`🔄 [Migration] Migration complete: ${migrated}/${Object.keys(localWorkflows).length} workflows migrated`);
    
    if (migrated > 0) {
      // Mark migration as completed
      localStorage.setItem('comfyweb_appdata_migrated', 'true');
    }
  }

  /**
   * Get workflows from localStorage only (for migration and fallback)
   */
  private getLocalStorageWorkflows(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return {};
      
      const parsed = JSON.parse(data);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      console.error('❌ [localStorage] Failed to load workflows:', error);
      return {};
    }
  }

  /**
   * Serialize workflow steps for localStorage
   */
  private serializeWorkflowSteps(steps: DeepReadonly<WorkflowStep[]>): any[] {
    console.log('🔧 [Serialization] Converting steps to serializable format:', steps.length);
    
    return steps.map((step, index) => {
      try {
        // Create a plain object with all necessary properties
        const serializedStep = {
          // Core properties that should always exist
          id: step.id || `step_${index}`,
          nodeType: step.nodeType || 'Unknown',
          
          // Handle inputs - convert Map to Object if needed
          inputs: step.inputs ? 
            (step.inputs instanceof Map ? 
              Object.fromEntries(step.inputs) : 
              step.inputs
            ) : {},
          
          // Handle outputs - convert Map to Object if needed  
          outputs: step.outputs ?
            (step.outputs instanceof Map ?
              Object.fromEntries(step.outputs) :
              step.outputs
            ) : {},
          
          // Other properties
          position: step.position || { x: 0, y: 0 },
          size: step.size || { width: 200, height: 100 },
          
          // Copy any other enumerable properties
          ...Object.fromEntries(
            Object.entries(step).filter(([key, value]) => 
              !['inputs', 'outputs'].includes(key) && 
              typeof value !== 'function' &&
              value !== undefined
            )
          )
        };
        
        console.log(`🔧 [Serialization] Step ${index}: ${serializedStep.nodeType}`);
        return serializedStep;
      } catch (error) {
        console.error(`🚨 [Serialization] Failed to serialize step ${index}:`, error);
        // Return a minimal step to prevent total failure
        return {
          id: `step_${index}`,
          nodeType: 'Unknown',
          inputs: {},
          outputs: {},
          position: { x: 0, y: 0 },
          size: { width: 200, height: 100 }
        };
      }
    });
  }

  /**
   * Deserialize workflow steps from localStorage
   */
  private deserializeWorkflowSteps(stepsData: any[]): WorkflowStep[] {
    console.log('🔧 [Deserialization] Converting serialized data back to WorkflowStep objects:', stepsData.length);
    
    return stepsData.map((stepData, index) => {
      try {
        // Create a new WorkflowStep-like object
        const step = {
          id: stepData.id || `step_${index}`,
          nodeType: stepData.nodeType || 'Unknown',
          inputs: stepData.inputs ? new Map(Object.entries(stepData.inputs)) : new Map(),
          outputs: stepData.outputs ? new Map(Object.entries(stepData.outputs)) : new Map(),
          position: stepData.position || { x: 0, y: 0 },
          size: stepData.size || { width: 200, height: 100 },
          
          // Copy other properties
          ...Object.fromEntries(
            Object.entries(stepData).filter(([key]) => 
              !['inputs', 'outputs'].includes(key)
            )
          )
        } as WorkflowStep;
        
        console.log(`🔧 [Deserialization] Step ${index}: ${step.nodeType}`);
        return step;
      } catch (error) {
        console.error(`🚨 [Deserialization] Failed to deserialize step ${index}:`, error);
        // Return a minimal step to prevent total failure
        return {
          id: `step_${index}`,
          nodeType: 'Unknown',
          inputs: new Map(),
          outputs: new Map(),
          position: { x: 0, y: 0 },
          size: { width: 200, height: 100 }
        } as WorkflowStep;
      }
    });
  }

  /**
   * Save a workflow to local storage
   */
  async saveWorkflow(
    name: string,
    steps: DeepReadonly<WorkflowStep[]>,
    description?: string,
    tags?: string[]
  ): Promise<string> {
    console.log('📋 [Workflow Storage] Saving workflow with dual storage:', { name, stepCount: steps.length, description });
    
    // CRITICAL: Pre-save validation
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Cannot save workflow: steps array is empty or invalid');
    }
    
    // Validate each step has required properties
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step || typeof step !== 'object') {
        throw new Error(`Cannot save workflow: step ${i} is invalid`);
      }
      if (!step.nodeType) {
        console.warn(`Warning: step ${i} missing nodeType, will default to 'Unknown'`);
      }
    }
    
    console.log('✅ [Pre-save] Steps validation passed for', steps.length, 'steps');
    
    const id = this.generateWorkflowId();
    const now = new Date();
    
    try {
      // Serialize steps using enhanced method
      const serializedSteps = this.serializeWorkflowSteps(steps);
      console.log('📋 [Workflow Storage] Serialized steps successfully:', serializedSteps.length);
      
      const workflow = {
        id,
        name,
        description,
        dateCreated: now.toISOString(),
        dateModified: now.toISOString(),
        steps: serializedSteps, // CRITICAL: Ensure steps are included
        stepCount: steps.length,
        tags
      };

      // CRITICAL: Verify steps are in the object before proceeding
      if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        throw new Error(`Critical: Steps array missing or empty in workflow object. Expected ${steps.length} steps.`);
      }

      console.log('📋 [Workflow Storage] Created workflow object:', { 
        id: workflow.id, 
        name: workflow.name, 
        hasSteps: Array.isArray(workflow.steps),
        stepCount: workflow.steps?.length || 0,
        stepsPreview: workflow.steps?.slice(0, 2), // Show first 2 steps for debugging
        allKeys: Object.keys(workflow)
      });

      // DUAL STORAGE: Try AppData first, then localStorage
      const appDataAvailable = await this.isAppDataAvailable();
      let appDataSuccess = false;
      
      if (appDataAvailable) {
        appDataSuccess = await this.saveToAppData(workflow);
      }
      
      // Always save to localStorage as backup
      const workflows = await this.getAllWorkflows(true); // Skip migration during save
      workflows[id] = workflow;
      
      console.log('🔍 [Save Debug] Workflow before stringifying:', {
        id: workflow.id,
        hasSteps: Array.isArray(workflow.steps),
        stepCount: workflow.steps?.length || 0,
        allKeys: Object.keys(workflow),
        stepsSerializable: (() => {
          try {
            JSON.stringify(workflow.steps);
            return true;
          } catch (error) {
            console.error('🚨 [Serialization] Steps not serializable:', error);
            return false;
          }
        })()
      });
      
      console.log('🔍 [Save Debug] Workflow.steps sample:', workflow.steps?.slice(0, 1));
      
      // CRITICAL: Verify steps survive JSON serialization
      try {
        const testSerialized = JSON.stringify(workflow);
        const testParsed = JSON.parse(testSerialized);
        if (!Array.isArray(testParsed.steps) || testParsed.steps.length !== workflow.steps.length) {
          throw new Error(`Critical: Steps lost during JSON serialization. Before: ${workflow.steps.length}, After: ${testParsed.steps?.length || 0}`);
        }
        console.log('✅ [Serialization Test] Steps survive JSON round-trip:', testParsed.steps.length);
      } catch (error) {
        console.error('🚨 [Serialization Test] Failed:', error);
        throw error;
      }
      
      const serializedData = JSON.stringify(workflows);
      console.log('📋 [Workflow Storage] Serialized data size:', serializedData.length, 'characters');
      
      // Verify what actually got serialized
      try {
        const verifyParsed = JSON.parse(serializedData);
        const verifyWorkflow = verifyParsed[id];
        console.log('🔍 [Serialization Verify] After stringify/parse:', {
          hasSteps: Array.isArray(verifyWorkflow?.steps),
          stepCount: verifyWorkflow?.steps?.length || 0,
          allKeys: Object.keys(verifyWorkflow || {}),
          stepsProperty: 'steps' in (verifyWorkflow || {}),
          stepsValue: verifyWorkflow?.steps
        });
      } catch (error) {
        console.error('🚨 [Serialization Verify] Failed to verify:', error);
      }
      
      localStorage.setItem(this.STORAGE_KEY, serializedData);
      
      console.log('💾 [Workflow Storage] Saved to:', {
        appData: appDataSuccess,
        localStorage: true,
        primary: appDataSuccess ? 'AppData' : 'localStorage'
      });

      // CRITICAL: Comprehensive post-save verification
      const verifyData = localStorage.getItem(this.STORAGE_KEY);
      if (!verifyData || verifyData === '{}') {
        throw new Error('Workflow was not properly saved to localStorage - data is empty');
      }
      
      const verifyParsed = JSON.parse(verifyData);
      const savedWorkflow = verifyParsed[id];
      if (!savedWorkflow) {
        throw new Error(`Workflow ${id} not found in saved data`);
      }
      if (!Array.isArray(savedWorkflow.steps) || savedWorkflow.steps.length === 0) {
        throw new Error(`Critical: Steps missing from saved workflow. Expected ${steps.length}, got ${savedWorkflow.steps?.length || 0}`);
      }
      if (savedWorkflow.steps.length !== steps.length) {
        throw new Error(`Critical: Steps count mismatch. Expected ${steps.length}, saved ${savedWorkflow.steps.length}`);
      }
      
      console.log('📋 [Workflow Storage] VERIFICATION: Workflow saved with', savedWorkflow.steps.length, 'steps to localStorage');
      console.log('📋 [Workflow Storage] VERIFICATION: Saved workflow keys:', Object.keys(savedWorkflow));
      console.log('📋 [Workflow Storage] VERIFICATION: Steps sample:', savedWorkflow.steps.slice(0, 2).map(s => s.nodeType));

      // Update metadata index
      await this.updateMetadataIndex();
      console.log('📋 [Workflow Storage] Updated metadata index');
      
      // CONSOLIDATION: Trigger store update for UI reactivity
      this.triggerStoreUpdate();

      return id;
    } catch (error) {
      console.error('🚨 [Workflow Storage] Save failed:', error);
      
      // Handle localStorage quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.error('🚨 [Workflow Storage] localStorage quota exceeded!');
        throw new Error('Storage quota exceeded. Please export and clear some workflows.');
      }
      
      // Handle serialization errors
      if (error.message?.includes('circular') || error.message?.includes('Converting circular')) {
        console.error('🚨 [Workflow Storage] Circular reference detected in workflow steps');
        throw new Error('Workflow contains unsupported data structures. Please simplify the workflow.');
      }
      
      throw error;
    }
  }

  /**
   * Load a workflow by ID
   */
  async loadWorkflow(id: string): Promise<SavedWorkflow | null> {
    console.log('📂 [Workflow Storage] Loading workflow with dual storage:', id);
    
    let workflowData = null;
    
    // Try AppData first
    const appDataAvailable = await this.isAppDataAvailable();
    if (appDataAvailable) {
      const appDataWorkflows = await this.loadFromAppData();
      workflowData = appDataWorkflows[id];
      
      if (workflowData) {
        console.log('📂 [AppData] Found workflow in AppData:', id);
      }
    }
    
    // Fallback to localStorage if not found in AppData
    if (!workflowData) {
      const localWorkflows = this.getLocalStorageWorkflows();
      workflowData = localWorkflows[id];
      
      if (workflowData) {
        console.log('📂 [localStorage] Found workflow in localStorage:', id);
      }
    }
    
    if (!workflowData) {
      console.warn('❌ [Workflow Storage] Workflow not found in any storage:', id);
      return null;
    }
    
    console.log('📂 [Workflow Storage] Found workflow data:', {
      id: workflowData.id,
      name: workflowData.name,
      hasSteps: Array.isArray(workflowData.steps),
      stepCount: workflowData.steps?.length || 0,
      allKeys: Object.keys(workflowData)
    });
    
    // Validate basic structure first
    if (!this.validateBasicStructure(workflowData)) {
      console.error('❌ [Workflow Storage] Workflow failed basic structure validation:', id);
      return null;
    }
    
    // Check if steps array exists
    if (!Array.isArray(workflowData.steps) || workflowData.steps.length === 0) {
      console.error('❌ [Workflow Storage] Workflow missing steps data:', id, {
        hasSteps: Array.isArray(workflowData.steps),
        stepsLength: workflowData.steps?.length || 0,
        stepsType: typeof workflowData.steps,
        workflowKeys: Object.keys(workflowData)
      });
      return null;
    }
    
    try {
      // Deserialize steps using enhanced method
      const deserializedSteps = this.deserializeWorkflowSteps(workflowData.steps);
      console.log('📂 [Workflow Storage] Deserialized steps:', deserializedSteps.length);
      
      const workflow: SavedWorkflow = {
        id: workflowData.id,
        name: workflowData.name,
        description: workflowData.description,
        dateCreated: new Date(workflowData.dateCreated),
        dateModified: new Date(workflowData.dateModified),
        steps: deserializedSteps,
        tags: workflowData.tags
      };
      
      // Final validation of the complete workflow
      if (this.validateWorkflow(workflow)) {
        console.log('✅ [Workflow Storage] Successfully loaded workflow:', workflow.name);
        return workflow;
      } else {
        console.error('❌ [Workflow Storage] Workflow failed final validation after deserialization:', id);
        return null;
      }
    } catch (error) {
      console.error('🚨 [Workflow Storage] Failed to deserialize workflow:', id, error);
      return null;
    }
  }

  /**
   * Get all workflow metadata (for listing)
   */
  getWorkflowMetadata(): WorkflowMetadata[] {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
      if (!metadata) return [];
      
      const parsed = JSON.parse(metadata);
      return parsed.map((item: any) => ({
        ...item,
        dateCreated: new Date(item.dateCreated),
        dateModified: new Date(item.dateModified)
      }));
    } catch (error) {
      console.error('Failed to load workflow metadata:', error);
      return [];
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    // Try to delete from AppData first
    const appDataAvailable = await this.isAppDataAvailable();
    if (appDataAvailable) {
      try {
        const response = await fetch(`${this.APPDATA_BASE_URL}/workflows/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          console.log('🗑️ [AppData] Workflow deleted from AppData:', id);
        } else {
          console.warn('⚠️ [AppData] Delete failed, status:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ [AppData] Delete error:', error);
      }
    }
    
    // Always try to delete from localStorage as well
    const workflows = await this.getAllWorkflows(true); // Skip migration during delete
    if (workflows[id]) {
      delete workflows[id];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
      await this.updateMetadataIndex();
      
      // CONSOLIDATION: Trigger store update
      this.triggerStoreUpdate();
      
      return true;
    }
    return false;
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    id: string,
    updates: Partial<Pick<SavedWorkflow, 'name' | 'description' | 'steps' | 'tags'>>
  ): Promise<boolean> {
    const workflows = await this.getAllWorkflows(true); // Skip migration during update
    const workflow = workflows[id];
    
    if (!workflow) return false;

    // Update fields
    Object.assign(workflow, updates, {
      dateModified: new Date().toISOString()
    });

    // Try to save to AppData first
    const appDataAvailable = await this.isAppDataAvailable();
    if (appDataAvailable) {
      await this.saveToAppData(workflow);
    }

    // Always save to localStorage as backup
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
    await this.updateMetadataIndex();
    
    // CONSOLIDATION: Trigger store update
    this.triggerStoreUpdate();
    
    return true;
  }

  /**
   * Rename a workflow
   */
  async renameWorkflow(id: string, newName: string): Promise<boolean> {
    return await this.updateWorkflow(id, { name: newName });
  }

  /**
   * Export all workflows
   */
  async exportAllWorkflows(): Promise<string> {
    const workflows = await this.getAllWorkflows();
    return JSON.stringify(workflows, null, 2);
  }

  /**
   * Import workflows from JSON
   */
  async importWorkflows(jsonData: string): Promise<{ success: number; errors: string[] }> {
    try {
      const importedWorkflows = JSON.parse(jsonData);
      const errors: string[] = [];
      let success = 0;

      for (const [id, workflow] of Object.entries(importedWorkflows)) {
        try {
          const typedWorkflow = workflow as SavedWorkflow;
          if (this.validateWorkflow(typedWorkflow)) {
            // Generate new ID to avoid conflicts
            const newId = this.generateWorkflowId();
            typedWorkflow.id = newId;
            typedWorkflow.dateCreated = new Date(typedWorkflow.dateCreated);
            typedWorkflow.dateModified = new Date();

            // Try to save to AppData first
            const appDataAvailable = await this.isAppDataAvailable();
            if (appDataAvailable) {
              await this.saveToAppData(typedWorkflow);
            }

            // Always save to localStorage as backup
            const workflows = await this.getAllWorkflows(true); // Skip migration during import
            workflows[newId] = typedWorkflow;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
            success++;
          } else {
            errors.push(`Invalid workflow: ${id}`);
          }
        } catch (error) {
          errors.push(`Failed to import workflow ${id}: ${error.message}`);
        }
      }

      if (success > 0) {
        await this.updateMetadataIndex();
        
        // CONSOLIDATION: Trigger store update
        this.triggerStoreUpdate();
      }

      return { success, errors };
    } catch (error) {
      return { success: 0, errors: [`Invalid JSON data: ${error.message}`] };
    }
  }

  /**
   * Search workflows
   */
  searchWorkflows(query: string): WorkflowMetadata[] {
    const metadata = this.getWorkflowMetadata();
    const lowerQuery = query.toLowerCase();
    
    return metadata.filter(workflow => 
      workflow.name.toLowerCase().includes(lowerQuery) ||
      workflow.description?.toLowerCase().includes(lowerQuery) ||
      workflow.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ 
    workflowCount: number; 
    storageUsed: number; 
    storageAvailable: number;
    storageLocation: 'AppData' | 'localStorage';
  }> {
    const workflows = await this.getAllWorkflows();
    const workflowCount = Object.keys(workflows).length;
    
    const data = localStorage.getItem(this.STORAGE_KEY) || '';
    const storageUsed = new Blob([data]).size;
    
    // Check which storage is being used
    const appDataAvailable = await this.isAppDataAvailable();
    const storageLocation = appDataAvailable ? 'AppData' : 'localStorage';
    
    // Estimate available storage (5MB typical localStorage limit)
    const storageAvailable = 5 * 1024 * 1024 - storageUsed;

    return { workflowCount, storageUsed, storageAvailable, storageLocation };
  }

  /**
   * Clear all saved workflows (for debugging/cleanup)
   */
  clearAllWorkflows(): void {
    console.log('🧹 [Workflow Storage] Clearing all workflows from localStorage');
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.METADATA_KEY);
  }

  private async getAllWorkflows(skipMigration: boolean = false): Promise<Record<string, any>> {
    // Check if migration is needed and not skipped
    if (!skipMigration && !localStorage.getItem('comfyweb_appdata_migrated')) {
      const appDataAvailable = await this.isAppDataAvailable();
      if (appDataAvailable) {
        await this.migrateToAppData();
      }
    }
    
    // Try AppData first
    const appDataAvailable = await this.isAppDataAvailable();
    if (appDataAvailable) {
      const appDataWorkflows = await this.loadFromAppData();
      if (Object.keys(appDataWorkflows).length > 0) {
        console.log('📂 [AppData] Using AppData as primary storage');
        return appDataWorkflows;
      }
    }
    
    // Fallback to localStorage
    console.log('📂 [localStorage] Using localStorage as primary storage');
    return this.getLocalStorageWorkflows();
  }

  private getLocalStorageWorkflowsLegacy(): Record<string, any> {
    return this.getLocalStorageWorkflows();
  }

  /**
   * Validate basic workflow structure (used by getAllWorkflows)
   * Only checks essential properties, not steps content
   */
  private validateBasicStructure(workflow: any): boolean {
    const isValid = (
      typeof workflow === 'object' &&
      workflow !== null &&
      typeof workflow.id === 'string' &&
      typeof workflow.name === 'string' &&
      workflow.dateCreated &&
      workflow.dateModified
      // Note: NOT checking steps here - that's done during load after deserialization
    );
    
    if (!isValid) {
      console.warn('❌ [Basic Structure] Workflow failed basic validation:', workflow?.id || 'unknown');
    }
    
    return isValid;
  }

  private async updateMetadataIndex(): Promise<void> {
    const workflows = await this.getAllWorkflows(true); // Skip migration during metadata update
    console.log('🔍 [Metadata Debug] getAllWorkflows returned:', Object.keys(workflows).length, 'workflows');
    console.log('🔍 [Metadata Debug] Sample workflow keys:', Object.keys(workflows)[0] ? Object.keys(Object.values(workflows)[0]) : 'none');
    
    // CRITICAL FIX: Only create metadata, never modify main workflow storage
    const metadata: WorkflowMetadata[] = Object.values(workflows)
      .filter(workflow => {
        // Only include workflows with basic structure and steps data
        if (!this.validateBasicStructure(workflow)) {
          console.warn('Invalid workflow structure in metadata index:', workflow.id || 'unknown');
          return false;
        }
        if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
          console.warn('Workflow missing steps data in metadata index:', workflow.id || 'unknown', {
            hasStepsProperty: 'steps' in workflow,
            stepsType: typeof workflow.steps,
            isArray: Array.isArray(workflow.steps),
            stepsLength: workflow.steps?.length || 0,
            workflowKeys: Object.keys(workflow)
          });
          return false;
        }
        return true;
      })
      .map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        dateCreated: new Date(workflow.dateCreated),
        dateModified: new Date(workflow.dateModified),
        stepCount: workflow.steps?.length || 0,
        tags: workflow.tags
      }));

    // CRITICAL: Store metadata separately, preserve main workflow storage with steps
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    console.log('📋 [Metadata] Created metadata index with', metadata.length, 'workflows');
    
    // CRITICAL VERIFICATION: Ensure main workflow storage still has steps
    const mainStorage = localStorage.getItem(this.STORAGE_KEY);
    if (mainStorage) {
      const verifyWorkflows = JSON.parse(mainStorage);
      for (const [id, workflow] of Object.entries(verifyWorkflows)) {
        if (!Array.isArray((workflow as any).steps)) {
          console.error('🚨 [CRITICAL] Main storage corrupted - workflow missing steps:', id);
          throw new Error(`Main workflow storage corrupted - ${id} missing steps property`);
        }
      }
      console.log('✅ [Verification] Main storage integrity verified - all workflows have steps');
    }
  }

  /**
   * Trigger UI store updates after storage changes
   */
  private triggerStoreUpdate(): void {
    try {
      // Trigger the reactive store update
      if (typeof window !== 'undefined') {
        // Use dynamic import to avoid circular dependency
        import('../stores').then(({ triggerWorkflowStorageUpdate }) => {
          triggerWorkflowStorageUpdate();
        }).catch(error => {
          console.warn('⚠️ [Storage Trigger] Failed to trigger store update:', error);
        });
      }
    } catch (error) {
      console.warn('⚠️ [Storage Trigger] Error triggering store update:', error);
    }
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateWorkflow(workflow: any): workflow is SavedWorkflow {
    const validation = {
      hasId: typeof workflow?.id === 'string',
      hasName: typeof workflow?.name === 'string', 
      hasSteps: Array.isArray(workflow?.steps),
      stepsLength: workflow?.steps?.length || 0,
      hasDateCreated: !!workflow?.dateCreated,
      hasDateModified: !!workflow?.dateModified,
      workflowKeys: workflow ? Object.keys(workflow) : []
    };
    
    console.log('🔍 [Workflow Validation] Validating workflow:', workflow?.id || 'unknown', validation);
    
    const isValid = (
      typeof workflow === 'object' &&
      workflow !== null &&
      validation.hasId &&
      validation.hasName &&
      validation.hasSteps &&
      validation.stepsLength > 0 &&
      validation.hasDateCreated &&
      validation.hasDateModified
    );
    
    if (!isValid) {
      console.warn('❌ [Workflow Validation] Workflow failed validation:', workflow?.id || 'unknown');
      console.warn('❌ [Validation Details]:', {
        missingId: !validation.hasId,
        missingName: !validation.hasName,
        missingSteps: !validation.hasSteps,
        emptySteps: validation.stepsLength === 0,
        missingDateCreated: !validation.hasDateCreated,
        missingDateModified: !validation.hasDateModified
      });
    } else {
      console.log('✅ [Workflow Validation] Workflow passed validation:', workflow.id);
    }
    
    return isValid;
  }
}

// Singleton instance
export const workflowStorage = new WorkflowStorageManager();
