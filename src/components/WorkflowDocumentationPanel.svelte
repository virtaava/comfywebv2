<script lang="ts">
  import { Badge, Card, Accordion, AccordionItem, Button, Helper } from 'flowbite-svelte';
  import { InfoCircleSolid, CogSolid, DownloadSolid, BookOpenSolid } from 'flowbite-svelte-icons';
  import type { WorkflowDoc } from '../lib/missing-nodes';
  
  export let documentation: WorkflowDoc[] = [];
  
  const categoryIcons = {
    settings: CogSolid,
    requirements: DownloadSolid,
    instructions: BookOpenSolid,
    general: InfoCircleSolid
  };
  
  const categoryColors = {
    settings: 'blue',
    requirements: 'red', 
    instructions: 'green',
    general: 'gray'
  };
  
  const categoryLabels = {
    settings: 'Settings & Parameters',
    requirements: 'Model Requirements',
    instructions: 'Usage Instructions',
    general: 'General Information'
  };
  
  $: groupedDocs = documentation.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, WorkflowDoc[]>);
  
  $: sortedCategories = Object.keys(groupedDocs).sort((a, b) => {
    const order = { 'settings': 0, 'requirements': 1, 'instructions': 2, 'general': 3 };
    return order[a as keyof typeof order] - order[b as keyof typeof order];
  });
  
  // Parse markdown-style links for external link handling
  function parseLinks(content: string): string {
    return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (url.startsWith('http')) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1">${text} <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>`;
      }
      return `<span class="text-blue-300">${text}</span>`;
    });
  }
  
  // Format content with proper line breaks and styling
  function formatContent(content: string): string {
    let formatted = parseLinks(content);
    
    // Handle markdown headers
    formatted = formatted.replace(/^#{1,6}\s*(.+)$/gm, '<h4 class="text-lg font-semibold text-white mt-3 mb-2">$1</h4>');
    
    // Handle code blocks
    formatted = formatted.replace(/```[\s\S]*?```/g, (match) => {
      return `<pre class="bg-gray-800 p-2 rounded text-sm text-green-300 overflow-x-auto my-2">${match.replace(/```/g, '')}</pre>`;
    });
    
    // Handle inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded text-green-300">$1</code>');
    
    // Handle list items
    formatted = formatted.replace(/^[-*]\s*(.+)$/gm, '<li class="ml-4 text-gray-300">• $1</li>');
    
    // Handle bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>');
    
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }
  
  // Extract key information for quick view
  function extractKeyInfo(doc: WorkflowDoc): string[] {
    const keyInfo: string[] = [];
    
    if (doc.parsedContent) {
      if (doc.parsedContent.cfgValues.length > 0) {
        keyInfo.push(`CFG: ${doc.parsedContent.cfgValues.join(', ')}`);
      }
      if (doc.parsedContent.stepValues.length > 0) {
        keyInfo.push(`Steps: ${doc.parsedContent.stepValues.join(', ')}`);
      }
      if (doc.parsedContent.loraWeights.length > 0) {
        keyInfo.push(`LoRA info available`);
      }
      if (doc.parsedContent.modelLinks.length > 0) {
        keyInfo.push(`${doc.parsedContent.modelLinks.length} download links`);
      }
    }
    
    return keyInfo;
  }
</script>

{#if documentation.length > 0}
<Card class="mb-3 bg-gray-900 border-gray-700">
  <div class="flex items-center gap-2 mb-2">
    <InfoCircleSolid class="w-4 h-4 text-blue-400" />
    <h3 class="text-sm font-semibold text-white">Workflow Documentation</h3>
    <Badge color="blue" size="xs">{documentation.length} notes</Badge>
  </div>
  
  <Helper class="text-gray-400 mb-3 text-xs">
    This workflow includes documentation with important settings, requirements, and usage instructions.
  </Helper>
  
  <Accordion class="space-y-2">
    {#each sortedCategories as category}
      {@const docs = groupedDocs[category]}
      {@const Icon = categoryIcons[category]}
      {@const color = categoryColors[category]}
      {@const label = categoryLabels[category]}
      
      <AccordionItem class="bg-gray-800 border-gray-600 rounded-lg">
        <span slot="header" class="flex items-center gap-2 text-white w-full">
          <Icon class="w-4 h-4 flex-shrink-0" />
          <span class="font-medium">{label}</span>
          <Badge {color} size="sm" class="ml-auto">{docs.length}</Badge>
        </span>
        
        <div class="space-y-3 pt-2">
          {#each docs as doc}
            {@const keyInfo = extractKeyInfo(doc)}
            
            <div class="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium text-white text-sm">{doc.title}</h4>
                {#if keyInfo.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each keyInfo as info}
                      <Badge color="dark" size="xs" class="text-xs">{info}</Badge>
                    {/each}
                  </div>
                {/if}
              </div>
              
              <div class="prose prose-sm prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
                {@html formatContent(doc.content)}
              </div>
              
              <!-- Show structured data if available -->
              {#if doc.parsedContent && (doc.parsedContent.requirements.length > 0 || doc.parsedContent.modelLinks.length > 0)}
                <div class="mt-3 pt-3 border-t border-gray-700">
                  {#if doc.parsedContent.requirements.length > 0}
                    <div class="mb-2">
                      <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Key Requirements:</span>
                      <ul class="mt-1 space-y-1">
                        {#each doc.parsedContent.requirements.slice(0, 3) as req}
                          <li class="text-xs text-gray-400">{req}</li>
                        {/each}
                        {#if doc.parsedContent.requirements.length > 3}
                          <li class="text-xs text-gray-500">...and {doc.parsedContent.requirements.length - 3} more</li>
                        {/if}
                      </ul>
                    </div>
                  {/if}
                  
                  {#if doc.parsedContent.modelLinks.length > 0}
                    <div>
                      <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Download Links:</span>
                      <div class="mt-1 flex flex-wrap gap-1">
                        {#each doc.parsedContent.modelLinks.slice(0, 2) as link}
                          <Badge color="indigo" size="xs">
                            {@html parseLinks(link)}
                          </Badge>
                        {/each}
                        {#if doc.parsedContent.modelLinks.length > 2}
                          <Badge color="gray" size="xs">+{doc.parsedContent.modelLinks.length - 2} more</Badge>
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </AccordionItem>
    {/each}
  </Accordion>
  
  <div class="mt-3 pt-2 border-t border-gray-700">
    <Helper class="text-gray-500 text-xs">
      💡 This documentation was automatically extracted from MarkdownNote nodes in the workflow. 
      It provides valuable context for workflow configuration and usage.
    </Helper>
  </div>
</Card>
{/if}

<style>
  :global(.prose code) {
    @apply bg-gray-700 px-1 rounded text-green-300;
  }
  
  :global(.prose pre) {
    @apply bg-gray-800 p-2 rounded text-sm text-green-300 overflow-x-auto my-2;
  }
  
  :global(.prose h4) {
    @apply text-lg font-semibold text-white mt-3 mb-2;
  }
  
  :global(.prose li) {
    @apply ml-4 text-gray-300;
  }
  
  :global(.prose strong) {
    @apply text-white;
  }
  
  :global(.prose a) {
    @apply text-blue-400 hover:text-blue-300 underline;
  }
</style>