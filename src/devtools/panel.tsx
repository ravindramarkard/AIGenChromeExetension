import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Code, Settings, Info, Terminal } from 'lucide-react';
import { GeneratedTest } from '../types';

const DevToolsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'info' | 'debug'>('info');
  const [generatedTests, setGeneratedTests] = useState<GeneratedTest[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    loadGeneratedTests();
    
    // Listen for debug messages
    const messageListener = (event: MessageEvent) => {
      if (event.data.type === 'DEBUG_LOG') {
        setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${event.data.message}`]);
      } else if (event.data.type === 'NEW_TEST_GENERATED') {
        loadGeneratedTests();
      }
    };
    
    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, []);

  const loadGeneratedTests = async () => {
    try {
      const result = await chrome.storage.local.get(['savedTests']);
      const tests = result.savedTests || [];
      setGeneratedTests(tests);
    } catch (error) {
      console.error('Failed to load generated tests:', error);
    }
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 20px',
        backgroundColor: '#f8fafc'
      }}>
        <h1 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e293b',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Code className="w-5 h-5" />
          AI TestGen DevTools
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          margin: '4px 0 0 0'
        }}>
          Advanced debugging and monitoring panel
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        borderBottom: '1px solid #e2e8f0',
        padding: '0 20px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { id: 'info', label: 'Info', icon: Info },
            { id: 'debug', label: 'Debug Logs', icon: Terminal }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'info' | 'debug')}
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === id ? '#3b82f6' : '#64748b',
                fontWeight: activeTab === id ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer',
                borderBottom: activeTab === id ? '2px solid #3b82f6' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '20px', height: 'calc(100vh - 140px)', overflow: 'auto' }}>
        {activeTab === 'info' && (
          <div>
            <div style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b',
                margin: '0 0 8px 0'
              }}>
                Main Workflow
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#475569',
                margin: 0,
                lineHeight: '1.5'
              }}>
                The primary AI TestGen workflow now happens in the browser extension popup. 
                This DevTools panel provides advanced debugging capabilities for developers.
              </p>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b',
                margin: '0 0 12px 0'
              }}>
                Generated Tests Summary
              </h3>
              <div style={{
                fontSize: '14px',
                color: '#64748b'
              }}>
                <p>Total tests generated: <strong>{generatedTests.length}</strong></p>
                {generatedTests.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ marginBottom: '8px' }}>Recent tests:</p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {generatedTests.slice(-3).map((test, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>
                          {test.framework.name} test - {new Date(test.timestamp).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'debug' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b',
                margin: 0
              }}>
                Debug Logs
              </h3>
              <button
                onClick={clearDebugLogs}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Clear Logs
              </button>
            </div>

            <div style={{
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '12px',
              height: '400px',
              overflow: 'auto'
            }}>
              {debugLogs.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                  No debug logs yet. Debug messages will appear here.
                </div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Initialize the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DevToolsPanel />);
}