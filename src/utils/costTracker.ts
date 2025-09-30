export interface UsageMetrics {
  totalRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  requestsByProvider: Record<string, number>;
  tokensByProvider: Record<string, number>;
  costsByProvider: Record<string, number>;
  dailyUsage: Record<string, DailyUsage>;
  monthlyUsage: Record<string, MonthlyUsage>;
}

export interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface MonthlyUsage {
  month: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number;
  provider: string;
  model: string;
}

export interface UsageAlert {
  type: 'daily_limit' | 'monthly_limit' | 'cost_threshold' | 'token_threshold';
  message: string;
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

export interface UsageLimits {
  dailyRequestLimit?: number;
  monthlyRequestLimit?: number;
  dailyCostLimit?: number;
  monthlyCostLimit?: number;
  dailyTokenLimit?: number;
  monthlyTokenLimit?: number;
}

// Pricing information for different AI providers (per 1K tokens)
const PRICING_MODELS: Record<string, Record<string, { input: number; output: number }>> = {
  'openai': {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 }
  },
  'anthropic': {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 }
  },
  'openrouter': {
    'meta-llama/llama-2-70b-chat': { input: 0.0007, output: 0.0009 },
    'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
    'openai/gpt-4': { input: 0.03, output: 0.06 }
  }
};

export class CostTracker {
  private static readonly STORAGE_KEY = 'ai_testgen_usage_metrics';
  private static readonly LIMITS_KEY = 'ai_testgen_usage_limits';

