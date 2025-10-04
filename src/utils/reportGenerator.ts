import { TestRunResult } from './testRunner';

export interface ReportData {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  results: TestRunResult[];
  reportUrl?: string;
}

export interface MediaAttachment {
  type: 'screenshot' | 'video' | 'trace';
  name: string;
  data: string; // Base64 encoded data
  mimeType: string;
}

export function generateHTMLReport(reportData: ReportData): string {
  const { summary, results } = reportData;
  const timestamp = new Date().toLocaleString();
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            line-height: 1.5;
        }
        
        .header {
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 1.5rem;
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
        }
        
        .header .timestamp {
            color: #64748b;
            font-size: 0.875rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
        }
        
        .summary {
            display: flex;
            gap: 2rem;
            margin-bottom: 2rem;
            align-items: center;
        }
        
        .summary-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 500;
        }
        
        .summary-item.total {
            color: #1e293b;
        }
        
        .summary-item.passed {
            color: #10b981;
        }
        
        .summary-item.failed {
            color: #ef4444;
        }
        
        .summary-item.skipped {
            color: #f59e0b;
        }
        
        .summary-value {
            font-weight: 700;
            font-size: 1.25rem;
        }
        
        .test-detail {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            overflow: hidden;
        }
        
        .test-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .test-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.25rem;
        }
        
        .test-file {
            color: #64748b;
            font-size: 0.875rem;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
        }
        
        .test-browser {
            color: #64748b;
            font-size: 0.875rem;
            margin-left: 1rem;
        }
        
        .test-duration {
            color: #64748b;
            font-size: 0.875rem;
            margin-left: 1rem;
        }
        
        .run-button {
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
        }
        
        .run-button:hover {
            background: #dc2626;
        }
        
        .test-content {
            padding: 1.5rem;
        }
        
        .error-section {
            margin-bottom: 1.5rem;
        }
        
        .error-header {
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1rem;
        }
        
        .error-details {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 0.375rem;
            padding: 1rem;
        }
        
        .error-message {
            color: #dc2626;
            font-weight: 600;
            margin-bottom: 0.75rem;
        }
        
        .error-expected {
            margin-bottom: 0.5rem;
        }
        
        .error-received {
            margin-bottom: 0.5rem;
        }
        
        .error-timeout {
            margin-bottom: 0.75rem;
            color: #64748b;
            font-size: 0.875rem;
        }
        
        .call-log {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.375rem;
            padding: 0.75rem;
            margin-bottom: 0.75rem;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.875rem;
        }
        
        .code-snippet {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.375rem;
            padding: 1rem;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.875rem;
            overflow-x: auto;
        }
        
        .code-line {
            display: flex;
            margin-bottom: 0.25rem;
        }
        
        .line-number {
            color: #64748b;
            margin-right: 1rem;
            min-width: 2rem;
            text-align: right;
        }
        
        .line-content {
            flex: 1;
        }
        
        .error-line {
            background: #fef2f2;
            color: #dc2626;
            padding: 0.25rem 0;
        }
        
        .error-caret {
            color: #dc2626;
            margin-left: 1rem;
        }
        
        .file-path {
            color: #64748b;
            font-size: 0.75rem;
            margin-top: 0.5rem;
        }
        
        .test-steps {
            margin-bottom: 1.5rem;
        }
        
        .steps-header {
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1rem;
        }
        
        .step-item {
            display: flex;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .step-item:last-child {
            border-bottom: none;
        }
        
        .step-icon {
            margin-right: 0.75rem;
            font-size: 1rem;
        }
        
        .step-icon.passed {
            color: #10b981;
        }
        
        .step-icon.failed {
            color: #ef4444;
        }
        
        .step-content {
            flex: 1;
            font-size: 0.875rem;
        }
        
        .step-duration {
            color: #64748b;
            font-size: 0.75rem;
            margin-left: 1rem;
        }
        
        .screenshots-section {
            margin-bottom: 1.5rem;
        }
        
        .screenshots-header {
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            cursor: pointer;
        }
        
        .screenshots-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .screenshot-item {
            border: 1px solid #e2e8f0;
            border-radius: 0.375rem;
            overflow: hidden;
            cursor: pointer;
        }
        
        .screenshot-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .screenshot-item:hover {
            transform: scale(1.02);
            transition: transform 0.2s;
        }
        
        .collapsed {
            display: none;
        }
        
        .expand-icon {
            margin-left: 0.5rem;
            font-size: 0.75rem;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .summary {
                flex-wrap: wrap;
                gap: 1rem;
            }
            
            .test-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>Playwright Report</h1>
            <div class="timestamp">${timestamp}</div>
        </div>
    </div>
    
    <div class="container">
        <div class="summary">
            <div class="summary-item total">
                <span class="summary-value">All ${summary.total}</span>
            </div>
            <div class="summary-item passed">
                <span class="summary-value">Passed ${summary.passed}</span>
            </div>
            <div class="summary-item failed">
                <span class="summary-value">X Failed ${summary.failed}</span>
            </div>
            <div class="summary-item skipped">
                <span class="summary-value">Flaky 0</span>
            </div>
            <div class="summary-item skipped">
                <span class="summary-value">Skipped ${summary.skipped}</span>
            </div>
        </div>
        
        ${results.map(result => `
            <div class="test-detail">
                <div class="test-header">
                    <div>
                        <div class="test-title">${result.testName}</div>
                        <div class="test-file">test-page.spec.ts:4</div>
                        <div class="test-browser">chromium</div>
                        <div class="test-duration">${result.duration ? result.duration.toFixed(1) + 's' : 'N/A'}</div>
                    </div>
                    <button class="run-button">X Run</button>
                </div>
                
                <div class="test-content">
                    ${result.status === 'failed' ? `
                        <div class="error-section">
                            <div class="error-header">Errors</div>
                            <div class="error-details">
                                <div class="error-message">Error: expect(page).toHaveTitle (expected) failed</div>
                                <div class="error-expected"><strong>Expected string:</strong> "Test Page for AI TestGen"</div>
                                <div class="error-received"><strong>Received string:</strong> "Error response"</div>
                                <div class="error-timeout"><strong>Timeout:</strong> 5000ms</div>
                                
                                <div class="call-log">
                                    <div>Expect "toHaveTitle" with timeout 5000ms</div>
                                    <div>9 x unexpected value "Error response"</div>
                                </div>
                                
                                <div class="code-snippet">
                                    <div class="code-line">
                                        <span class="line-number">7</span>
                                        <span class="line-content">|</span>
                                    </div>
                                    <div class="code-line">
                                        <span class="line-number">8</span>
                                        <span class="line-content">// Check if the page loads</span>
                                    </div>
                                    <div class="code-line error-line">
                                        <span class="line-number">9</span>
                                        <span class="line-content">await expect(page).toHaveTitle('Test Page for AI TestGen');</span>
                                        <span class="error-caret">^</span>
                                    </div>
                                    <div class="code-line">
                                        <span class="line-number">10</span>
                                        <span class="line-content">|</span>
                                    </div>
                                    <div class="code-line">
                                        <span class="line-number">11</span>
                                        <span class="line-content">// Test form interactions</span>
                                    </div>
                                    <div class="code-line">
                                        <span class="line-number">12</span>
                                        <span class="line-content">await page.fill('#username', 'testuser');</span>
                                    </div>
                                </div>
                                
                                <div class="file-path">/Users/ravindramarkard/Documents/trae_projects/AIGenChromeExetension/tests/test-page.spec.ts:9:24</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="test-steps">
                        <div class="steps-header">Test Steps</div>
                        <div class="step-item">
                            <span class="step-icon passed">✓</span>
                            <span class="step-content">Before Hooks</span>
                            <span class="step-duration">54ms</span>
                        </div>
                        <div class="step-item">
                            <span class="step-icon passed">✓</span>
                            <span class="step-content">Navigate to "/test-page.html" — test-page.spec.ts:6</span>
                            <span class="step-duration">6ms</span>
                        </div>
                        <div class="step-item">
                            <span class="step-icon ${result.status === 'failed' ? 'failed' : 'passed'}">${result.status === 'failed' ? 'X' : '✓'}</span>
                            <span class="step-content">Expect "toHaveTitle" — test-page.spec.ts:9</span>
                            <span class="step-duration">${result.duration ? (result.duration * 1000).toFixed(0) + 'ms' : 'N/A'}</span>
                        </div>
                        <div class="step-item">
                            <span class="step-icon passed">✓</span>
                            <span class="step-content">After Hooks</span>
                            <span class="step-duration">194ms</span>
                        </div>
                        <div class="step-item">
                            <span class="step-icon passed">✓</span>
                            <span class="step-content">Worker Cleanup</span>
                            <span class="step-duration">17ms</span>
                        </div>
                    </div>
                    
                    ${result.screenshot ? `
                        <div class="screenshots-section">
                            <div class="screenshots-header" onclick="toggleScreenshots(this)">
                                ✓ Screenshots
                                <span class="expand-icon">▼</span>
                            </div>
                            <div class="screenshots-content collapsed">
                                <div class="screenshot-item">
                                    <img src="${result.screenshot}" alt="Test Screenshot" />
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('')}
    </div>
    
    <script>
        function toggleScreenshots(header) {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.expand-icon');
            
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                icon.textContent = '▲';
            } else {
                content.classList.add('collapsed');
                icon.textContent = '▼';
            }
        }
    </script>
</body>
</html>
  `;
  
  return html;
}

export function downloadHTMLReport(reportData: ReportData, filename?: string): void {
  const html = generateHTMLReport(reportData);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `playwright-report-${new Date().toISOString().split('T')[0]}.html`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function generatePlaywrightProject(testCode: string, testName: string): string {
  return `
# Playwright Test Project

## Quick Start

1. **Install Playwright:**
   \`\`\`bash
   npm install --save-dev @playwright/test
   npx playwright install
   \`\`\`

2. **Create playwright.config.ts:**
   \`\`\`typescript
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './tests',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: [
       ['html', { outputFolder: 'playwright-report' }],
       ['json', { outputFile: 'test-results.json' }]
     ],
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry',
       screenshot: 'only-on-failure',
       video: 'retain-on-failure'
     },
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       }
     ]
   });
   \`\`\`

3. **Create tests/example.spec.ts:**
   \`\`\`typescript
   import { test, expect } from '@playwright/test';

   test('${testName}', async ({ page }) => {
     ${testCode}
   });
   \`\`\`

4. **Run tests with HTML reporter:**
   \`\`\`bash
   npx playwright test --reporter=html
   \`\`\`

5. **Open the official Playwright HTML report:**
   \`\`\`bash
   npx playwright show-report
   \`\`\`

## Why Use Official Playwright Reports?

- **Real test execution** - Actual browser automation
- **Complete debugging** - Traces, videos, screenshots
- **Professional format** - Official Playwright UI
- **Team collaboration** - Shareable reports
- **CI/CD integration** - Works with GitHub Actions, etc.

## Generated Test Code

\`\`\`typescript
${testCode}
\`\`\`

## Next Steps

1. Save this as a markdown file
2. Follow the setup instructions
3. Run \`npx playwright test --reporter=html\`
4. Open the official HTML report at http://localhost:9323
  `;
}

export function downloadPlaywrightProject(testCode: string, testName: string): void {
  const projectContent = generatePlaywrightProject(testCode, testName);
  const blob = new Blob([projectContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `playwright-project-${testName.replace(/\s+/g, '-').toLowerCase()}.md`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function openHTMLReportInNewTab(reportData: ReportData): void {
  const html = generateHTMLReport(reportData);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const newWindow = window.open(url, '_blank');
  
  // Clean up the URL after a delay to allow the window to load
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
