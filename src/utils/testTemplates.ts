import { TestFramework, ElementData, TestAction } from '../types';

export interface TestTemplate {
  framework: TestFramework;
  generateTest: (actions: TestAction[], elements: ElementData[], options?: TestGenerationOptions) => string;
}

export interface TestGenerationOptions {
  includeComments?: boolean;
  usePageObjectModel?: boolean;
  testName?: string;
  baseUrl?: string;
}

// Playwright Templates
export const playwrightTemplate: TestTemplate = {
  framework: { 
    id: 'playwright-js', 
    name: 'Playwright (JavaScript)', 
    language: 'JavaScript',
    description: 'Modern end-to-end testing framework',
    icon: '🎭' 
  },
  generateTest: (actions, elements, options = {}) => {
    const { includeComments = true, usePageObjectModel = false, testName = 'Generated Test', baseUrl = 'https://example.com' } = options;
    
    let code = '';
    
    if (includeComments) {
      code += `// Generated test using AI TestGen\n`;
      code += `// Framework: Playwright (JavaScript)\n`;
      code += `// Generated on: ${new Date().toISOString()}\n\n`;
    }
    
    code += `import { test, expect } from '@playwright/test';\n\n`;
    
    if (usePageObjectModel) {
      code += generatePageObjectModel(elements, 'playwright-js');
      code += `\n`;
    }
    
    code += `test('${testName}', async ({ page }) => {\n`;
    code += `  await page.goto('${baseUrl}');\n\n`;
    
    actions.forEach((action, index) => {
      const element = action.element;
      if (!element) return;
      
      if (includeComments) {
        code += `  // ${action.type} on ${element.tagName}\n`;
      }
      
      const selector = element.cssSelector || element.xpath;
      
      switch (action.type) {
        case 'click':
          code += `  await page.click('${selector}');\n`;
          break;
        case 'type':
          code += `  await page.fill('${selector}', '${action.value || 'test input'}');\n`;
          break;
        case 'hover':
          code += `  await page.hover('${selector}');\n`;
          break;
        case 'select':
          code += `  await page.selectOption('${selector}', '${action.value || 'option1'}');\n`;
          break;
        case 'assert':
          code += `  await expect(page.locator('${selector}')).toBeVisible();\n`;
          break;
        default:
          code += `  // TODO: Implement ${action.type} action\n`;
      }
      
      if (index < actions.length - 1) code += `\n`;
    });
    
    code += `});\n`;
    
    return code;
  }
};

export const playwrightPythonTemplate: TestTemplate = {
  framework: { 
    id: 'playwright-python', 
    name: 'Playwright (Python)', 
    language: 'Python',
    description: 'Modern end-to-end testing framework for Python',
    icon: '🎭' 
  },
  generateTest: (actions, elements, options = {}) => {
    const { includeComments = true, usePageObjectModel = false, testName = 'test_generated', baseUrl = 'https://example.com' } = options;
    
    let code = '';
    
    if (includeComments) {
      code += `# Generated test using AI TestGen\n`;
      code += `# Framework: Playwright (Python)\n`;
      code += `# Generated on: ${new Date().toISOString()}\n\n`;
    }
    
    code += `import pytest\nfrom playwright.sync_api import Page, expect\n\n`;
    
    if (usePageObjectModel) {
      code += generatePageObjectModel(elements, 'playwright-python');
      code += `\n`;
    }
    
    code += `def ${testName}(page: Page):\n`;
    code += `    page.goto("${baseUrl}")\n\n`;
    
    actions.forEach((action, index) => {
      const element = action.element;
      if (!element) return;
      
      if (includeComments) {
        code += `    # ${action.type} on ${element.tagName}\n`;
      }
      
      const selector = element.cssSelector || element.xpath;
      
      switch (action.type) {
        case 'click':
          code += `    page.click("${selector}")\n`;
          break;
        case 'type':
          code += `    page.fill("${selector}", "${action.value || 'test input'}")\n`;
          break;
        case 'hover':
          code += `    page.hover("${selector}")\n`;
          break;
        case 'select':
          code += `    page.select_option("${selector}", "${action.value || 'option1'}")\n`;
          break;
        case 'assert':
          code += `    expect(page.locator("${selector}")).to_be_visible()\n`;
          break;
        default:
          code += `    # TODO: Implement ${action.type} action\n`;
      }
      
      if (index < actions.length - 1) code += `\n`;
    });
    
    return code;
  }
};

