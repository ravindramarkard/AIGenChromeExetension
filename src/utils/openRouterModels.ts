export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt?: string;
    completion?: string;
  };
}

export async function fetchAllOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAllOpenRouterModels',
      apiKey: apiKey
    });

    if (response.success) {
      return response.models;
    } else {
      throw new Error(response.error || 'Failed to fetch OpenRouter models');
    }
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    
    // Return fallback models if API fails
    console.log('Using fallback OpenRouter models due to API error');
    return getFallbackOpenRouterModels();
  }
}

// Fallback models when API is unavailable
function getFallbackOpenRouterModels(): OpenRouterModel[] {
  return [
    { id: 'openai/gpt-4', name: 'GPT-4', context_length: 8192, pricing: {} },
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context_length: 4096, pricing: {} },
    { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', context_length: 200000, pricing: {} },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', context_length: 200000, pricing: {} },
    { id: 'meta-llama/llama-3.1-70b', name: 'Llama 3.1 70B', context_length: 128000, pricing: {} },
    { id: 'meta-llama/llama-3.1-8b', name: 'Llama 3.1 8B', context_length: 128000, pricing: {} },
    { id: 'mistralai/mistral-7b', name: 'Mistral 7B', context_length: 32000, pricing: {} },
    { id: 'google/gemini-pro', name: 'Gemini Pro', context_length: 30720, pricing: {} },
    { id: 'cohere/command-r-plus', name: 'Command R+', context_length: 128000, pricing: {} },
    { id: 'x-ai/grok-4-fast:free', name: 'Grok 4 Fast (Free)', context_length: 128000, pricing: {} },
    { id: 'x-ai/grok-beta', name: 'Grok Beta', context_length: 128000, pricing: {} },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', context_length: 64000, pricing: {} },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', context_length: 128000, pricing: {} },
    { id: 'tngtech/deepseek-r1t2-chimera:free', name: 'DeepSeek R1T2 Chimera (Free)', context_length: 128000, pricing: {} },
    { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air (Free)', context_length: 128000, pricing: {} }
  ];
}

export function formatModelName(model: OpenRouterModel): string {
  // Extract provider and model name for better display
  const parts = model.id.split('/');
  if (parts.length > 1) {
    const provider = parts[0];
    const modelName = parts.slice(1).join('/');
    return `${provider}/${modelName}`;
  }
  return model.id;
}

export function getModelProvider(modelId: string): string {
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

export function getModelDisplayName(model: OpenRouterModel): string {
  return model.name || formatModelName(model);
}

export function sortModelsByProvider(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.sort((a, b) => {
    const providerA = getModelProvider(a.id);
    const providerB = getModelProvider(b.id);
    
    if (providerA !== providerB) {
      return providerA.localeCompare(providerB);
    }
    
    return a.id.localeCompare(b.id);
  });
}

export function groupModelsByProvider(models: OpenRouterModel[]): Record<string, OpenRouterModel[]> {
  return models.reduce((groups, model) => {
    const provider = getModelProvider(model.id);
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(model);
    return groups;
  }, {} as Record<string, OpenRouterModel[]>);
}

// Debug function to search for specific models
export function searchModels(models: OpenRouterModel[], searchTerm: string): OpenRouterModel[] {
  return models.filter(model => 
    model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

// Debug function to log all model IDs
export function logAllModelIds(models: OpenRouterModel[]): void {
  console.log('All OpenRouter Model IDs:');
  models.forEach((model, index) => {
    console.log(`${index + 1}. ${model.id} (${model.name})`);
  });
}

// Function to get all free models from OpenRouter
export function getFreeModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter(model => {
    const id = model.id.toLowerCase();
    const name = model.name.toLowerCase();
    
    // Check for free indicators in model ID or name
    return id.includes(':free') || 
           id.includes('free') || 
           name.includes('free') ||
           id.includes('grok-4-fast:free') ||
           id.includes('glm-4.5-air:free') ||
           id.includes('deepseek-r1t2-chimera:free') ||
           // Check pricing - if both prompt and completion are 0 or undefined
           (model.pricing && 
            (model.pricing.prompt === '0' || model.pricing.prompt === 0 || !model.pricing.prompt) &&
            (model.pricing.completion === '0' || model.pricing.completion === 0 || !model.pricing.completion));
  });
}

// Function to get models with specific pricing
export function getModelsByPricing(models: OpenRouterModel[], maxPromptPrice: number = 0, maxCompletionPrice: number = 0): OpenRouterModel[] {
  return models.filter(model => {
    if (!model.pricing) return false;
    
    const promptPrice = parseFloat(model.pricing.prompt?.toString() || '0');
    const completionPrice = parseFloat(model.pricing.completion?.toString() || '0');
    
    return promptPrice <= maxPromptPrice && completionPrice <= maxCompletionPrice;
  });
}

// Function to log all free models
export function logFreeModels(models: OpenRouterModel[]): void {
  const freeModels = getFreeModels(models);
  console.log(`Found ${freeModels.length} free models:`);
  freeModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model.id} (${model.name})`);
    if (model.pricing) {
      console.log(`   Pricing: Prompt: ${model.pricing.prompt}, Completion: ${model.pricing.completion}`);
    }
  });
}
