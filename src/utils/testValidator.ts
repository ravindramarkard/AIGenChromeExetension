import { TestFramework } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'syntax' | 'best-practice' | 'framework-specific';
}

export interface ValidationWarning {
  line: number;
  column: number;
  message: string;
  type: 'performance' | 'maintainability' | 'accessibility';
}

export class TestValidator {
  private framework: TestFramework;

  constructor(framework: TestFramework) {
    this.framework = framework;
  }

  validateCode(code: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Basic syntax validation
    const syntaxErrors = this.validateSyntax(code);
    errors.push(...syntaxErrors);

    // Framework-specific validation
    const frameworkErrors = this.validateFrameworkSpecific(code);
    errors.push(...frameworkErrors);

    // Best practices validation
    const bestPracticeWarnings = this.validateBestPractices(code);
    warnings.push(...bestPracticeWarnings);

    // Generate suggestions
    const codeSuggestions = this.generateSuggestions(code);
    suggestions.push(...codeSuggestions);

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private validateSyntax(code: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for common syntax issues based on language
      if (this.framework.language === 'JavaScript') {
        // Check for missing semicolons (basic check)
        if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && 
            !line.trim().endsWith('}') && !line.includes('//') && !line.includes('/*')) {
          const shouldHaveSemicolon = /^(const|let|var|await|return|\w+\()/.test(line.trim());
          if (shouldHaveSemicolon) {
            errors.push({
              line: lineNumber,
              column: line.length,
              message: 'Missing semicolon',
              severity: 'warning',
              type: 'syntax'
            });
          }
        }

        // Check for unmatched brackets
        const openBrackets = (line.match(/\{/g) || []).length;
        const closeBrackets = (line.match(/\}/g) || []).length;
        if (openBrackets !== closeBrackets && line.trim() !== '') {
          // This is a simple check - more sophisticated parsing would be needed for real validation
        }
      }

      if (this.framework.language === 'Python') {
        // Check for proper indentation (basic check)
        if (line.trim() && line.startsWith(' ') && line.search(/\S/) % 4 !== 0) {
          errors.push({
            line: lineNumber,
            column: 1,
            message: 'Inconsistent indentation - use 4 spaces',
            severity: 'warning',
            type: 'syntax'
          });
        }
      }

      if (this.framework.language === 'Java') {
        // Check for missing semicolons
        if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && 
            !line.trim().endsWith('}') && !line.includes('//') && !line.includes('/*')) {
          const shouldHaveSemicolon = /^(.*=|.*\)|return|throw)/.test(line.trim());
          if (shouldHaveSemicolon) {
            errors.push({
              line: lineNumber,
              column: line.length,
              message: 'Missing semicolon',
              severity: 'error',
              type: 'syntax'
            });
          }
        }
      }
    });

    return errors;
  }

  private validateFrameworkSpecific(code: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (this.framework.id.startsWith('playwright')) {
        // Check for proper Playwright patterns
        if (line.includes('page.click(') && !line.includes('await')) {
          errors.push({
            line: lineNumber,
            column: line.indexOf('page.click('),
            message: 'Playwright actions should be awaited',
            severity: 'error',
            type: 'framework-specific'
          });
        }

        if (line.includes('page.goto(') && !line.includes('await')) {
          errors.push({
            line: lineNumber,
            column: line.indexOf('page.goto('),
            message: 'page.goto() should be awaited',
            severity: 'error',
            type: 'framework-specific'
          });
        }
      }

      if (this.framework.id.startsWith('cypress')) {
        // Check for proper Cypress patterns
        if (line.includes('cy.wait(') && /cy\.wait\(\d+\)/.test(line)) {
          errors.push({
            line: lineNumber,
            column: line.indexOf('cy.wait('),
            message: 'Avoid hard waits in Cypress - use cy.wait() with aliases or proper assertions',
            severity: 'warning',
            type: 'framework-specific'
          });
        }

        if (line.includes('cy.get(') && line.includes('#') && !line.includes('[data-')) {
          errors.push({
            line: lineNumber,
            column: line.indexOf('cy.get('),
            message: 'Consider using data attributes instead of IDs for more stable selectors',
            severity: 'warning',
            type: 'framework-specific'
          });
        }
      }

      if (this.framework.id.startsWith('selenium')) {
        // Check for proper Selenium patterns
        if (line.includes('driver.findElement') && !line.includes('WebDriverWait')) {
          errors.push({
            line: lineNumber,
            column: line.indexOf('driver.findElement'),
            message: 'Consider using WebDriverWait for more reliable element location',
            severity: 'warning',
            type: 'framework-specific'
          });
        }

        if (line.includes('Thread.sleep')) {
          errors.push({
            line: lineNumber,
            column: line.indexOf('Thread.sleep'),
            message: 'Avoid Thread.sleep() - use WebDriverWait instead',
            severity: 'error',
            type: 'framework-specific'
          });
        }
      }
    });

    return errors;
  }

  private validateBestPractices(code: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for hardcoded values
      if (line.includes('"http://') || line.includes('"https://')) {
        warnings.push({
          line: lineNumber,
          column: line.indexOf('"http'),
          message: 'Consider using environment variables for URLs',
          type: 'maintainability'
        });
      }

      // Check for long lines
      if (line.length > 120) {
        warnings.push({
          line: lineNumber,
          column: 120,
          message: 'Line too long - consider breaking into multiple lines',
          type: 'maintainability'
        });
      }

      // Check for missing assertions
      if (line.includes('.click(') || line.includes('.type(') || line.includes('.fill(')) {
        const nextLines = lines.slice(index + 1, index + 3);
        const hasAssertion = nextLines.some(nextLine => 
          nextLine.includes('expect') || nextLine.includes('assert') || 
          nextLine.includes('should') || nextLine.includes('toHaveText') ||
          nextLine.includes('toBeVisible')
        );
        
        if (!hasAssertion) {
          warnings.push({
            line: lineNumber,
            column: 1,
            message: 'Consider adding an assertion after this action to verify the expected outcome',
            type: 'maintainability'
          });
        }
      }
    });

    return warnings;
  }

  private generateSuggestions(code: string): string[] {
    const suggestions: string[] = [];

    // Analyze code patterns and suggest improvements
    if (!code.includes('data-testid') && !code.includes('data-test')) {
      suggestions.push('Consider using data-testid attributes for more stable element selection');
    }

    if (this.framework.id.startsWith('playwright') && !code.includes('page.waitForLoadState')) {
      suggestions.push('Add page.waitForLoadState() after navigation for better reliability');
    }

    if (this.framework.id.startsWith('cypress') && !code.includes('cy.intercept')) {
      suggestions.push('Consider using cy.intercept() to mock API calls for faster and more reliable tests');
    }

    if (!code.includes('// ') && !code.includes('/* ')) {
      suggestions.push('Add comments to explain complex test logic and business requirements');
    }

    if (code.split('\n').length > 50) {
      suggestions.push('Consider breaking this test into smaller, focused test cases');
    }

    return suggestions;
  }

  static getFrameworkSpecificRules(framework: TestFramework): string[] {
    const rules: string[] = [];

    if (framework.id.startsWith('playwright')) {
      rules.push('Always await Playwright actions and assertions');
      rules.push('Use page.locator() for better element handling');
      rules.push('Prefer data-testid over CSS selectors');
      rules.push('Use page.waitForLoadState() after navigation');
    }

    if (framework.id.startsWith('cypress')) {
      rules.push('Avoid hard waits - use proper assertions instead');
      rules.push('Chain commands when possible for better readability');
      rules.push('Use cy.intercept() for API mocking');
      rules.push('Prefer data attributes over IDs or classes');
    }

    if (framework.id.startsWith('selenium')) {
      rules.push('Use WebDriverWait instead of Thread.sleep()');
      rules.push('Implement Page Object Model for better maintainability');
      rules.push('Use explicit waits over implicit waits');
      rules.push('Handle stale element exceptions properly');
    }

    return rules;
  }
}

export function validateTestCode(code: string, framework: TestFramework): ValidationResult {
  const validator = new TestValidator(framework);
  return validator.validateCode(code);
}