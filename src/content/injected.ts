// This script runs in the page context (not content script context)
// It can access the page's JavaScript variables and functions

interface PageContextMessage {
  type: string;
  data?: any;
}

// Listen for messages from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const message: PageContextMessage = event.data;
  
  switch (message.type) {
    case 'GET_PAGE_INFO':
      handleGetPageInfo();
      break;
    case 'EXECUTE_SCRIPT':
      handleExecuteScript(message.data);
      break;
    default:
      break;
  }
});

function handleGetPageInfo() {
  const pageInfo = {
    url: window.location.href,
    title: document.title,
    frameworks: detectFrameworks(),
    forms: getFormInfo(),
    buttons: getButtonInfo(),
    links: getLinkInfo()
  };
  
  // Send back to content script
  window.postMessage({
    type: 'PAGE_INFO_RESPONSE',
    data: pageInfo
  }, '*');
}

function detectFrameworks(): string[] {
  const frameworks: string[] = [];
  
  // Detect React
  if ((window as any).React || document.querySelector('[data-reactroot]') || 
      document.querySelector('[data-react-checksum]')) {
    frameworks.push('React');
  }
  
  // Detect Vue
  if ((window as any).Vue || document.querySelector('[data-v-]')) {
    frameworks.push('Vue');
  }
  
  // Detect Angular
  if ((window as any).angular || document.querySelector('[ng-app]') || 
      document.querySelector('[data-ng-app]')) {
    frameworks.push('Angular');
  }
  
  // Detect jQuery
  if ((window as any).jQuery || (window as any).$) {
    frameworks.push('jQuery');
  }
  
  return frameworks;
}

function getFormInfo() {
  const forms = Array.from(document.forms).map(form => ({
    id: form.id,
    name: form.name,
    action: form.action,
    method: form.method,
    fields: Array.from(form.elements).map(element => ({
      name: (element as HTMLInputElement).name,
      type: (element as HTMLInputElement).type,
      id: element.id,
      required: (element as HTMLInputElement).required
    }))
  }));
  
  return forms;
}

function getButtonInfo() {
  const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
    .map(button => ({
      id: button.id,
      text: button.textContent?.trim() || (button as HTMLInputElement).value,
      type: (button as HTMLInputElement).type || 'button',
      className: button.className
    }));
  
  return buttons;
}

function getLinkInfo() {
  const links = Array.from(document.querySelectorAll('a[href]'))
    .map(link => ({
      href: (link as HTMLAnchorElement).href,
      text: link.textContent?.trim(),
      id: link.id,
      className: link.className
    }));
  
  return links;
}

function handleExecuteScript(scriptData: any) {
  try {
    // Execute custom script in page context
    if (scriptData.code) {
      eval(scriptData.code);
    }
    
    window.postMessage({
      type: 'SCRIPT_EXECUTION_RESPONSE',
      data: { success: true }
    }, '*');
  } catch (error) {
    window.postMessage({
      type: 'SCRIPT_EXECUTION_RESPONSE',
      data: { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }, '*');
  }
}

// Signal that the injected script is ready
window.postMessage({
  type: 'INJECTED_SCRIPT_READY'
}, '*');