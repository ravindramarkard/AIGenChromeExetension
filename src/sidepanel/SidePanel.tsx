import React, { useState, useEffect } from 'react';
import { Settings, Play, Code, Zap, Brain, Key, Wifi, WifiOff, CheckCircle, XCircle, Loader, MessageSquarePlus } from 'lucide-react';
import { TEST_FRAMEWORKS, AI_PROVIDERS, ExtensionSettings, TestFramework, AIProvider, ConnectionStatus, LocalSetupConfig, OpenRouterConfig, GeneratedTest } from '../types';

const SidePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'settings'>('generate');
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElements, setSelectedElements] = useState<number>(0);
  const [isInspecting, setIsInspecting] = useState(false);
  const [testScenario, setTestScenario] = useState<string>('');
  const [testMode, setTestMode] = useState<'headed' | 'headless'>('headless');
  const [showExecutionModeModal, setShowExecutionModeModal] = useState(false);
  
  // New state for test generation and display
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    checkSelectedElements();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        setSettings(response.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: ExtensionSettings) => {
    try {
      await chrome.runtime.sendMessage({ action: 'updateSettings', data: newSettings });
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const checkSelectedElements = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedElements' });
        if (response?.success) {
          setSelectedElements(response.count || 0);
        }
      }
    } catch (error) {
      console.error('Failed to check selected elements:', error);
    }
  };

  const startInspecting = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        alert('No active tab found. Please refresh the page and try again.');
        return;
      }

      // First, try to inject the content script if it's not already present
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (injectionError) {
        // Content script might already be injected, continue
        console.log('Content script injection skipped (might already be present)');
      }

      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now try to start inspecting
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'startInspecting' });
        if (response?.success) {
          setIsInspecting(true);
          window.close();
        } else {
          throw new Error('Failed to start inspection mode');
        }
      } catch (messageError) {
        // If content script communication fails, try injecting again
        console.log('Retrying content script injection...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Wait and try again
        await new Promise(resolve => setTimeout(resolve, 200));
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'startInspecting' });
        if (response?.success) {
          setIsInspecting(true);
          window.close();
        } else {
          throw new Error('Unable to communicate with page. Please refresh and try again.');
        }
      }
    } catch (error) {
      console.error('Failed to start inspecting:', error);
      alert(`Failed to start inspection: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page and try again.`);
      setIsInspecting(false);
    }
  };

  const generateTest = async () => {
    if (!settings) {
      alert('Please configure your settings first');
      return;
    }
    
    setIsLoading(true);
    setIsGenerating(true);
    setGeneratedTest(null);
    setGenerationError(null);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        setGenerationError('No active tab found');
        return;
      }

      // Check if content script is available
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch (error) {
        // Inject content script if not available
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          // Wait a moment for initialization
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (injectionError) {
          console.error('Failed to inject content script:', injectionError);
          setGenerationError('Failed to initialize on this page. Please refresh and try again.');
          return;
        }
      }

      // Send generate test message with test scenario
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'generateTest', 
        settings,
        testScenario: testScenario.trim()
      });
      
      if (response?.success) {
        // Listen for the generated test result
        const handleTestGenerated = (message: any) => {
          console.log('Popup: Received message', message);
          if (message.action === 'testGenerated') {
            console.log('Popup: Setting generated test', message.test);
            setGeneratedTest(message.test);
            setIsGenerating(false);
            chrome.runtime.onMessage.removeListener(handleTestGenerated);
          } else if (message.action === 'testGenerationError') {
            console.log('Popup: Setting generation error', message.error);
            setGenerationError(message.error || 'Failed to generate test');
            setIsGenerating(false);
            chrome.runtime.onMessage.removeListener(handleTestGenerated);
          }
        };
        
        chrome.runtime.onMessage.addListener(handleTestGenerated);
        
        // Set a timeout to handle cases where the message might not arrive
        setTimeout(() => {
          if (isGenerating) {
            setGenerationError('Test generation timed out. Please try again.');
            setIsGenerating(false);
            chrome.runtime.onMessage.removeListener(handleTestGenerated);
          }
        }, 30000); // 30 second timeout
        
      } else {
        const errorMsg = response?.error || 'Unknown error occurred';
        setGenerationError(`Failed to generate test: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Failed to generate test:', error);
      setGenerationError(`Error: ${error instanceof Error ? error.message : 'Failed to generate test. Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openDevTools = () => {
    chrome.devtools?.inspectedWindow?.eval('console.log("Opening AI TestGen DevTools panel")');
  };

  const newChat = () => {
    // Reset the current session and start fresh
    setSelectedElements(0);
    setIsInspecting(false);
    setIsLoading(false);
    setTestScenario('');
    // Clear any generated test data
    setGeneratedTest(null);
    setGenerationError(null);
    setIsGenerating(false);
    // Clear any selected elements on the page
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'clearSelection' });
      }
    });
  };

  const showRunTestModal = () => {
    if (!generatedTest) {
      alert('❌ No test to run. Please generate a test first.');
      return;
    }
    setShowExecutionModeModal(true);
  };

  const runTestWithMode = async (mode: 'headed' | 'headless') => {
    setShowExecutionModeModal(false);
    
    console.log('Popup: Initiating test execution with mode:', mode, 'and test:', generatedTest);
    
    try {
      // Send the test to content script for execution
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        console.log('Popup: Sending runTest message to tab:', tab.id);
        
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'runTest',
          test: generatedTest,
          mode: mode
        });
        
        console.log('Popup: Received response from content script:', response);
        
        if (response?.success) {
          console.log('✅ Test execution initiated successfully');
          // Note: Test execution results will be shown in the browser console
          // Users can optionally open DevTools panel for advanced debugging
        } else {
          const errorMsg = response?.error || 'Unknown error from content script';
          alert(`❌ Failed to initiate test execution: ${errorMsg}`);
          console.error('Test execution failed:', response);
        }
      } else {
        alert('❌ No active tab found. Please make sure you have an active tab.');
        console.error('No active tab found');
      }
    } catch (error) {
      console.error('Failed to run test:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for common Chrome extension errors
        if (errorMessage.includes('Could not establish connection')) {
          errorMessage = 'Could not connect to the page. Please refresh the page and try again.';
        } else if (errorMessage.includes('Extension context invalidated')) {
          errorMessage = 'Extension needs to be reloaded. Please reload the extension and try again.';
        }
      }
      
      alert(`❌ Failed to run test: ${errorMessage}`);
    }
  };

  const downloadTest = () => {
    if (!generatedTest) return;
    
    const filename = `test-${Date.now()}.${getFileExtension(generatedTest.framework.name)}`;
    const blob = new Blob([generatedTest.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyTest = async () => {
    if (!generatedTest) {
      alert('No test code to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(generatedTest.code);
      alert('Test code copied to clipboard!');
      console.log('Test code copied successfully');
    } catch (error) {
      console.error('Failed to copy test:', error);
      try {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = generatedTest.code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('Test code copied to clipboard!');
          console.log('Test code copied successfully (fallback method)');
        } else {
          alert('Failed to copy test code. Please copy manually from the console.');
          console.log('Generated test code:', generatedTest.code);
        }
      } catch (fallbackError) {
        alert('Failed to copy test code. Please copy manually from the console.');
        console.log('Generated test code:', generatedTest.code);
        console.error('Fallback copy failed:', fallbackError);
      }
    }
  };

  const getFileExtension = (frameworkName: string): string => {
    switch (frameworkName.toLowerCase()) {
      case 'playwright-js':
      case 'cypress':
      case 'webdriverio':
        return 'js';
      case 'playwright-ts':
        return 'ts';
      case 'selenium-python':
        return 'py';
      case 'selenium-java':
        return 'java';
      default:
        return 'txt';
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: '#ffffff',
        padding: '20px',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <Brain className="w-6 h-6" />
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            margin: '0'
          }}>AI TestGen</h1>
        </div>
        <p style={{
          color: '#bfdbfe',
          fontSize: '14px',
          margin: '0'
        }}>Generate test code with AI</p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #e2e8f0'
      }}>
        <button
          onClick={() => setActiveTab('generate')}
          style={{
            flex: 1,
            padding: '16px 12px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: 'none',
            backgroundColor: activeTab === 'generate' ? '#eff6ff' : '#ffffff',
            color: activeTab === 'generate' ? '#3b82f6' : '#64748b',
            borderBottom: activeTab === 'generate' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Play className="w-4 h-4" />
          Generate
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: '16px 12px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: 'none',
            backgroundColor: activeTab === 'settings' ? '#eff6ff' : '#ffffff',
            color: activeTab === 'settings' ? '#3b82f6' : '#64748b',
            borderBottom: activeTab === 'settings' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: '#f8fafc'
      }}>
        {activeTab === 'generate' ? (
          <GenerateTab
            settings={settings}
            selectedElements={selectedElements}
            isInspecting={isInspecting}
            isLoading={isLoading}
            testScenario={testScenario}
            isGenerating={isGenerating}
            generatedTest={generatedTest}
            generationError={generationError}
            onNewChat={newChat}
            onStartInspecting={startInspecting}
            onGenerateTest={generateTest}
            onOpenDevTools={openDevTools}
            onTestScenarioChange={setTestScenario}
            onRunTest={showRunTestModal}
            onDownloadTest={downloadTest}
            onCopyTest={copyTest}
          />
        ) : (
          <SettingsTab settings={settings} onSaveSettings={saveSettings} />
        )}
      </div>

      {/* Execution Mode Modal */}
      {showExecutionModeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            width: '320px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Play className="w-5 h-5 mr-2" style={{ color: '#8b5cf6' }} />
              Choose Test Execution Mode
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => runTestWithMode('headless')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '14px',
                  border: '2px solid #3b82f6',
                  cursor: 'pointer',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  marginBottom: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dbeafe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }}
              >
                🚀 Headless Mode
              </button>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                marginBottom: '16px',
                paddingLeft: '8px'
              }}>
                Faster execution, no browser window visible. Perfect for CI/CD and automated testing.
              </div>
              
              <button
                onClick={() => runTestWithMode('headed')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '14px',
                  border: '2px solid #10b981',
                  cursor: 'pointer',
                  backgroundColor: '#f0fdf4',
                  color: '#059669',
                  marginBottom: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ecfdf5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                }}
              >
                👁️ Headed Mode
              </button>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                marginBottom: '16px',
                paddingLeft: '8px'
              }}>
                Browser window visible during test execution. Great for debugging and development.
              </div>
            </div>
            
            <button
              onClick={() => setShowExecutionModeModal(false)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface GenerateTabProps {
  settings: ExtensionSettings;
  selectedElements: number;
  isInspecting: boolean;
  isLoading: boolean;
  testScenario: string;
  isGenerating: boolean;
  generatedTest: GeneratedTest | null;
  generationError: string | null;
  onNewChat: () => void;
  onStartInspecting: () => void;
  onGenerateTest: () => void;
  onOpenDevTools: () => void;
  onTestScenarioChange: (scenario: string) => void;
  onRunTest: () => void;
  onDownloadTest: () => void;
  onCopyTest: () => void;
}

const GenerateTab: React.FC<GenerateTabProps> = ({
  settings,
  selectedElements,
  isInspecting,
  isLoading,
  testScenario,
  isGenerating,
  generatedTest,
  generationError,
  onNewChat,
  onStartInspecting,
  onGenerateTest,
  onOpenDevTools,
  onTestScenarioChange,
  onRunTest,
  onDownloadTest,
  onCopyTest
}) => {
  const selectedFramework = TEST_FRAMEWORKS.find(f => f.id === settings.selectedFramework);
  const selectedProvider = AI_PROVIDERS.find(p => p.id === settings.selectedAIProvider);

  return (
    <div style={{ padding: '20px' }}>
      {/* Current Configuration */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Code className="w-5 h-5 mr-2" style={{ color: '#3b82f6' }} />
          Current Configuration
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px', marginRight: '8px' }}>
                {selectedFramework?.icon}
              </span>
              <div>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#1e293b', 
                  fontSize: '15px'
                }}>
                  {selectedFramework?.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#64748b',
                  fontWeight: '500',
                  backgroundColor: '#e2e8f0',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  display: 'inline-block'
                }}>
                  {selectedFramework?.language}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              lineHeight: '1.3'
            }}>
              {selectedFramework?.description}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>AI Provider:</span>
            <span style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px' }}>
              {selectedProvider?.name}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Selected Elements:</span>
            <span style={{ 
              fontWeight: '600', 
              color: selectedElements > 0 ? '#10b981' : '#64748b', 
              fontSize: '14px' 
            }}>
              {selectedElements}
            </span>
          </div>
        </div>
      </div>



      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={onNewChat}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '6px',
            fontWeight: '500',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            color: '#374151',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </button>

        <button
          onClick={onStartInspecting}
          disabled={isInspecting}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '6px',
            fontWeight: '500',
            fontSize: '14px',
            border: 'none',
            cursor: isInspecting ? 'not-allowed' : 'pointer',
            backgroundColor: isInspecting ? '#e2e8f0' : '#ea580c',
            color: isInspecting ? '#64748b' : '#ffffff',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (!isInspecting) {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }
          }}
          onMouseOut={(e) => {
            if (!isInspecting) {
              e.currentTarget.style.backgroundColor = '#ea580c';
            }
          }}
        >
          <Play className="w-4 h-4" />
          {isInspecting ? 'Inspecting...' : 'Inspect'}
        </button>
      </div>

      {/* Test Scenario Description */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Brain className="w-4 h-4 mr-2" style={{ color: '#8b5cf6' }} />
          Describe your test scenario
        </h4>
        <textarea
          value={testScenario}
          onChange={(e) => onTestScenarioChange(e.target.value)}
          placeholder="Example: Login with valid credentials, navigate to dashboard, and verify user profile information is displayed correctly..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s',
            backgroundColor: '#ffffff'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
        />
        <div style={{
          fontSize: '12px',
          color: '#64748b',
          marginTop: '6px'
        }}>
          💡 Be specific about the actions you want to test. The AI will use this description along with your selected elements to generate the test code.
        </div>
      </div>

      {/* Generate and DevTools buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={onGenerateTest}
          disabled={selectedElements === 0 || !testScenario.trim() || isLoading || isGenerating}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '14px',
            border: 'none',
            cursor: (selectedElements === 0 || !testScenario.trim() || isLoading || isGenerating) ? 'not-allowed' : 'pointer',
            backgroundColor: (selectedElements === 0 || !testScenario.trim() || isLoading || isGenerating) ? '#e2e8f0' : '#10b981',
            color: (selectedElements === 0 || !testScenario.trim() || isLoading || isGenerating) ? '#64748b' : '#ffffff',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (selectedElements > 0 && testScenario.trim() && !isLoading && !isGenerating) {
              e.currentTarget.style.backgroundColor = '#059669';
            }
          }}
          onMouseOut={(e) => {
            if (selectedElements > 0 && testScenario.trim() && !isLoading && !isGenerating) {
              e.currentTarget.style.backgroundColor = '#10b981';
            }
          }}
        >
          {isGenerating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Generating Test...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {isLoading ? 'Generating...' : `Generate Test (${selectedElements} elements)`}
            </>
          )}
        </button>

        {/* Test Generation Status and Results */}
        {(isGenerating || generatedTest || generationError) && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '16px'
          }}>
            {isGenerating && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#3b82f6',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <Loader className="w-5 h-5 animate-spin" />
                Generating test script...
              </div>
            )}

            {generationError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <XCircle className="w-5 h-5" />
                {generationError}
              </div>
            )}

            {generatedTest && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#059669',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '16px'
                }}>
                  <CheckCircle className="w-5 h-5" />
                  Test generated successfully!
                </div>

                {/* Generated Code Display */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    {generatedTest.framework.name} ({generatedTest.framework.language})
                  </div>
                  <pre style={{
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: '#1e293b',
                    margin: 0,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {generatedTest.code}
                  </pre>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={onRunTest}
                    style={{
                      flex: 1,
                      minWidth: '100px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    <Play className="w-3 h-3" />
                    Run Test
                  </button>
                  
                  <button
                    onClick={onDownloadTest}
                    style={{
                      flex: 1,
                      minWidth: '100px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  >
                    <Code className="w-3 h-3" />
                    Download
                  </button>
                  
                  <button
                    onClick={onCopyTest}
                    style={{
                      flex: 1,
                      minWidth: '100px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: '#8b5cf6',
                      color: '#ffffff',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                  >
                    <Code className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional DevTools Panel - for advanced debugging */}
        <details style={{ marginTop: '16px' }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: '12px',
            color: '#64748b',
            padding: '8px 0',
            userSelect: 'none'
          }}>
            Advanced: DevTools Panel (Optional)
          </summary>
          <button
            onClick={onOpenDevTools}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              fontWeight: '400',
              fontSize: '12px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              backgroundColor: '#f8fafc',
              color: '#64748b',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <Settings className="w-3 h-3" />
            Open DevTools Panel
          </button>
        </details>
      </div>

      {/* Help Text */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '12px'
        }}>
          How to use:
        </h4>
        <div style={{ 
          fontSize: '13px', 
          color: '#64748b', 
          lineHeight: '1.5',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              borderRadius: '50%', 
              width: '16px', 
              height: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '10px', 
              fontWeight: '600',
              marginRight: '8px',
              marginTop: '1px',
              flexShrink: 0
            }}>1</span>
            <span>Click "Inspect" to begin element selection</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              borderRadius: '50%', 
              width: '16px', 
              height: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '10px', 
              fontWeight: '600',
              marginRight: '8px',
              marginTop: '1px',
              flexShrink: 0
            }}>2</span>
            <span>Click on elements in the webpage to select them</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              borderRadius: '50%', 
              width: '16px', 
              height: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '10px', 
              fontWeight: '600',
              marginRight: '8px',
              marginTop: '1px',
              flexShrink: 0
            }}>3</span>
            <span>Describe your test scenario in the text area</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              borderRadius: '50%', 
              width: '16px', 
              height: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '10px', 
              fontWeight: '600',
              marginRight: '8px',
              marginTop: '1px',
              flexShrink: 0
            }}>4</span>
            <span>Click "Generate Test" to create automated test code</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              borderRadius: '50%', 
              width: '16px', 
              height: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '10px', 
              fontWeight: '600',
              marginRight: '8px',
              marginTop: '1px',
              flexShrink: 0
            }}>5</span>
            <span>Use Run, Download, or Copy buttons to work with your test</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingsTabProps {
  settings: ExtensionSettings;
  onSaveSettings: (settings: ExtensionSettings) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState<ExtensionSettings>(settings);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [debugMode, setDebugMode] = useState(false);

  const [inputTokenThreshold, setInputTokenThreshold] = useState(10000);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ isConnected: false });
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleFrameworkChange = (frameworkId: string) => {
    const newSettings = { ...localSettings, selectedFramework: frameworkId };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  const handleProviderChange = (providerId: string) => {
    const newSettings = { ...localSettings, selectedAIProvider: providerId };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    const newSettings = {
      ...localSettings,
      apiKeys: { ...localSettings.apiKeys, [providerId]: apiKey }
    };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKey(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };



  const handleModelChange = (providerId: string, model: string) => {
    const newSettings = {
      ...localSettings,
      selectedModel: { ...localSettings.selectedModel, [providerId]: model }
    };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  const handleLocalSetupChange = (field: keyof LocalSetupConfig, value: string | number) => {
    const newSettings = {
      ...localSettings,
      localSetup: { ...localSettings.localSetup, [field]: value }
    };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  const handleOpenRouterChange = (field: keyof OpenRouterConfig, value: string | number) => {
    const newSettings = {
      ...localSettings,
      openRouterConfig: { ...localSettings.openRouterConfig, [field]: value }
    };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    const provider = AI_PROVIDERS.find(p => p.id === localSettings.selectedAIProvider);
    
    try {
      let testUrl = '';
      let headers: Record<string, string> = {};
      
      if (provider?.type === 'local') {
        testUrl = localSettings.localSetup?.endpoint || provider.baseUrl || 'http://localhost:11434';
        // Test local endpoint health
        testUrl += '/api/tags'; // Ollama health check endpoint
      } else if (provider?.type === 'openrouter') {
        testUrl = 'https://openrouter.ai/api/v1/models';
        const apiKey = localSettings.openRouterConfig?.apiKey || '';
        if (!apiKey) {
          throw new Error('OpenRouter API key is required');
        }
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        // For other cloud providers, we'll just validate the API key format
        const apiKey = localSettings.apiKeys[localSettings.selectedAIProvider];
        if (!apiKey) {
          throw new Error('API key is required');
        }
        setConnectionStatus({ isConnected: true, lastTested: Date.now() });
        setIsTestingConnection(false);
        return;
      }

      const startTime = Date.now();
      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        // For OpenRouter, validate the response content to ensure API key is valid
        if (provider?.type === 'openrouter') {
          try {
            const data = await response.json();
            // Check if we got a valid models response
            if (!data.data || !Array.isArray(data.data)) {
              throw new Error('Invalid response from OpenRouter API - check your API key');
            }
            // If we have models, the API key is valid
            if (data.data.length === 0) {
              throw new Error('No models available - check your OpenRouter API key permissions');
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message.includes('API key')) {
              throw parseError;
            }
            throw new Error('Invalid response from OpenRouter API - check your API key');
          }
        }
        
        setConnectionStatus({ 
          isConnected: true, 
          lastTested: Date.now(),
          latency 
        });
      } else {
        // Handle specific HTTP error codes
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 401) {
          errorMessage = 'Invalid API key - please check your credentials';
        } else if (response.status === 403) {
          errorMessage = 'API key does not have required permissions';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded - please try again later';
        } else if (response.status >= 500) {
          errorMessage = 'Server error - please try again later';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      setConnectionStatus({ 
        isConnected: false, 
        lastTested: Date.now(),
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#f8fafc', 
      minHeight: '100%',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Script Type Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Brain className="w-5 h-5 mr-2" style={{ color: '#3b82f6' }} />
          Script Type
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
          }}>
            {TEST_FRAMEWORKS.map(framework => {
              const isSelected = localSettings.selectedFramework === framework.id;
              return (
                <div
                  key={framework.id}
                  onClick={() => handleFrameworkChange(framework.id)}
                  style={{
                    padding: '16px',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#94a3b8';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      ✓
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '24px', marginRight: '12px' }}>
                      {framework.icon}
                    </span>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '16px',
                        color: '#1e293b',
                        marginBottom: '2px'
                      }}>
                        {framework.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        fontWeight: '500',
                        backgroundColor: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {framework.language}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '13px',
                    color: '#64748b',
                    lineHeight: '1.4'
                  }}>
                    {framework.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LLM Provider Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Zap className="w-5 h-5 mr-2" style={{ color: '#3b82f6' }} />
          LLM Provider
        </h3>
        
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <select
            value={localSettings.selectedAIProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              color: '#1e293b',
              fontSize: '14px',
              outline: 'none',
              appearance: 'none'
            }}
          >
            {AI_PROVIDERS.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#3b82f6'
          }}>
            ▼
          </div>
        </div>

        {/* API Key Input */}
        {AI_PROVIDERS.find(p => p.id === localSettings.selectedAIProvider)?.apiKeyRequired && (
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              value={localSettings.apiKeys[localSettings.selectedAIProvider] || ''}
              onChange={(e) => handleApiKeyChange(localSettings.selectedAIProvider, e.target.value)}
              placeholder="Enter your API key"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                color: '#1e293b',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        )}

        {/* Model Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '8px',
            color: '#1e293b'
          }}>
            Model
          </label>
          <select
            value={localSettings.selectedModel?.[localSettings.selectedAIProvider] || ''}
            onChange={(e) => handleModelChange(localSettings.selectedAIProvider, e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              color: '#1e293b',
              fontSize: '14px',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          >
            <option value="">Select a model</option>
            {AI_PROVIDERS.find(p => p.id === localSettings.selectedAIProvider)?.models.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Local Setup Configuration */}
        {localSettings.selectedAIProvider === 'local' && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px',
              color: '#1e293b'
            }}>
              Local Setup Configuration
            </h4>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                color: '#1e293b'
              }}>
                Endpoint URL
              </label>
              <input
                type="text"
                value={localSettings.localSetup?.endpoint || 'http://localhost:11434'}
                onChange={(e) => handleLocalSetupChange('endpoint', e.target.value)}
                placeholder="http://localhost:11434"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#1e293b',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                color: '#1e293b'
              }}>
                Model Name
              </label>
              <input
                type="text"
                value={localSettings.localSetup?.model || ''}
                onChange={(e) => handleLocalSetupChange('model', e.target.value)}
                placeholder="llama-3.1"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#1e293b',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>
        )}

        {/* OpenRouter Configuration */}
        {localSettings.selectedAIProvider === 'openrouter' && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px',
              color: '#1e293b'
            }}>
              OpenRouter Configuration
            </h4>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                color: '#1e293b'
              }}>
                API Key
              </label>
              <input
                type="password"
                value={localSettings.openRouterConfig?.apiKey || ''}
                onChange={(e) => handleOpenRouterChange('apiKey', e.target.value)}
                placeholder="Enter your OpenRouter API key"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#1e293b',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>
        )}

        {/* Test Connection */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#1e293b'
            }}>
              Connection Status
            </h4>
            <button
              onClick={testConnection}
              disabled={isTestingConnection}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '14px',
                border: 'none',
                cursor: isTestingConnection ? 'not-allowed' : 'pointer',
                backgroundColor: isTestingConnection ? '#cbd5e1' : '#3b82f6',
                color: '#ffffff',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isTestingConnection ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : connectionStatus.isConnected ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {connectionStatus.isConnected ? (
              <Wifi className="w-4 h-4" style={{ color: '#10b981' }} />
            ) : (
              <WifiOff className="w-4 h-4" style={{ color: '#ef4444' }} />
            )}
            <span style={{ 
              color: connectionStatus.isConnected ? '#10b981' : '#ef4444',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {connectionStatus.latency && (
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                ({connectionStatus.latency}ms)
              </span>
            )}
          </div>
          
          {connectionStatus.error && (
            <div style={{ 
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              {connectionStatus.error}
            </div>
          )}
          
          {connectionStatus.lastTested && (
            <div style={{ 
              marginTop: '8px',
              color: '#64748b',
              fontSize: '12px'
            }}>
              Last tested: {new Date(connectionStatus.lastTested).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Input Tokens Warning Threshold */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '14px', 
          fontWeight: '500', 
          marginBottom: '8px',
          color: '#1e293b'
        }}>
          Input Tokens Warning Threshold
        </label>
        <input
          type="number"
          value={inputTokenThreshold}
          onChange={(e) => setInputTokenThreshold(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '14px',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {/* Debug Mode */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: '#1e293b'
        }}>
          Debug Mode
        </h4>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <div 
            onClick={() => setDebugMode(!debugMode)}
            style={{
              width: '40px',
              height: '20px',
              backgroundColor: debugMode ? '#3b82f6' : '#cbd5e1',
              borderRadius: '10px',
              position: 'relative',
              marginRight: '12px',
              transition: 'background-color 0.2s'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: debugMode ? '22px' : '2px',
              transition: 'left 0.2s'
            }}></div>
          </div>
          <span style={{ color: '#1e293b', fontSize: '14px' }}>Enable Debug Logs</span>
        </label>
      </div>



      {/* Additional Options */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1e293b'
        }}>
          Options
        </h4>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={localSettings.includeComments}
              onChange={(e) => {
                const newSettings = { ...localSettings, includeComments: e.target.checked };
                setLocalSettings(newSettings);
                onSaveSettings(newSettings);
              }}
              style={{ 
                marginRight: '12px',
                width: '16px',
                height: '16px',
                accentColor: '#3b82f6'
              }}
            />
            <span style={{ color: '#1e293b', fontSize: '14px' }}>Include comments in generated code</span>
          </label>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={localSettings.usePageObjectModel}
              onChange={(e) => {
                const newSettings = { ...localSettings, usePageObjectModel: e.target.checked };
                setLocalSettings(newSettings);
                onSaveSettings(newSettings);
              }}
              style={{ 
                marginRight: '12px',
                width: '16px',
                height: '16px',
                accentColor: '#3b82f6'
              }}
            />
            <span style={{ color: '#1e293b', fontSize: '14px' }}>Use Page Object Model pattern</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;