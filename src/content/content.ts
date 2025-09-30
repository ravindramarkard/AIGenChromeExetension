import { ElementData, TestAction, InspectorState } from '../types';

class AITestGenContentScript {
  private inspectorState: InspectorState = {
    isActive: false,
    selectedElements: [],
    hoveredElement: undefined
  };

  private overlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private selectionCounter: HTMLDivElement | null = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    // Prevent multiple initializations
    if (this.initialized) {
      return;
    }
    
    this.initialized = true;
    
    // Listen for messages from popup and background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'startInspecting':
          this.startInspecting();
          sendResponse({ success: true });
          break;
          
        case 'stopInspecting':
          this.stopInspecting();
          sendResponse({ success: true });
          break;
          
        case 'ping':
          sendResponse({ success: true, message: 'Content script is ready' });
          break;
          
        case 'getSelectedElements':
          sendResponse({ 
            success: true, 
            count: this.inspectorState.selectedElements.length,
            elements: this.inspectorState.selectedElements 
          });
          break;
          
        case 'generateTest':
          this.generateTest(request.settings, request.testScenario);
          sendResponse({ success: true });
          break;
          
        case 'runTest':
          this.runTest(request.test, request.mode);
          sendResponse({ success: true });
          break;
          
        case 'clearSelection':
          this.clearSelection();
          sendResponse({ success: true });
          break;
          
        case 'notifyDevTools':
          // Forward message to DevTools panel
          window.postMessage({
            type: request.type,
            data: request.data
          }, '*');
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
      
