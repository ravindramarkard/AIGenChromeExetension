// Register the AI TestGen panel in Chrome DevTools
chrome.devtools.panels.create(
  'AI TestGen',
  'icons/icon16.png',
  'panel.html',
  (panel) => {
    console.log('AI TestGen DevTools panel created');
    
    // Panel event listeners
    panel.onShown.addListener((window) => {
      console.log('AI TestGen panel shown');
      // Send message to panel when it's shown
      window.postMessage({ type: 'PANEL_SHOWN' }, '*');
    });
    
    panel.onHidden.addListener(() => {
      console.log('AI TestGen panel hidden');
    });
  }
);