  static async getUsageMetrics(): Promise<UsageMetrics> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || this.getDefaultMetrics();
    } catch (error) {
      console.error('Failed to load usage metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  static async saveUsageMetrics(metrics: UsageMetrics): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: metrics });
    } catch (error) {
      console.error('Failed to save usage metrics:', error);
    }
  }

  static async getUsageLimits(): Promise<UsageLimits> {
    try {
      const result = await chrome.storage.local.get(this.LIMITS_KEY);
      return result[this.LIMITS_KEY] || {};
    } catch (error) {
      console.error('Failed to load usage limits:', error);
      return {};
    }
  }

  static async saveUsageLimits(limits: UsageLimits): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.LIMITS_KEY]: limits });
    } catch (error) {
      console.error('Failed to save usage limits:', error);
    }
  }

  static async trackUsage(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const metrics = await this.getUsageMetrics();
    const cost = this.calculateCost(provider, model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    // Update totals
    metrics.totalRequests += 1;
    metrics.totalTokensUsed += totalTokens;
    metrics.totalCost += cost;

    // Update by provider
    metrics.requestsByProvider[provider] = (metrics.requestsByProvider[provider] || 0) + 1;
    metrics.tokensByProvider[provider] = (metrics.tokensByProvider[provider] || 0) + totalTokens;
    metrics.costsByProvider[provider] = (metrics.costsByProvider[provider] || 0) + cost;

    // Update daily usage
    if (!metrics.dailyUsage[today]) {
      metrics.dailyUsage[today] = { date: today, requests: 0, tokens: 0, cost: 0 };
    }
    metrics.dailyUsage[today].requests += 1;
    metrics.dailyUsage[today].tokens += totalTokens;
    metrics.dailyUsage[today].cost += cost;

    // Update monthly usage
    if (!metrics.monthlyUsage[thisMonth]) {
      metrics.monthlyUsage[thisMonth] = { month: thisMonth, requests: 0, tokens: 0, cost: 0 };
    }
    metrics.monthlyUsage[thisMonth].requests += 1;
    metrics.monthlyUsage[thisMonth].tokens += totalTokens;
    metrics.monthlyUsage[thisMonth].cost += cost;

    await this.saveUsageMetrics(metrics);
  }

  static calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING_MODELS[provider]?.[model];
    if (!pricing) {
      // Default pricing if model not found
      return ((inputTokens + outputTokens) / 1000) * 0.002;
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  static estimateCost(provider: string, model: string, estimatedTokens: number): CostEstimate {
    const pricing = PRICING_MODELS[provider]?.[model];
    let estimatedCost: number;

    if (!pricing) {
      estimatedCost = (estimatedTokens / 1000) * 0.002;
    } else {
      // Assume 70% input, 30% output for estimation
      const inputTokens = Math.floor(estimatedTokens * 0.7);
      const outputTokens = Math.floor(estimatedTokens * 0.3);
      estimatedCost = this.calculateCost(provider, model, inputTokens, outputTokens);
    }

    return {
      estimatedTokens,
      estimatedCost,
      provider,
      model
    };
  }

  static async checkUsageAlerts(): Promise<UsageAlert[]> {
    const metrics = await this.getUsageMetrics();
    const limits = await this.getUsageLimits();
    const alerts: UsageAlert[] = [];
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todayUsage = metrics.dailyUsage[today];
    const monthUsage = metrics.monthlyUsage[thisMonth];

    // Check daily limits
    if (limits.dailyRequestLimit && todayUsage && todayUsage.requests >= limits.dailyRequestLimit) {
      alerts.push({
        type: 'daily_limit',
        message: `Daily request limit reached (${todayUsage.requests}/${limits.dailyRequestLimit})`,
        currentValue: todayUsage.requests,
        threshold: limits.dailyRequestLimit,
        severity: todayUsage.requests > limits.dailyRequestLimit ? 'critical' : 'warning'
      });
    }

    if (limits.dailyCostLimit && todayUsage && todayUsage.cost >= limits.dailyCostLimit) {
      alerts.push({
        type: 'daily_limit',
        message: `Daily cost limit reached ($${todayUsage.cost.toFixed(4)}/$${limits.dailyCostLimit.toFixed(4)})`,
        currentValue: todayUsage.cost,
        threshold: limits.dailyCostLimit,
        severity: todayUsage.cost > limits.dailyCostLimit ? 'critical' : 'warning'
      });
    }

    if (limits.dailyTokenLimit && todayUsage && todayUsage.tokens >= limits.dailyTokenLimit) {
      alerts.push({
        type: 'daily_limit',
        message: `Daily token limit reached (${todayUsage.tokens}/${limits.dailyTokenLimit})`,
        currentValue: todayUsage.tokens,
        threshold: limits.dailyTokenLimit,
        severity: todayUsage.tokens > limits.dailyTokenLimit ? 'critical' : 'warning'
      });
    }

    // Check monthly limits
    if (limits.monthlyRequestLimit && monthUsage && monthUsage.requests >= limits.monthlyRequestLimit) {
      alerts.push({
        type: 'monthly_limit',
        message: `Monthly request limit reached (${monthUsage.requests}/${limits.monthlyRequestLimit})`,
        currentValue: monthUsage.requests,
        threshold: limits.monthlyRequestLimit,
        severity: monthUsage.requests > limits.monthlyRequestLimit ? 'critical' : 'warning'
      });
    }

    if (limits.monthlyCostLimit && monthUsage && monthUsage.cost >= limits.monthlyCostLimit) {
      alerts.push({
        type: 'monthly_limit',
        message: `Monthly cost limit reached ($${monthUsage.cost.toFixed(4)}/$${limits.monthlyCostLimit.toFixed(4)})`,
        currentValue: monthUsage.cost,
        threshold: limits.monthlyCostLimit,
        severity: monthUsage.cost > limits.monthlyCostLimit ? 'critical' : 'warning'
      });
    }

    if (limits.monthlyTokenLimit && monthUsage && monthUsage.tokens >= limits.monthlyTokenLimit) {
      alerts.push({
        type: 'monthly_limit',
        message: `Monthly token limit reached (${monthUsage.tokens}/${limits.monthlyTokenLimit})`,
        currentValue: monthUsage.tokens,
        threshold: limits.monthlyTokenLimit,
        severity: monthUsage.tokens > limits.monthlyTokenLimit ? 'critical' : 'warning'
      });
    }

    return alerts;
  }

  static async resetDailyUsage(): Promise<void> {
    const metrics = await this.getUsageMetrics();
    const today = new Date().toISOString().split('T')[0];
    
    if (metrics.dailyUsage[today]) {
      delete metrics.dailyUsage[today];
      await this.saveUsageMetrics(metrics);
    }
  }

  static async resetMonthlyUsage(): Promise<void> {
    const metrics = await this.getUsageMetrics();
    const thisMonth = new Date().toISOString().slice(0, 7);
    
    if (metrics.monthlyUsage[thisMonth]) {
      delete metrics.monthlyUsage[thisMonth];
      await this.saveUsageMetrics(metrics);
    }
  }

  static async resetAllUsage(): Promise<void> {
    await this.saveUsageMetrics(this.getDefaultMetrics());
  }

  static async exportUsageData(): Promise<string> {
    const metrics = await this.getUsageMetrics();
    const limits = await this.getUsageLimits();
    
    const exportData = {
      metrics,
      limits,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  static async importUsageData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.metrics) {
        await this.saveUsageMetrics(data.metrics);
      }
      
      if (data.limits) {
        await this.saveUsageLimits(data.limits);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import usage data:', error);
      return false;
    }
  }

  private static getDefaultMetrics(): UsageMetrics {
    return {
      totalRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      requestsByProvider: {},
      tokensByProvider: {},
      costsByProvider: {},
      dailyUsage: {},
      monthlyUsage: {}
    };
  }

  static getProviderModels(provider: string): string[] {
    return Object.keys(PRICING_MODELS[provider] || {});
  }

  static getAllProviders(): string[] {
    return Object.keys(PRICING_MODELS);
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount);
  }

  static formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
}