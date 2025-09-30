import { GeneratedTest } from '../types';

export interface TestRunResult {
  id: string;
  testName: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  output?: string;
  screenshot?: string;
  timestamp: Date;
}

export interface TestSuite {
  id: string;
  name: string;
  tests: TestRunResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  status: 'running' | 'completed' | 'failed';
  timestamp: Date;
}

export interface RunnerConfig {
  headless: boolean;
  browser: 'chromium' | 'firefox' | 'webkit';
  timeout: number;
  retries: number;
  screenshot: 'off' | 'only-on-failure' | 'on';
  video: 'off' | 'on' | 'retain-on-failure';
  baseURL?: string;
}

export class PlaywrightTestRunner {
  private config: RunnerConfig;
  private runningTests: Map<string, AbortController> = new Map();

  constructor(config: Partial<RunnerConfig> = {}) {
    this.config = {
      headless: true,
      browser: 'chromium',
      timeout: 30000,
      retries: 0,
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      ...config
    };
  }

  async runSingleTest(test: GeneratedTest): Promise<TestRunResult> {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();
    this.runningTests.set(testId, abortController);

    const result: TestRunResult = {
      id: testId,
      testName: `${test.framework.name} Test`,
      status: 'running',
      timestamp: new Date()
    };

    try {
      // Simulate test execution (in a real implementation, this would use Playwright API)
      const startTime = Date.now();
      
      // Create a temporary test file
      const testCode = this.prepareTestCode(test);
      
      // Execute the test (simulated)
      await this.executeTest(testCode, abortController.signal);
      
      const endTime = Date.now();
      result.duration = endTime - startTime;
      result.status = 'passed';
      result.output = 'Test executed successfully';
      
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      result.output = `Test failed: ${result.error}`;
    } finally {
      this.runningTests.delete(testId);
    }

    return result;
  }

  async runMultipleTests(tests: GeneratedTest[]): Promise<TestSuite> {
    const suiteId = `suite-${Date.now()}`;
    const suite: TestSuite = {
      id: suiteId,
      name: 'Generated Test Suite',
      tests: [],
      totalTests: tests.length,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      status: 'running',
      timestamp: new Date()
    };

    const startTime = Date.now();

    try {
      for (const test of tests) {
        const result = await this.runSingleTest(test);
        suite.tests.push(result);

        switch (result.status) {
          case 'passed':
            suite.passedTests++;
            break;
          case 'failed':
            suite.failedTests++;
            break;
          case 'skipped':
            suite.skippedTests++;
            break;
        }
      }

      suite.status = suite.failedTests > 0 ? 'failed' : 'completed';
    } catch (error) {
      suite.status = 'failed';
    }

    suite.duration = Date.now() - startTime;
    return suite;
  }

  private prepareTestCode(test: GeneratedTest): string {
    // Add necessary imports and setup for Playwright
    const imports = `
import { test, expect } from '@playwright/test';
`;

    // Wrap the test code in a proper test structure
    const wrappedCode = `
${imports}

test('${test.framework.name} Test', async ({ page }) => {
  ${test.code}
});
`;

    return wrappedCode;
  }

  private async executeTest(testCode: string, signal: AbortSignal): Promise<void> {
    // Simulate test execution with proper error handling
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!signal.aborted) {
          // Simulate random test results for demonstration
          const shouldPass = Math.random() > 0.3; // 70% pass rate
          if (shouldPass) {
            resolve();
          } else {
            reject(new Error('Test assertion failed: Element not found'));
          }
        }
      }, Math.random() * 2000 + 1000); // Random delay 1-3 seconds

      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Test execution was aborted'));
      });
    });
  }

  stopTest(testId: string): boolean {
    const controller = this.runningTests.get(testId);
    if (controller) {
      controller.abort();
      this.runningTests.delete(testId);
      return true;
    }
    return false;
  }

  stopAllTests(): void {
    for (const [testId, controller] of this.runningTests) {
      controller.abort();
    }
    this.runningTests.clear();
  }

  getRunningTests(): string[] {
    return Array.from(this.runningTests.keys());
  }

  updateConfig(newConfig: Partial<RunnerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RunnerConfig {
    return { ...this.config };
  }

  // Utility methods for test result analysis
  static calculateSuccessRate(suite: TestSuite): number {
    if (suite.totalTests === 0) return 0;
    return (suite.passedTests / suite.totalTests) * 100;
  }

  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    const seconds = Math.floor(milliseconds / 1000);
    const ms = milliseconds % 1000;
    return `${seconds}.${ms.toString().padStart(3, '0')}s`;
  }

  static getStatusIcon(status: TestRunResult['status']): string {
    switch (status) {
      case 'running':
        return '⏳';
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      default:
        return '❓';
    }
  }

  static getStatusColor(status: TestRunResult['status']): string {
    switch (status) {
      case 'running':
        return 'text-blue-600';
      case 'passed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'skipped':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }
}

// Export default instance
export const testRunner = new PlaywrightTestRunner();

// Configuration presets
export const RUNNER_PRESETS = {
  development: {
    headless: false,
    browser: 'chromium' as const,
    timeout: 30000,
    retries: 0,
    screenshot: 'only-on-failure' as const,
    video: 'on' as const
  },
  ci: {
    headless: true,
    browser: 'chromium' as const,
    timeout: 60000,
    retries: 2,
    screenshot: 'only-on-failure' as const,
    video: 'retain-on-failure' as const
  },
  debugging: {
    headless: false,
    browser: 'chromium' as const,
    timeout: 0, // No timeout for debugging
    retries: 0,
    screenshot: 'on' as const,
    video: 'on' as const
  }
} as const;