// Cypress Templates
export const cypressTemplate: TestTemplate = {
  framework: { 
    id: 'cypress-js', 
    name: 'Cypress (JavaScript)', 
    language: 'JavaScript',
    description: 'Fast, easy and reliable testing for anything that runs in a browser',
    icon: '🌲' 
  },
  generateTest: (actions, elements, options = {}) => {
    const { includeComments = true, usePageObjectModel = false, testName = 'Generated Test', baseUrl = 'https://example.com' } = options;
    
    let code = '';
    
    if (includeComments) {
      code += `// Generated test using AI TestGen\n`;
      code += `// Framework: Cypress (JavaScript)\n`;
      code += `// Generated on: ${new Date().toISOString()}\n\n`;
    }
    
    if (usePageObjectModel) {
      code += generatePageObjectModel(elements, 'cypress-js');
      code += `\n`;
    }
    
    code += `describe('${testName}', () => {\n`;
    code += `  it('should perform automated test actions', () => {\n`;
    code += `    cy.visit('${baseUrl}');\n\n`;
    
    actions.forEach((action, index) => {
      const element = action.element;
      if (!element) return;
      
      if (includeComments) {
        code += `    // ${action.type} on ${element.tagName}\n`;
      }
      
      const selector = element.cssSelector || element.xpath;
      
      switch (action.type) {
        case 'click':
          code += `    cy.get('${selector}').click();\n`;
          break;
        case 'type':
          code += `    cy.get('${selector}').type('${action.value || 'test input'}');\n`;
          break;
        case 'hover':
          code += `    cy.get('${selector}').trigger('mouseover');\n`;
          break;
        case 'select':
          code += `    cy.get('${selector}').select('${action.value || 'option1'}');\n`;
          break;
        case 'assert':
          code += `    cy.get('${selector}').should('be.visible');\n`;
          break;
        default:
          code += `    // TODO: Implement ${action.type} action\n`;
      }
      
      if (index < actions.length - 1) code += `\n`;
    });
    
    code += `  });\n`;
    code += `});\n`;
    
    return code;
  }
};

// Selenium Templates
export const seleniumJavaTemplate: TestTemplate = {
  framework: { 
    id: 'selenium-java', 
    name: 'Selenium (Java)', 
    language: 'Java',
    description: 'Browser automation framework for Java',
    icon: '☕' 
  },
  generateTest: (actions, elements, options = {}) => {
    const { includeComments = true, usePageObjectModel = false, testName = 'GeneratedTest', baseUrl = 'https://example.com' } = options;
    
    let code = '';
    
    if (includeComments) {
      code += `// Generated test using AI TestGen\n`;
      code += `// Framework: Selenium (Java)\n`;
      code += `// Generated on: ${new Date().toISOString()}\n\n`;
    }
    
    code += `import org.junit.jupiter.api.Test;\n`;
    code += `import org.junit.jupiter.api.BeforeEach;\n`;
    code += `import org.junit.jupiter.api.AfterEach;\n`;
    code += `import org.openqa.selenium.WebDriver;\n`;
    code += `import org.openqa.selenium.WebElement;\n`;
    code += `import org.openqa.selenium.By;\n`;
    code += `import org.openqa.selenium.chrome.ChromeDriver;\n`;
    code += `import org.openqa.selenium.support.ui.Select;\n`;
    code += `import org.openqa.selenium.interactions.Actions;\n\n`;
    
    if (usePageObjectModel) {
      code += generatePageObjectModel(elements, 'selenium-java');
      code += `\n`;
    }
    
    code += `public class ${testName} {\n`;
    code += `    private WebDriver driver;\n`;
    code += `    private Actions actions;\n\n`;
    
    code += `    @BeforeEach\n`;
    code += `    public void setUp() {\n`;
    code += `        driver = new ChromeDriver();\n`;
    code += `        actions = new Actions(driver);\n`;
    code += `        driver.get("${baseUrl}");\n`;
    code += `    }\n\n`;
    
    code += `    @Test\n`;
    code += `    public void testAutomatedActions() {\n`;
    
    actions.forEach((action, index) => {
      const element = action.element;
      if (!element) return;
      
      if (includeComments) {
        code += `        // ${action.type} on ${element.tagName}\n`;
      }
      
      const selector = element.cssSelector || element.xpath;
      const locatorMethod = element.cssSelector ? 'cssSelector' : 'xpath';
      
      switch (action.type) {
        case 'click':
          code += `        WebElement element${index} = driver.findElement(By.${locatorMethod}("${selector}"));\n`;
          code += `        element${index}.click();\n`;
          break;
        case 'type':
          code += `        WebElement element${index} = driver.findElement(By.${locatorMethod}("${selector}"));\n`;
          code += `        element${index}.sendKeys("${action.value || 'test input'}");\n`;
          break;
        case 'hover':
          code += `        WebElement element${index} = driver.findElement(By.${locatorMethod}("${selector}"));\n`;
          code += `        actions.moveToElement(element${index}).perform();\n`;
          break;
        case 'select':
          code += `        WebElement element${index} = driver.findElement(By.${locatorMethod}("${selector}"));\n`;
          code += `        Select select${index} = new Select(element${index});\n`;
          code += `        select${index}.selectByVisibleText("${action.value || 'option1'}");\n`;
          break;
        case 'assert':
          code += `        WebElement element${index} = driver.findElement(By.${locatorMethod}("${selector}"));\n`;
          code += `        assert element${index}.isDisplayed();\n`;
          break;
        default:
          code += `        // TODO: Implement ${action.type} action\n`;
      }
      
      if (index < actions.length - 1) code += `\n`;
    });
    
    code += `    }\n\n`;
    
    code += `    @AfterEach\n`;
    code += `    public void tearDown() {\n`;
    code += `        if (driver != null) {\n`;
    code += `            driver.quit();\n`;
    code += `        }\n`;
    code += `    }\n`;
    code += `}\n`;
    
    return code;
  }
};

