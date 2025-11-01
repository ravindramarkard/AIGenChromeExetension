/// <reference types="chrome"/>
import { ExtensionSettings, GeneratedTest, ChatMessage, TestFramework, AIProvider, ElementData, TestAction, LocalSetupConfig, OpenRouterConfig, CustomProviderConfig, APICallLog, APIRequest, APIResponse } from '../types';
import { getTemplateByFramework, TestGenerationOptions } from '../utils/testTemplates';

// Global storage for API calls during test generation
let currentAPICallLogs: APICallLog[] = [];

// API call logging wrapper
async function loggedFetch(url: string, options: RequestInit, provider: string, model: string): Promise<Response> {
  const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const requestTimestamp = Date.now();
  
  // Log request
  const apiRequest: APIRequest = {
    url,
    method: options.method || 'GET',
    headers: (options.headers as Record<string, string>) || {},
    body: options.body as string || '',
    timestamp: requestTimestamp
  };
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    
    // Get response body
    const responseText = await response.text();
    
    // Log response
    const apiResponse: APIResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
      timestamp: endTime,
      duration: endTime - startTime
    };
    
    // Store API call log
    const apiCallLog: APICallLog = {
      id: requestId,
      provider,
      model,
      request: apiRequest,
      response: apiResponse
    };
    
    currentAPICallLogs.push(apiCallLog);
    
    // Return a new Response object with the same data
    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
  } catch (error) {
    // Log error
    const apiResponse: APIResponse = {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      body: '',
      timestamp: Date.now(),
      duration: Date.now() - requestTimestamp
    };
    
    const apiCallLog: APICallLog = {
      id: requestId,
      provider,
      model,
      request: apiRequest,
      response: apiResponse,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    currentAPICallLogs.push(apiCallLog);
    throw error;
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI TestGen extension installed');
  
  // Set default settings
  const DEFAULT_SETTINGS: ExtensionSettings = {
    selectedFramework: 'playwright-ts',
    selectedAIProvider: 'openai',
    apiKeys: {},
    selectedModel: {},
    localSetup: {
      endpoint: 'http://localhost:11434',
      model: 'llama-3.1'
    },
    openRouterConfig: {
      apiKey: '',
      model: 'openai/gpt-3.5-turbo'
    },
    connectionStatus: {},
    autoGenerate: false,
    includeComments: true,
    usePageObjectModel: false
  };
  
  chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
});

