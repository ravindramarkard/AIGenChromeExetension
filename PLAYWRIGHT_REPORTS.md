# Playwright Reports Integration

## Overview

The AI TestGen extension now includes comprehensive Playwright report functionality, allowing users to view detailed test execution reports directly within the extension.

## Features

### 📊 Report Viewer
- **Summary Dashboard**: Overview of test results with pass/fail counts and duration
- **Test Results**: Detailed view of individual test executions
- **Artifacts**: Screenshots, videos, and traces from test runs
- **Interactive UI**: Easy navigation between different report sections

### 🎭 Playwright Configuration
- **HTML Reports**: Beautiful, interactive HTML reports
- **JSON Reports**: Machine-readable test results
- **JUnit Reports**: CI/CD integration support
- **Artifacts**: Screenshots, videos, and traces on failure

## How to Use

### 1. Generate Tests
1. Open the AI TestGen extension
2. Select "Playwright" framework (JavaScript or TypeScript)
3. Generate your test code

### 2. Run Tests
1. Go to the "Test Runner" tab
2. Select "Single Test" or "Test Suite"
3. Click "Run Test" or "Run Selected Tests"
4. Wait for test execution to complete

### 3. View Reports
1. After test execution, click the "Report" tab
2. View the comprehensive test report with:
   - **Summary**: Total tests, passed/failed counts, duration
   - **Results**: Individual test details and status
   - **Artifacts**: Screenshots, videos, and traces

## Report Features

### Summary Tab
- **Test Statistics**: Total, passed, failed, skipped counts
- **Duration**: Total execution time
- **Quick Actions**: Download report, re-run tests

### Results Tab
- **Test List**: All executed tests with status indicators
- **Status Icons**: Visual indicators for pass/fail/skip/running
- **Error Details**: Detailed error messages for failed tests
- **Duration**: Individual test execution times

### Artifacts Tab
- **Screenshots**: Visual evidence of test execution
- **Videos**: Full test execution recordings
- **Traces**: Detailed execution traces for debugging

## Playwright Configuration

The generated tests include comprehensive Playwright configuration for reports:

### TypeScript Configuration
```typescript
// playwright.config.ts
export default {
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  }
};
```

### JavaScript Configuration
```javascript
// playwright.config.js
module.exports = {
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  }
};
```

## Running Tests with Reports

### Command Line
```bash
# Run tests with HTML report
npx playwright test --reporter=html

# Run tests with multiple reporters
npx playwright test --reporter=html,json,junit

# Open HTML report
npx playwright show-report
```

### Generated Test Structure
```
your-project/
├── tests/
│   └── generated-test.spec.ts
├── playwright.config.ts
├── playwright-report/          # HTML report
│   └── index.html
├── test-results.json          # JSON report
└── test-results.xml           # JUnit report
```

## Report Types

### HTML Report
- **Interactive**: Click through test results
- **Visual**: Screenshots and videos embedded
- **Searchable**: Find specific tests quickly
- **Shareable**: Send links to team members

### JSON Report
- **Machine-readable**: Perfect for CI/CD integration
- **Structured**: Easy to parse programmatically
- **Complete**: All test data and metadata included

### JUnit Report
- **CI/CD Compatible**: Works with Jenkins, GitHub Actions, etc.
- **Standard Format**: Widely supported by testing tools
- **XML Structure**: Easy to integrate with existing pipelines

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test --reporter=html,junit
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Jenkins Integration
```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                sh 'npx playwright test --reporter=junit'
            }
            post {
                always {
                    junit 'test-results.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Report'
                    ])
                }
            }
        }
    }
}
```

## Troubleshooting

### Report Not Generated
- Ensure Playwright is properly installed
- Check that tests are actually running
- Verify file permissions for report directories

### Missing Artifacts
- Check Playwright configuration for screenshot/video settings
- Ensure tests are failing to trigger artifact capture
- Verify storage space and permissions

### Report Viewer Issues
- Refresh the extension if report doesn't load
- Check browser console for errors
- Ensure test execution completed successfully

## Best Practices

1. **Always Generate Reports**: Include report configuration in all test projects
2. **Use Artifacts**: Enable screenshots and videos for debugging
3. **CI/CD Integration**: Set up automated report generation in your pipeline
4. **Team Sharing**: Use HTML reports for team collaboration
5. **Debugging**: Use traces and videos to debug failing tests

## Support

For issues with Playwright reports:
- Check the [Playwright Documentation](https://playwright.dev/docs/test-reporters)
- Review the [Report Viewer](https://playwright.dev/docs/test-reporters#html-reporter) documentation
- Open an issue in the AI TestGen repository