      return true; // Keep message channel open for async response
    });
    
    this.createOverlay();
    this.createTooltip();
    this.createSelectionCounter();
  }

  private createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'ai-testgen-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(59, 130, 246, 0.1);
      z-index: 999999;
      pointer-events: none;
      display: none;
    `;
    document.body.appendChild(this.overlay);
  }

  private createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'ai-testgen-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: #2d3748;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 1000000;
      pointer-events: none;
      display: none;
      max-width: 280px;
      min-width: 200px;
      word-wrap: break-word;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
    `;
    document.body.appendChild(this.tooltip);
  }

  private createSelectionCounter() {
    this.selectionCounter = document.createElement('div');
    this.selectionCounter.className = 'ai-testgen-counter';
    this.selectionCounter.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1f2937;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: none;
    `;
    document.body.appendChild(this.selectionCounter);
  }

  private startInspecting() {
    this.inspectorState.isActive = true;
    this.overlay!.style.display = 'block';
    
    // Add event listeners
    document.addEventListener('mouseover', this.handleMouseOver);
    document.addEventListener('mouseout', this.handleMouseOut);
    document.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Show instructions and selection counter
    this.showInstructions();
    this.updateSelectionCounterDisplay();
  }

  private stopInspecting() {
    this.inspectorState.isActive = false;
    this.overlay!.style.display = 'none';
    this.tooltip!.style.display = 'none';
    this.selectionCounter!.style.display = 'none';
    
    // Remove event listeners
    document.removeEventListener('mouseover', this.handleMouseOver);
    document.removeEventListener('mouseout', this.handleMouseOut);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Remove highlights
    this.removeAllHighlights();
  }

  private handleMouseOver = (event: MouseEvent) => {
    if (!this.inspectorState.isActive) return;
    
    const element = event.target as HTMLElement;
    if (this.isIgnoredElement(element)) return;
    
    this.highlightElement(element);
    this.showTooltip(element, event);
    this.inspectorState.hoveredElement = this.getElementData(element);
  };

  private handleMouseOut = (event: MouseEvent) => {
    if (!this.inspectorState.isActive) return;
    
    const element = event.target as HTMLElement;
    if (this.isIgnoredElement(element)) return;
    
    this.removeHighlight(element);
    this.hideTooltip();
    this.inspectorState.hoveredElement = undefined;
  };

  private handleClick = (event: MouseEvent) => {
    if (!this.inspectorState.isActive) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target as HTMLElement;
    if (this.isIgnoredElement(element)) return;
    
    const elementData = this.getElementData(element);
    
    // Check if element is already selected
    const existingIndex = this.inspectorState.selectedElements.findIndex(
      el => el.xpath === elementData.xpath
    );
    
    if (existingIndex >= 0) {
      // Remove from selection
      this.inspectorState.selectedElements.splice(existingIndex, 1);
      this.removeSelectionHighlight(element);
    } else {
      // Add to selection
      this.inspectorState.selectedElements.push(elementData);
      this.addSelectionHighlight(element);
    }
    
    this.updateSelectionCount();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.inspectorState.isActive) return;
    
    switch (event.key) {
      case 'Escape':
        this.stopInspecting();
        break;
      case 'Enter':
        if (this.inspectorState.selectedElements.length > 0) {
          this.stopInspecting();
          this.generateTestFromSelection();
        }
        break;
      case 'Delete':
      case 'Backspace':
        this.clearSelection();
        break;
    }
  };

  private isIgnoredElement(element: HTMLElement): boolean {
    return (
      element.id === 'ai-testgen-overlay' ||
      element.id === 'ai-testgen-tooltip' ||
      element.closest('#ai-testgen-overlay') !== null ||
      element.closest('#ai-testgen-tooltip') !== null
    );
  }

  private getElementData(element: HTMLElement): ElementData {
    const rect = element.getBoundingClientRect();
    const xpath = this.getXPath(element);
    const cssSelector = this.getCSSSelector(element);
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: element.textContent?.trim().substring(0, 100) || undefined,
      attributes: this.getElementAttributes(element),
      xpath,
      cssSelector,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      } as DOMRect,
      isVisible: this.isElementVisible(element)
    };
  }

  private getElementAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  private getXPath(element: HTMLElement): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const part = index > 1 ? `${tagName}[${index}]` : tagName;
      parts.unshift(part);
      
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }

  private getCSSSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const path: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        const classes = current.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      // Stop at body or if we have a unique selector
      if (!current || current.tagName === 'BODY') {
        break;
      }
    }
    
    return path.join(' > ');
  }

  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  private highlightElement(element: HTMLElement) {
    // Remove any existing highlight classes first
    element.classList.remove('ai-testgen-hover', 'ai-testgen-selected');
    // Add hover highlight if not already selected
    if (!this.isElementSelected(element)) {
      element.classList.add('ai-testgen-hover');
    }
  }

  private removeHighlight(element: HTMLElement) {
    element.classList.remove('ai-testgen-hover');
    // Re-add selection highlight if element is selected
    if (this.isElementSelected(element)) {
      element.classList.add('ai-testgen-selected');
    }
  }

  private addSelectionHighlight(element: HTMLElement) {
    element.classList.remove('ai-testgen-hover');
    element.classList.add('ai-testgen-selected');
  }

  private removeSelectionHighlight(element: HTMLElement) {
    element.classList.remove('ai-testgen-selected', 'ai-testgen-hover');
  }

  private isElementSelected(element: HTMLElement): boolean {
    const elementData = this.getElementData(element);
    return this.inspectorState.selectedElements.some(selected => selected.xpath === elementData.xpath);
  }

  private removeAllHighlights() {
    // Remove all hover highlights
    const hoverElements = document.querySelectorAll('.ai-testgen-hover');
    hoverElements.forEach(el => {
      el.classList.remove('ai-testgen-hover');
    });
    
    // Remove all selection highlights
    const selectedElements = document.querySelectorAll('.ai-testgen-selected');
    selectedElements.forEach(el => {
      el.classList.remove('ai-testgen-selected');
    });
  }

  private showTooltip(element: HTMLElement, event: MouseEvent) {
    if (!this.tooltip) return;
    
    const elementData = this.getElementData(element);
    const isSelected = this.isElementSelected(element);
    
    // Get element dimensions
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    
    // Get classes as a string
    const classes = elementData.className || '';
    
    const content = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
        <div style="color: #ffffff; font-weight: 500; margin-bottom: 2px;">
          <strong>Tag:</strong> ${elementData.tagName.toLowerCase()}
        </div>
        ${classes ? `<div style="color: #ffffff; font-weight: 500; margin-bottom: 2px;">
          <strong>Classes:</strong> ${classes}
        </div>` : ''}
        <div style="color: #ffffff; font-weight: 500; margin-bottom: 2px;">
          <strong>Size:</strong> ${width}x${height}
        </div>
        ${elementData.id ? `<div style="color: #ffffff; font-weight: 500; margin-bottom: 2px;">
          <strong>ID:</strong> ${elementData.id}
        </div>` : ''}
        ${isSelected ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; color: #10b981;">
          ✓ Selected - Click to deselect
        </div>` : `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; color: #9ca3af;">
          Click to select • ESC to exit
        </div>`}
      </div>
    `;
    
    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${event.clientX + 10}px`;
    this.tooltip.style.top = `${event.clientY - 10}px`;
  }

  private hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private showInstructions() {
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    instructions.innerHTML = `
      <div style="text-align: center;">
        <div style="font-weight: bold; margin-bottom: 8px;">🎯 AI TestGen Inspector</div>
        <div style="font-size: 12px; opacity: 0.9;">
          Hover to preview • Click to select • ESC to exit • Enter to generate test
        </div>
      </div>
    `;
    
    document.body.appendChild(instructions);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (instructions.parentNode) {
        instructions.parentNode.removeChild(instructions);
      }
    }, 5000);
  }

  private updateSelectionCount() {
    // Send update to popup if it's open
    chrome.runtime.sendMessage({
      action: 'updateSelectionCount',
      count: this.inspectorState.selectedElements.length
    }).catch(() => {
      // Popup might be closed, ignore error
    });
    
    // Update the visual counter
    this.updateSelectionCounterDisplay();
  }

  private updateSelectionCounterDisplay() {
    if (!this.selectionCounter) return;
    
    const count = this.inspectorState.selectedElements.length;
    
    if (this.inspectorState.isActive) {
      this.selectionCounter.style.display = 'block';
      this.selectionCounter.innerHTML = `
        <span style="font-weight: bold;">🎯 ${count}</span> element${count !== 1 ? 's' : ''} selected
      `;
    } else {
      this.selectionCounter.style.display = 'none';
    }
  }

  private clearSelection() {
    this.inspectorState.selectedElements = [];
    this.removeAllHighlights();
    this.updateSelectionCount();
  }

  private async generateTest(settings: any, testScenario?: string) {
    console.log('🚀 Starting test generation with:', { settings, testScenario, selectedElements: this.inspectorState.selectedElements.length });
    
    if (this.inspectorState.selectedElements.length === 0) {
      alert('Please select elements first by clicking "Inspect" and selecting page elements');
      return;
    }

    if (!testScenario || !testScenario.trim()) {
      alert('Please describe your test scenario before generating the test');
      return;
    }

    // Create detailed test actions from selected elements
    const actions: TestAction[] = this.inspectorState.selectedElements.map((element, index) => ({
      type: this.inferActionType(element),
      element,
      description: this.generateElementDescription(element, index)
    }));

    // Create enhanced element data for better AI understanding
    const enhancedElements = this.inspectorState.selectedElements.map(element => ({
      ...element,
      context: this.getElementContext(element),
      interactionType: this.inferActionType(element),
      accessibility: this.getAccessibilityInfo(element)
    }));

    // Send to background for AI processing with enhanced prompt
    try {
      const requestData = {
        action: 'generateTest',
        data: {
          framework: settings.selectedFramework,
          actions,
          elements: enhancedElements,
          userPrompt: testScenario.trim(),
          pageContext: {
            url: window.location.href,
            title: document.title,
            elementCount: this.inspectorState.selectedElements.length
          }
        }
      };
      
      console.log('📤 Sending test generation request:', requestData);
      console.log('🔗 Extension context valid:', !!chrome.runtime?.id);
      
      // Add timeout to prevent hanging
      const response = await Promise.race([
        chrome.runtime.sendMessage(requestData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Message timeout after 30 seconds')), 30000)
        )
      ]);
      console.log('📥 Received response:', response);

      if (response.success) {
        // Save the generated test to storage for DevTools panel
        await chrome.runtime.sendMessage({
          action: 'saveTest',
          data: response.test
        });

        // Save to chat history as well
        const chatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: response.test.code,
          timestamp: Date.now(),
          codeBlocks: [{
            language: this.getLanguageFromFramework(settings.selectedFramework),
            code: response.test.code
          }]
        };
        
        await chrome.runtime.sendMessage({
          action: 'saveChatMessage',
          data: chatMessage
        });

        console.log('Test generated successfully:', response.test);
        
        // Send the generated test back to the popup
        console.log('Content script: Sending testGenerated message to popup', response.test);
        chrome.runtime.sendMessage({
          action: 'testGenerated',
          test: response.test
        }).then(() => {
          console.log('Content script: testGenerated message sent successfully');
        }).catch((error) => {
          console.error('Content script: Failed to send testGenerated message', error);
        });
        
        // Clear selection after successful generation
        this.clearSelection();
        this.stopInspecting();
      } else {
        console.error('Failed to generate test:', response.error);
        // Send error back to popup
        console.log('Content script: Sending testGenerationError message to popup', response.error);
        chrome.runtime.sendMessage({
          action: 'testGenerationError',
          error: response.error || 'Failed to generate test'
        }).then(() => {
          console.log('Content script: testGenerationError message sent successfully');
        }).catch((error) => {
          console.error('Content script: Failed to send testGenerationError message', error);
        });
      }
    } catch (error) {
      console.error('Error generating test:', error);
      
      let errorMessage = 'Error generating test. Please check your AI provider configuration.';
      
      // Check if extension context is invalidated
      if (!chrome.runtime?.id) {
        errorMessage = 'Extension context invalidated. Please reload the extension from chrome://extensions/';
      } else if (error instanceof Error) {
        if (error.message.includes('message channel closed')) {
          errorMessage = 'Communication error with extension. Please reload the extension and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your internet connection and AI provider settings.';
        } else {
          errorMessage = 'Error generating test: ' + error.message;
        }
      }
      
      // Send error back to popup
      chrome.runtime.sendMessage({
        action: 'testGenerationError',
        error: errorMessage
      });
    }
  }

  private getLanguageFromFramework(frameworkId: string): string {
    if (frameworkId.includes('python')) return 'python';
    if (frameworkId.includes('java')) return 'java';
    return 'typescript';
  }

  private generateElementDescription(element: ElementData, index: number): string {
    const tagName = element.tagName?.toLowerCase() || 'element';
    const id = element.id ? `#${element.id}` : '';
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const text = element.textContent?.trim().substring(0, 50) || '';
    const type = element.attributes.type ? `[type="${element.attributes.type}"]` : '';
    
    return `${tagName}${id}${className}${type}${text ? ` - "${text}"` : ''}`;
  }

  private getElementContext(element: ElementData): any {
    return {
      position: {
        x: Math.round(element.rect.x || 0),
        y: Math.round(element.rect.y || 0),
        width: Math.round(element.rect.width || 0),
        height: Math.round(element.rect.height || 0)
      },
      visible: element.isVisible,
      parent: element.tagName || null,
      siblings: 0
    };
  }

  private getAccessibilityInfo(element: ElementData): any {
    return {
      role: element.attributes.role || null,
      ariaLabel: element.attributes['aria-label'] || null,
      ariaDescribedBy: element.attributes['aria-describedby'] || null,
      tabIndex: element.attributes.tabindex || null,
      title: element.attributes.title || null
    };
  }

  private generateTestFromSelection() {
    chrome.runtime.sendMessage({
      action: 'getSettings'
    }).then(response => {
      if (response.success) {
        this.generateTest(response.settings);
      }
    });
  }

  private inferActionType(element: ElementData): TestAction['type'] {
    const tagName = element.tagName.toLowerCase();
    const type = element.attributes.type?.toLowerCase();
    
    if (tagName === 'button' || (tagName === 'input' && type === 'button') || (tagName === 'input' && type === 'submit')) {
      return 'click';
    }
    
    if (tagName === 'input' && (type === 'text' || type === 'email' || type === 'password' || !type)) {
      return 'type';
    }
    
    if (tagName === 'textarea') {
      return 'type';
    }
    
    if (tagName === 'select') {
      return 'select';
    }
    
    if (tagName === 'a') {
      return 'click';
    }
    
    // Default to click for most interactive elements
    return 'click';
  }

  private async runTest(test: any, mode: 'headed' | 'headless' = 'headless') {
    try {
      console.log('Content script received runTest message with test:', test, 'mode:', mode);
      
      // Validate test object
      if (!test) {
        console.error('No test provided to runTest');
        alert('Error: No test provided');
        return;
      }
      
      if (!test.code) {
        console.error('Test object missing code property:', test);
        alert('Error: Test code is missing');
        return;
      }
      
      console.log('Test code to execute:', test.code);
      console.log('Execution mode:', mode);
      
      if (mode === 'headed') {
        await this.runTestHeaded(test);
      } else {
        await this.runTestHeadless(test);
      }
      
    } catch (error) {
      console.error('Error in runTest method:', error);
      alert('❌ Failed to run test: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async runTestHeaded(test: any) {
    console.log('🎭 Running test in HEADED mode - Browser window will be visible');
    
    // Create a visual indicator that test is running
    this.showTestExecutionIndicator('headed');
    
    try {
      // Parse the test code to extract individual steps
      const testSteps = this.parseTestSteps(test.code);
      
      // Execute each step with visual feedback
      for (let i = 0; i < testSteps.length; i++) {
        const step = testSteps[i];
        console.log(`🎬 Executing step ${i + 1}/${testSteps.length}:`, step);
        
        // Show current step to user
        this.showCurrentStep(i + 1, testSteps.length, step);
        
        // Execute the step with delay for visibility
        await this.executeStepVisually(step);
        
        // Wait between steps for better visibility
        await this.delay(1000);
      }
      
      this.showTestResult('✅ Test completed successfully in headed mode!');
      
    } catch (error) {
      console.error('Error in headed test execution:', error);
      this.showTestResult('❌ Test failed in headed mode: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.hideTestExecutionIndicator();
    }
  }

  private async runTestHeadless(test: any) {
    console.log('🔇 Running test in HEADLESS mode - Background execution');
    
    // Show minimal indicator for headless mode
    this.showTestExecutionIndicator('headless');
    
    try {
      // Execute test code directly in background
      const script = document.createElement('script');
      
      // Safely escape the test code for injection
      const escapedCode = test.code
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      
      script.textContent = `
        (function() {
          try {
            console.log('=== AI TestGen: Headless Test Execution Started ===');
            console.log('Generated test code:');
            console.log('${escapedCode}');
            
            // Execute the test code in background
            ${test.code}
            
            console.log('=== Headless Test Execution Completed ===');
            
          } catch (execError) {
            console.error('Error during headless test execution:', execError);
            throw execError;
          }
        })();
      `;
      
      document.head.appendChild(script);
      document.head.removeChild(script);
      
      console.log('✅ Headless test execution completed');
      this.showTestResult('✅ Test completed successfully in headless mode! Check console for details.');
      
    } catch (error) {
      console.error('Error in headless test execution:', error);
      this.showTestResult('❌ Test failed in headless mode: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.hideTestExecutionIndicator();
    }
  }

  private parseTestSteps(testCode: string): string[] {
    // Simple parser to extract test steps
    // This is a basic implementation - in a real scenario, you'd parse the actual test framework syntax
    const lines = testCode.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
    const steps: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('click') || trimmed.includes('type') || trimmed.includes('fill') || 
          trimmed.includes('expect') || trimmed.includes('assert') || trimmed.includes('wait')) {
        steps.push(trimmed);
      }
    }
    
    return steps.length > 0 ? steps : [testCode];
  }

  private async executeStepVisually(step: string) {
    // Simulate step execution with visual feedback
    console.log('Executing step:', step);
    
    // Add visual highlighting for elements being interacted with
    if (step.includes('click') || step.includes('type') || step.includes('fill')) {
      // Try to find and highlight the target element
      this.highlightTargetElement(step);
    }
    
    // Simulate execution time
    await this.delay(500);
  }

  private highlightTargetElement(step: string) {
    // Simple element highlighting based on common selectors in the step
    const selectors = [
      /['"`]([^'"`]*?)['"`]/g, // Extract quoted strings (potential selectors)
      /getElementById\(['"`]([^'"`]*?)['"`]\)/g,
      /querySelector\(['"`]([^'"`]*?)['"`]\)/g
    ];
    
    for (const regex of selectors) {
      const matches = step.matchAll(regex);
      for (const match of matches) {
        try {
          const selector = match[1];
          const element = document.querySelector(selector) || document.getElementById(selector);
          if (element) {
            this.flashElement(element as HTMLElement);
            break;
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
    }
  }

  private flashElement(element: HTMLElement) {
    const originalStyle = element.style.cssText;
    element.style.cssText += `
      outline: 3px solid #ff6b6b !important;
      outline-offset: 2px !important;
      background-color: rgba(255, 107, 107, 0.1) !important;
      transition: all 0.3s ease !important;
    `;
    
    setTimeout(() => {
      element.style.cssText = originalStyle;
    }, 1000);
  }

  private showTestExecutionIndicator(mode: 'headed' | 'headless') {
    const indicator = document.createElement('div');
    indicator.id = 'ai-testgen-execution-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${mode === 'headed' ? '#4ade80' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const icon = mode === 'headed' ? '🎭' : '🔇';
    const text = mode === 'headed' ? 'Running Test (Headed Mode)' : 'Running Test (Headless Mode)';
    
    indicator.innerHTML = `${icon} ${text}`;
    document.body.appendChild(indicator);
  }

  private showCurrentStep(current: number, total: number, step: string) {
    let stepIndicator = document.getElementById('ai-testgen-step-indicator');
    if (!stepIndicator) {
      stepIndicator = document.createElement('div');
      stepIndicator.id = 'ai-testgen-step-indicator';
      stepIndicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #1e293b;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000000;
      `;
      document.body.appendChild(stepIndicator);
    }
    
    stepIndicator.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">Step ${current}/${total}</div>
      <div style="opacity: 0.8; word-break: break-word;">${step}</div>
    `;
  }

  private showTestResult(message: string) {
    const result = document.createElement('div');
    result.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      color: #1e293b;
      padding: 20px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 500;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 1000001;
      max-width: 400px;
      text-align: center;
      border: 2px solid ${message.includes('✅') ? '#10b981' : '#ef4444'};
    `;
    
    result.textContent = message;
    document.body.appendChild(result);
    
    setTimeout(() => {
      if (result.parentNode) {
        result.parentNode.removeChild(result);
      }
    }, 4000);
  }

  private hideTestExecutionIndicator() {
    const indicator = document.getElementById('ai-testgen-execution-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    const stepIndicator = document.getElementById('ai-testgen-step-indicator');
    if (stepIndicator) {
      stepIndicator.remove();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Prevent multiple instances
if (!(window as any).aiTestGenContentScript) {
  (window as any).aiTestGenContentScript = new AITestGenContentScript();
}