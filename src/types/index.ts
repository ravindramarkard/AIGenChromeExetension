export interface TestFramework {
  id: string;
  name: string;
  language: string;
  description: string;
  icon: string;
}

export interface AIProvider {
  id: string;
  name: string;
  apiKeyRequired: boolean;
  models: string[];
  costPerToken?: number;
  type: 'cloud' | 'local' | 'openrouter';
  baseUrl?: string;
  requiresCustomEndpoint?: boolean;
}

export interface LocalSetupConfig {
  endpoint: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastTested?: number;
  error?: string;
  latency?: number;
}

export interface ElementData {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  xpath: string;
  cssSelector: string;
  rect: DOMRect;
  isVisible: boolean;
}

export interface TestAction {
  type: 'click' | 'type' | 'select' | 'hover' | 'wait' | 'assert';
  element: ElementData;
  value?: string;
  description: string;
}

export interface APIRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  duration: number;
}

export interface APICallLog {
  id: string;
  provider: string;
  model: string;
  request: APIRequest;
  response: APIResponse;
  error?: string;
}

export interface GeneratedTest {
  framework: TestFramework;
  code: string;
  actions: TestAction[];
  timestamp: number;
  apiCalls?: APICallLog[];
}

export interface ExtensionSettings {
  selectedFramework: string;
  selectedAIProvider: string;
  apiKeys: Record<string, string>;
  selectedModel: Record<string, string>;
  localSetup: LocalSetupConfig;
  openRouterConfig: OpenRouterConfig;
  connectionStatus: Record<string, ConnectionStatus>;
  autoGenerate: boolean;
  includeComments: boolean;
  usePageObjectModel: boolean;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  codeBlocks?: Array<{
    language: string;
    code: string;
  }>;
}

export interface InspectorState {
  isActive: boolean;
  selectedElements: ElementData[];
  hoveredElement?: ElementData;
}

export const TEST_FRAMEWORKS: TestFramework[] = [
  {
    id: 'playwright-js',
    name: 'Playwright',
    language: 'JavaScript',
    description: 'Modern end-to-end testing framework with excellent debugging capabilities',
    icon: '🎭'
  },
  {
    id: 'playwright-python',
    name: 'Playwright',
    language: 'Python',
    description: 'Modern end-to-end testing framework for Python developers',
    icon: '🎭'
  },
  {
    id: 'cypress-js',
    name: 'Cypress',
    language: 'JavaScript',
    description: 'Fast, easy and reliable testing for anything that runs in a browser',
    icon: '🌲'
  },
  {
    id: 'selenium-java',
    name: 'Selenium',
    language: 'Java',
    description: 'Industry standard browser automation framework for Java',
    icon: '☕'
  },
  {
    id: 'selenium-python',
    name: 'Selenium',
    language: 'Python',
    description: 'Industry standard browser automation framework for Python',
    icon: '🐍'
  }
];

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI GPT',
    apiKeyRequired: true,
    models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
    costPerToken: 0.00003,
    type: 'cloud'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    apiKeyRequired: true,
    models: ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus'],
    costPerToken: 0.000015,
    type: 'cloud'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKeyRequired: true,
    models: ['deepseek-chat', 'deepseek-coder'],
    costPerToken: 0.000001,
    type: 'cloud'
  },
  {
    id: 'groq',
    name: 'Groq',
    apiKeyRequired: true,
    models: ['llama-3.1-70b', 'mixtral-8x7b', 'llama-3.1-8b'],
    costPerToken: 0.0000005,
    type: 'cloud'
  },
  {
    id: 'local',
    name: 'Local Setup',
    apiKeyRequired: false,
    models: ['llama-3.1', 'codellama', 'mistral', 'custom'],
    type: 'local',
    requiresCustomEndpoint: true,
    baseUrl: 'http://localhost:11434'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyRequired: true,
    models: [
      'openai/gpt-4',
      'openai/gpt-3.5-turbo',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-70b',
      'meta-llama/llama-3.1-8b',
      'mistralai/mistral-7b',
      'google/gemini-pro',
      'cohere/command-r-plus',
      'x-ai/grok-4-fast:free',
      'x-ai/grok-beta',
      'deepseek/deepseek-chat',
      'qwen/qwen-2.5-72b-instruct'
    ],
    costPerToken: 0.000002,
    type: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1'
  }
];