// Handle action click - always open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    console.log('🖱️ Background: Extension icon clicked, opening side panel...');
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
      console.log('✅ Background: Side panel opened successfully');
    } else {
      console.warn('⚠️ Background: Side panel API not available, falling back to popup');
      // Fallback: open popup if side panel is not available
      chrome.action.setPopup({ popup: 'popup.html' });
      // Note: This will require user to click again to open popup
    }
  } catch (error) {
    console.error('❌ Background: Failed to open side panel:', error);
    // Fallback to popup on error
    try {
      chrome.action.setPopup({ popup: 'popup.html' });
    } catch (popupError) {
      console.error('❌ Background: Failed to set popup fallback:', popupError);
    }
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  switch (request.action) {
    case 'generateTest':
      (async () => {
        try {
          await handleGenerateTest(request.data, sendResponse);
        } catch (error) {
          console.error('Error in generateTest handler:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true; // Keep message channel open for async response
      
    case 'saveTest':
      (async () => {
        try {
          await handleSaveTest(request.data, sendResponse);
        } catch (error) {
          console.error('Error in saveTest handler:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true;
      
    case 'getSettings':
      (async () => {
        try {
          await handleGetSettings(sendResponse);
        } catch (error) {
          console.error('Error in getSettings handler:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true;
      
    case 'updateSettings':
      (async () => {
        try {
          await handleUpdateSettings(request.data, sendResponse);
        } catch (error) {
          console.error('Error in updateSettings handler:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true;
      
    case 'getChatHistory':
      (async () => {
        try {
          await handleGetChatHistory(sendResponse);
        } catch (error) {
          console.error('Error in getChatHistory handler:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true;
      
    case 'saveChatMessage':
      (async () => {
        try {
          await handleSaveChatMessage(request.data, sendResponse);
        } catch (error) {
          console.error('Error in saveChatMessage handler:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true;
      
    case 'fetchOpenRouterModels':
      (async () => {
        try {
          const models = await fetchOpenRouterModels(request.apiKey);
          sendResponse({ success: true, models });
        } catch (error) {
          console.error('Error fetching OpenRouter models:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true;
      
    case 'getAllOpenRouterModels':
      (async () => {
        try {
          const models = await fetchOpenRouterModels(request.apiKey);
          sendResponse({ success: true, models });
        } catch (error) {
          console.error('Error fetching all OpenRouter models:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      })();
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Helper function to send errors to both popup and response
function sendErrorToPopupAndResponse(errorMessage: string, sendResponse: (response: any) => void) {
  // Send error to popup if it's open
  try {
    chrome.runtime.sendMessage({
      action: 'testGenerationError',
      error: errorMessage
    });
  } catch (popupError) {
    // Popup might not be open, that's okay
    console.log('Could not send error to popup (popup might be closed):', popupError);
  }
  
  sendResponse({ error: errorMessage });
}

async function handleGenerateTest(data: any, sendResponse: (response: any) => void) {
  try {
    console.log('🎯 Background: Handling test generation request:', data);
    
    // Reset API call logs for this generation
    currentAPICallLogs = [];
    
    const settings = await getStoredSettings();
    console.log('⚙️ Background: Current settings:', settings);
    
    // Check if settings exist
    if (!settings) {
      sendErrorToPopupAndResponse('Extension settings not found. Please configure the extension first.', sendResponse);
      return;
    }
    
    // Check if AI provider is selected
    if (!settings.selectedAIProvider) {
      sendErrorToPopupAndResponse('No AI provider selected. Please select a provider in settings.', sendResponse);
      return;
    }
    
    // Check API key based on provider
    let apiKey = '';
    if (settings.selectedAIProvider === 'local') {
      // Local provider doesn't need API key, but check if endpoint is configured
      if (!settings.localSetup?.endpoint) {
        sendErrorToPopupAndResponse('Local endpoint not configured. Please set up local provider in settings.', sendResponse);
        return;
      }
    } else if (settings.selectedAIProvider === 'openrouter') {
      // OpenRouter uses its own config
      apiKey = settings.openRouterConfig?.apiKey || '';
      if (!apiKey) {
        sendErrorToPopupAndResponse('OpenRouter API key not configured. Please add your API key in settings.', sendResponse);
        return;
      }
    } else {
      // Standard providers (OpenAI, Anthropic, etc.)
      apiKey = settings.apiKeys?.[settings.selectedAIProvider] || '';
      if (!apiKey) {
        const providerName = settings.selectedAIProvider.charAt(0).toUpperCase() + settings.selectedAIProvider.slice(1);
        sendErrorToPopupAndResponse(`${providerName} API key not configured. Please add your API key in settings.`, sendResponse);
        return;
      }
    }
    
    // Get the test template for the selected framework
    const template = getTemplateByFramework(settings.selectedFramework);
    if (!template) {
      sendErrorToPopupAndResponse('Unsupported test framework', sendResponse);
      return;
    }
    
    let generatedCode = '';
    
    // Always use AI generation when user provides a custom prompt
    if (data.userPrompt && data.userPrompt.trim()) {
      console.log('🤖 Using AI generation for custom prompt:', data.userPrompt);
      console.log('🔧 AI Provider:', settings.selectedAIProvider, 'Framework:', template.framework.name);
      generatedCode = await callAIProvider(settings.selectedAIProvider, apiKey, data, template.framework, settings);
      console.log('✅ Generated code length:', generatedCode.length);
    } else if (data.elements && data.elements.length > 0) {
      // Use template generation only for basic element-based tests without custom prompts
      const options: TestGenerationOptions = {
        includeComments: settings.includeComments,
        usePageObjectModel: settings.usePageObjectModel,
        testName: data.testName || 'Generated Test',
        baseUrl: data.baseUrl || 'https://example.com'
      };
      
      generatedCode = template.generateTest(data.actions || [], data.elements, options);
    } else {
      // Fallback to AI generation
      generatedCode = await callAIProvider(settings.selectedAIProvider, apiKey, data, template.framework, settings);
    }
    
    const test: GeneratedTest = {
      framework: template.framework,
      code: generatedCode,
      actions: data.actions || [],
      timestamp: Date.now(),
      apiCalls: [...currentAPICallLogs] // Include API call logs
    };
    
    // Send result to popup if it's open
    try {
      chrome.runtime.sendMessage({
        action: 'testGenerated',
        test: test
      });
    } catch (error) {
      // Popup might not be open, that's okay
      console.log('Could not send to popup (popup might be closed):', error);
    }
    
    sendResponse({ success: true, test });
  } catch (error) {
    console.error('Error generating test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Send error to popup if it's open
    try {
      chrome.runtime.sendMessage({
        action: 'testGenerationError',
        error: errorMessage
      });
    } catch (popupError) {
      // Popup might not be open, that's okay
      console.log('Could not send error to popup (popup might be closed):', popupError);
    }
    
    sendResponse({ error: errorMessage });
  }
}

async function callAIProvider(provider: string, apiKey: string, data: any, framework?: TestFramework, settings?: ExtensionSettings): Promise<string> {
  const prompt = buildPrompt(data, framework, settings);
  const selectedModel = settings?.selectedModel[provider];
  
  switch (provider) {
    case 'openai':
      return await callOpenAI(apiKey, prompt, selectedModel);
    case 'anthropic':
      return await callAnthropic(apiKey, prompt, selectedModel);
    case 'deepseek':
      return await callDeepSeek(apiKey, prompt, selectedModel);
    case 'groq':
      return await callGroq(apiKey, prompt, selectedModel);
    case 'local':
      return await callLocalProvider(settings?.localSetup, prompt);
    case 'openrouter':
      return await callOpenRouter(settings?.openRouterConfig, prompt, selectedModel);
    case 'manual':
      return await callCustomProvider(settings?.customProviderConfig, prompt);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Helper function to clean AI response by removing markdown formatting
function cleanAIResponse(content: string): string {
  // Remove markdown code block markers and framework name headers
  let cleaned = content.trim();
  
  // Remove framework name header (e.g., "Playwright (TypeScript) (TypeScript)")
  const frameworkNamePattern = /^[A-Za-z\s\(\)]+\([A-Za-z\s]+\)\s*\([A-Za-z\s]+\)\s*\n/;
  cleaned = cleaned.replace(frameworkNamePattern, '');
  
  // Remove opening markdown code block
  cleaned = cleaned.replace(/^```(?:typescript|javascript|python|java|js|ts)?\s*\n/, '');
  
  // Remove closing markdown code block
  cleaned = cleaned.replace(/\n```\s*$/, '');
  
  // Remove any remaining markdown code block markers
  cleaned = cleaned.replace(/^```.*\n/, '').replace(/\n```.*$/, '');
  
  return cleaned.trim();
}

function buildPrompt(data: any, framework?: TestFramework, settings?: ExtensionSettings): string {
  const { actions, elements, userPrompt, pageContext } = data;
  const frameworkInfo = framework || data.framework;
  
  const includeComments = settings?.includeComments !== false;
  const usePageObjectModel = settings?.usePageObjectModel === true;
  
  let prompt = `Generate ${frameworkInfo.name} test code in ${frameworkInfo.language} for the following scenario:

User Request: ${userPrompt || 'Generate test for the selected elements'}`;

  // Add page context if available
  if (pageContext) {
    prompt += `

Page Context:
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Selected Elements: ${pageContext.elementCount}`;
  }

  prompt += `

Elements and Actions:
${(actions || []).map((action: any, index: number) => {
  const element = action.element;
  let elementInfo = `${index + 1}. ${action.type.toUpperCase()} on element: ${element.tagName}${element.id ? `#${element.id}` : ''}${element.className ? `.${element.className}` : ''}
     Selector: ${element.cssSelector}
     XPath: ${element.xpath}
     Text Content: ${element.textContent ? element.textContent.substring(0, 100) : 'N/A'}`;
  
  // Add enhanced element information if available
  if (element.context) {
    elementInfo += `
     Position: ${element.context.position.x}, ${element.context.position.y} (${element.context.position.width}x${element.context.position.height})
     Visible: ${element.context.visible}`;
  }
  
  if (element.accessibility) {
    const acc = element.accessibility;
    if (acc.role || acc.ariaLabel || acc.title) {
      elementInfo += `
     Accessibility: ${acc.role ? `role="${acc.role}"` : ''} ${acc.ariaLabel ? `aria-label="${acc.ariaLabel}"` : ''} ${acc.title ? `title="${acc.title}"` : ''}`.trim();
    }
  }
  
  elementInfo += `
     ${action.value ? `Value: ${action.value}` : ''}
     Description: ${action.description}`;
  
  return elementInfo;
}).join('\n')}

Requirements:
- Use modern best practices for ${frameworkInfo.name}
- Include proper waits and error handling
- Use reliable selectors (prefer CSS selectors over XPath when possible)
- Follow ${frameworkInfo.language} coding conventions
- Make the test maintainable and readable
- Handle potential race conditions and flaky elements
- Use appropriate assertions for validation`;

  if (includeComments) {
    prompt += '\n- Add descriptive comments explaining each step';
  }
  
  if (usePageObjectModel) {
    prompt += '\n- Structure the code using Page Object Model pattern';
  }
  
  prompt += '\n\nGenerate only the test code without explanations or markdown formatting.';
  
  return prompt;
}

async function callOpenAI(apiKey: string, prompt: string, model?: string): Promise<string> {
  const response = await loggedFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert test automation engineer specializing in creating robust, maintainable test code. Focus on best practices, proper error handling, and reliable selectors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    })
  }, 'openai', model || 'gpt-4');
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI API error');
  }
  
  const content = data.choices[0].message.content;
  return cleanAIResponse(content);
}

async function callAnthropic(apiKey: string, prompt: string, model?: string): Promise<string> {
  const response = await loggedFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  }, 'Anthropic', model || 'claude-3-sonnet-20240229');
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Anthropic API error');
  }
  
  const content = data.content[0].text;
  return cleanAIResponse(content);
}

async function callDeepSeek(apiKey: string, prompt: string, model?: string): Promise<string> {
  const response = await loggedFetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert test automation engineer specializing in creating robust, maintainable test code. Focus on best practices, proper error handling, and reliable selectors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    })
  }, 'DeepSeek', model || 'deepseek-chat');
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'DeepSeek API error');
  }
  
  const content = data.choices[0].message.content;
  return cleanAIResponse(content);
}

async function callGroq(apiKey: string, prompt: string, model?: string): Promise<string> {
  const response = await loggedFetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert test automation engineer specializing in creating robust, maintainable test code. Focus on best practices, proper error handling, and reliable selectors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    })
  }, 'Groq', model || 'llama-3.1-70b-versatile');
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Groq API error');
  }
  
  const content = data.choices[0].message.content;
  return cleanAIResponse(content);
}

async function callLocalProvider(config?: LocalSetupConfig, prompt?: string): Promise<string> {
  if (!config || !prompt) {
    throw new Error('Local setup configuration or prompt missing. Please configure endpoint and model in settings.');
  }
  
  if (!config.endpoint) {
    throw new Error('Local AI endpoint not configured. Please set endpoint (e.g., http://localhost:11434) in settings.');
  }
  
  if (!config.model) {
    throw new Error('Local AI model not specified. Please set model name (e.g., llama3.1:8b, codellama) in settings.');
  }
  
  // Detect API format: OpenAI-compatible vs Ollama
  const endpoint = config.endpoint.trim();
  const isOpenAICompatible = endpoint.includes('/v1') || endpoint.endsWith('/v1');
  
  const systemPrompt = 'You are an expert test automation engineer specializing in creating robust, maintainable test code. Focus on best practices, proper error handling, and reliable selectors.';
  
  try {
    let apiUrl: string;
    let requestBody: any;
    let response: Response | null = null;
    
    if (isOpenAICompatible) {
      // OpenAI-compatible API (LM Studio, vLLM, Text Generation WebUI, etc.)
      const chatUrl = endpoint.endsWith('/v1') 
        ? `${endpoint}/chat/completions`
        : `${endpoint}/v1/chat/completions`;
      
      const chatBody = {
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: config.temperature || 0.1,
        max_tokens: config.maxTokens || 3000,
        stream: false
      };
      
      // First try chat/completions
      apiUrl = chatUrl;
      requestBody = chatBody;
      response = await loggedFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }, 'Local Provider', config.model);

      // If 404, some servers only support legacy completions
      if (response.status === 404) {
        const compUrl = endpoint.endsWith('/v1') 
          ? `${endpoint}/completions`
          : `${endpoint}/v1/completions`;
        const compBody = {
          model: config.model,
          prompt: `${systemPrompt}\n\n${prompt}`,
          temperature: config.temperature || 0.1,
          max_tokens: config.maxTokens || 3000,
          stream: false
        };
        apiUrl = compUrl;
        requestBody = compBody;
        response = await loggedFetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }, 'Local Provider', config.model);
      }
    } else {
      // Ollama API format
      apiUrl = `${endpoint}/api/generate`;
      requestBody = {
        model: config.model,
        prompt: `${systemPrompt}\n\n${prompt}`,
        temperature: config.temperature || 0.1,
        max_tokens: config.maxTokens || 3000,
        stream: false
      };
      response = await loggedFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }, 'Local Provider', config.model);
    }
    
    if (!response) {
      throw new Error('No response from local AI service');
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      if (response.status === 403) {
        throw new Error(`Local AI service forbidden (403). Check if the service is accessible at ${config.endpoint}`);
      } else if (response.status === 404) {
        throw new Error(`Endpoint not found (404). Verify the endpoint URL and model name. URL tried: ${apiUrl}`);
      } else if (response.status >= 500) {
        throw new Error(`Local AI service error (${response.status}). Error: ${errorText}`);
      } else {
        throw new Error(`Local provider error: ${errorText} (${response.status})`);
      }
    }
    
    const data = await response.json();
    
    // Handle different response formats
    let content: string;
    if (isOpenAICompatible) {
      // Try chat format first
      content = data.choices?.[0]?.message?.content
        // Fallbacks for legacy/text responses
        || data.choices?.[0]?.text
        || data.content
        || data.text;
    } else {
      // Ollama format
      content = data.response || data.text || data.content;
    }
    
    if (!content) {
      throw new Error('No content received from local AI service. Response format may be unexpected.');
    }
    
    return cleanAIResponse(content);
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to local AI service at ${config.endpoint}. Please ensure the service is running and accessible.`);
    }
    throw error;
  }
}

async function callOpenRouter(config?: OpenRouterConfig, prompt?: string, model?: string): Promise<string> {
  if (!config || !prompt || !config.apiKey) {
    throw new Error('OpenRouter configuration or prompt missing');
  }
  
  if (!model) {
    throw new Error('OpenRouter model not specified');
  }
  
  const response = await loggedFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ai-testgen-extension.com',
      'X-Title': 'AI TestGen Extension'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert test automation engineer specializing in creating robust, maintainable test code. Focus on best practices, proper error handling, and reliable selectors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: config.temperature || 0.1,
      max_tokens: config.maxTokens || 3000
    })
  }, 'OpenRouter', model);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'OpenRouter API error');
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  return cleanAIResponse(content);
}

async function callCustomProvider(config?: CustomProviderConfig, prompt?: string): Promise<string> {
  if (!config || !prompt) {
    throw new Error('Custom provider configuration or prompt missing');
  }
  
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error('Custom provider configuration is incomplete');
  }
  
  const response = await loggedFetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...config.headers
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert test automation engineer specializing in creating robust, maintainable test code. Focus on best practices, proper error handling, and reliable selectors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: config.temperature || 0.1,
      max_tokens: config.maxTokens || 3000
    })
  }, 'Custom Provider', config.model);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Custom provider API error');
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  return cleanAIResponse(content);
}

async function fetchOpenRouterModels(apiKey: string): Promise<{id: string, name: string, context_length: number, pricing: any}[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-testgen-extension.com',
        'X-Title': 'AI TestGen Extension',
        'User-Agent': 'AI-TestGen-Extension/1.0.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error response:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}. ${errorText.includes('<!DOCTYPE') ? 'Invalid API key or endpoint.' : errorText}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Non-JSON response from OpenRouter:', responseText);
      throw new Error('OpenRouter API returned non-JSON response. Please check your API key.');
    }

    const data = await response.json();
    
    if (!data || !data.data) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    console.log('OpenRouter API response:', data);
    console.log('Total models received:', data.data?.length);

    const models = data.data?.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      context_length: model.context_length || 0,
      pricing: model.pricing || {}
    })) || [];

    console.log('Processed models:', models.length);
    console.log('Sample models:', models.slice(0, 5));
    
    return models;
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    if (error instanceof Error && error.message.includes('Unexpected token')) {
      throw new Error('OpenRouter API returned HTML instead of JSON. Please check your API key and try again.');
    }
    throw error;
  }
}

async function handleSaveTest(test: GeneratedTest, sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.local.get(['savedTests']);
    const savedTests = result.savedTests || [];
    savedTests.push(test);
    await chrome.storage.local.set({ savedTests });
    
    // Notify DevTools panel that a new test has been generated
    try {
      // Get all tabs to find the one with DevTools open
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            // Send message to content script which will forward to DevTools panel
            await chrome.tabs.sendMessage(tab.id, {
              action: 'notifyDevTools',
              type: 'NEW_TEST_GENERATED',
              data: test
            });
          } catch (error) {
            // Ignore errors for tabs that don't have our content script
          }
        }
      }
    } catch (error) {
      console.error('Error notifying DevTools panel:', error);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving test:', error instanceof Error ? error.message : 'Unknown error');
    sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function handleGetSettings(sendResponse: (response: any) => void) {
  try {
    const settings = await getStoredSettings();
    console.log('🔧 Background: Retrieved settings:', settings);
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('❌ Background: Error getting settings:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
}

async function handleUpdateSettings(settings: ExtensionSettings, sendResponse: (response: any) => void) {
  try {
    console.log('💾 Background: Saving settings:', settings);
    await chrome.storage.sync.set({ settings });
    console.log('✅ Background: Settings saved successfully');
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Background: Error saving settings:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
}

async function handleGetChatHistory(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.local.get(['chatHistory']);
    const chatHistory = result.chatHistory || [];
    sendResponse({ success: true, chatHistory });
  } catch (error) {
    sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
}

async function handleSaveChatMessage(message: ChatMessage, sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.local.get(['chatHistory']);
    const chatHistory = result.chatHistory || [];
    chatHistory.push(message);
    
    // Keep only last 100 messages
    if (chatHistory.length > 100) {
      chatHistory.splice(0, chatHistory.length - 100);
    }
    
    await chrome.storage.local.set({ chatHistory });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
}

async function getStoredSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(['settings']);
  return result.settings || {
    selectedFramework: 'playwright-ts',
    selectedAIProvider: 'openai',
    apiKeys: {},
    selectedModel: {},
    localSetup: {
      endpoint: 'http://localhost:11434',
      model: 'llama-3.1'
    },
    openRouterConfig: {
      apiKey: '',
      model: 'openai/gpt-3.5-turbo'
    },
    connectionStatus: {},
    autoGenerate: false,
    includeComments: true,
    usePageObjectModel: false
  };
}

async function generateWithOpenAI(data: any, apiKey: string, framework: TestFramework): Promise<string> {
  try {
    const prompt = buildPrompt(data, framework);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert test automation engineer. Generate clean, production-ready test code.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI generation error:', error);
    throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateWithAnthropic(data: any, apiKey: string, framework: TestFramework): Promise<string> {
  try {
    const prompt = buildPrompt(data, framework);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.content[0].text;
  } catch (error) {
    console.error('Anthropic generation error:', error);
    throw new Error(`Anthropic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateWithDeepSeek(data: any, apiKey: string, framework: TestFramework): Promise<string> {
  try {
    const prompt = buildPrompt(data, framework);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-coder',
        messages: [
          {
            role: 'system',
            content: 'You are an expert test automation engineer. Generate clean, production-ready test code.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek generation error:', error);
    throw new Error(`DeepSeek generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateWithGroq(data: any, apiKey: string, framework: TestFramework): Promise<string> {
  try {
    const prompt = buildPrompt(data, framework);
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an expert test automation engineer. Generate clean, production-ready test code.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Groq generation error:', error);
    throw new Error(`Groq generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}