export const seleniumPythonTemplate: TestTemplate = {
  framework: { 
    id: 'selenium-python', 
    name: 'Selenium (Python)', 
    language: 'Python',
    description: 'Browser automation framework for Python',
    icon: '🐍' 
  },
  generateTest: (actions, elements, options = {}) => {
    const { includeComments = true, usePageObjectModel = false, testName = 'test_generated', baseUrl = 'https://example.com' } = options;
    
    let code = '';
    
    if (includeComments) {
      code += `# Generated test using AI TestGen\n`;
      code += `# Framework: Selenium (Python)\n`;
      code += `# Generated on: ${new Date().toISOString()}\n\n`;
    }
    
    code += `import pytest\n`;
    code += `from selenium import webdriver\n`;
    code += `from selenium.webdriver.common.by import By\n`;
    code += `from selenium.webdriver.support.ui import Select\n`;
    code += `from selenium.webdriver.common.action_chains import ActionChains\n`;
    code += `from selenium.webdriver.support.ui import WebDriverWait\n`;
    code += `from selenium.webdriver.support import expected_conditions as EC\n\n`;
    
    if (usePageObjectModel) {
      code += generatePageObjectModel(elements, 'selenium-python');
      code += `\n`;
    }
    
    code += `class TestAutomation:\n`;
    code += `    def setup_method(self):\n`;
    code += `        self.driver = webdriver.Chrome()\n`;
    code += `        self.driver.get("${baseUrl}")\n`;
    code += `        self.wait = WebDriverWait(self.driver, 10)\n\n`;
    
    code += `    def teardown_method(self):\n`;
    code += `        self.driver.quit()\n\n`;
    
    code += `    def ${testName}(self):\n`;
    
    actions.forEach((action, index) => {
      const element = action.element;
      if (!element) return;
      
      if (includeComments) {
        code += `        # ${action.type} on ${element.tagName}\n`;
      }
      
      const selector = element.cssSelector || element.xpath;
      const locatorMethod = element.cssSelector ? 'CSS_SELECTOR' : 'XPATH';
      
      switch (action.type) {
        case 'click':
          code += `        element = self.wait.until(EC.element_to_be_clickable((By.${locatorMethod}, "${selector}")))\n`;
          code += `        element.click()\n`;
          break;
        case 'type':
          code += `        element = self.wait.until(EC.presence_of_element_located((By.${locatorMethod}, "${selector}")))\n`;
          code += `        element.send_keys("${action.value || 'test input'}")\n`;
          break;
        case 'hover':
          code += `        element = self.driver.find_element(By.${locatorMethod}, "${selector}")\n`;
          code += `        ActionChains(self.driver).move_to_element(element).perform()\n`;
          break;
        case 'select':
          code += `        element = self.driver.find_element(By.${locatorMethod}, "${selector}")\n`;
          code += `        select = Select(element)\n`;
          code += `        select.select_by_visible_text("${action.value || 'option1'}")\n`;
          break;
        case 'assert':
          code += `        element = self.wait.until(EC.visibility_of_element_located((By.${locatorMethod}, "${selector}")))\n`;
          code += `        assert element.is_displayed()\n`;
          break;
        default:
          code += `        # TODO: Implement ${action.type} action\n`;
      }
      
      if (index < actions.length - 1) code += `\n`;
    });
    
    return code;
  }
};

// Page Object Model generator
function generatePageObjectModel(elements: ElementData[], framework: string): string {
  let code = '';
  
  switch (framework) {
    case 'playwright-js':
      code += `class PageObject {\n`;
      code += `  constructor(page) {\n`;
      code += `    this.page = page;\n`;
      elements.forEach((element, index) => {
        const name = generateElementName(element);
        code += `    this.${name} = '${element.cssSelector || element.xpath}';\n`;
      });
      code += `  }\n\n`;
      
      elements.forEach((element) => {
        const name = generateElementName(element);
        const methodName = `click${name.charAt(0).toUpperCase() + name.slice(1)}`;
        code += `  async ${methodName}() {\n`;
        code += `    await this.page.click(this.${name});\n`;
        code += `  }\n\n`;
      });
      code += `}\n`;
      break;
      
    case 'cypress-js':
      code += `class PageObject {\n`;
      elements.forEach((element) => {
        const name = generateElementName(element);
        code += `  get ${name}() {\n`;
        code += `    return cy.get('${element.cssSelector || element.xpath}');\n`;
        code += `  }\n\n`;
      });
      code += `}\n\n`;
      code += `const pageObject = new PageObject();\n`;
      break;
      
    case 'selenium-java':
      code += `public class PageObject {\n`;
      code += `    private WebDriver driver;\n\n`;
      code += `    public PageObject(WebDriver driver) {\n`;
      code += `        this.driver = driver;\n`;
      code += `    }\n\n`;
      
      elements.forEach((element) => {
        const name = generateElementName(element);
        const selector = element.cssSelector || element.xpath;
        const locatorMethod = element.cssSelector ? 'cssSelector' : 'xpath';
        
        code += `    public WebElement get${name.charAt(0).toUpperCase() + name.slice(1)}() {\n`;
        code += `        return driver.findElement(By.${locatorMethod}("${selector}"));\n`;
        code += `    }\n\n`;
      });
      code += `}\n`;
      break;
      
    case 'selenium-python':
      code += `class PageObject:\n`;
      code += `    def __init__(self, driver):\n`;
      code += `        self.driver = driver\n\n`;
      
      elements.forEach((element) => {
        const name = generateElementName(element);
        const selector = element.cssSelector || element.xpath;
        const locatorMethod = element.cssSelector ? 'CSS_SELECTOR' : 'XPATH';
        
        code += `    def get_${name}(self):\n`;
        code += `        return self.driver.find_element(By.${locatorMethod}, "${selector}")\n\n`;
      });
      break;
  }
  
  return code;
}

function generateElementName(element: ElementData): string {
  // Generate a meaningful name based on element properties
  let name = '';
  
  if (element.id) {
    name = element.id.replace(/[^a-zA-Z0-9]/g, '');
  } else if (element.className) {
    name = element.className.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  } else if (element.textContent) {
    name = element.textContent.toLowerCase().replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  } else {
    name = element.tagName.toLowerCase();
  }
  
  return name || 'element';
}

// Export all templates
export const testTemplates: TestTemplate[] = [
  playwrightTemplate,
  playwrightPythonTemplate,
  cypressTemplate,
  seleniumJavaTemplate,
  seleniumPythonTemplate
];

export function getTemplateByFramework(frameworkId: string): TestTemplate | undefined {
  return testTemplates.find(template => template.framework.id === frameworkId);
}