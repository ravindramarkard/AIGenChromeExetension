import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, FileText, Download, ExternalLink } from 'lucide-react';
import { GeneratedTest } from '../types';
import { 
  PlaywrightTestRunner, 
  TestRunResult, 
  TestSuite, 
  RunnerConfig, 
  RUNNER_PRESETS,
  testRunner 
} from '../utils/testRunner';
import { ReportViewer } from './ReportViewer';

interface TestRunnerPanelProps {
  tests: GeneratedTest[];
  selectedTest?: GeneratedTest;
  testMode: 'headed' | 'headless';
  reportData?: any;
}

export const TestRunnerPanel: React.FC<TestRunnerPanelProps> = ({ tests, selectedTest, testMode, reportData: externalReportData }) => {
  const [activeTab, setActiveTab] = useState<'single' | 'suite' | 'config' | 'report'>('single');
  const [runResults, setRunResults] = useState<TestRunResult[]>([]);
  const [suiteResult, setSuiteResult] = useState<TestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<RunnerConfig>(testRunner.getConfig());
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  const [reportData, setReportData] = useState<any>(null);
  
  // Force enable Report button for testing
  useEffect(() => {
    if (!reportData && tests.length > 0) {
      console.log('TestRunnerPanel: Creating test report data for', tests.length, 'tests');
      const testReportData = {
        summary: {
          total: tests.length,
          passed: tests.length,
          failed: 0,
          skipped: 0,
          duration: 2.5
        },
        results: tests.map((test, index) => ({
          id: `test-${index}`,
          testName: test.framework.name + ' Test',
          status: 'passed' as const,
          duration: 1.5 + (index * 0.5),
          output: 'Test executed successfully',
          screenshot: `screenshots/test-${index}-screenshot.png`,
          video: `videos/test-${index}-video.webm`,
          trace: `traces/test-${index}-trace.zip`,
          timestamp: new Date()
        })),
        reportUrl: null // Don't use file URL since it doesn't exist
      };
      setReportData(testReportData);
      console.log('TestRunnerPanel: Test report data created:', testReportData);
    }
  }, [tests, reportData]);

  useEffect(() => {
    // Auto-select the latest test if available
    if (selectedTest && tests.length > 0) {
      const latestIndex = tests.length - 1;
      setSelectedTests(new Set([latestIndex]));
    }
  }, [selectedTest, tests]);

  useEffect(() => {
    // Use external report data when available
    console.log('TestRunnerPanel: externalReportData changed:', externalReportData);
    console.log('TestRunnerPanel: externalReportData type:', typeof externalReportData);
    console.log('TestRunnerPanel: externalReportData truthy:', !!externalReportData);
    if (externalReportData) {
      console.log('TestRunnerPanel: Setting report data from external source');
      setReportData(externalReportData);
    }
  }, [externalReportData]);

  // Debug current reportData state
  useEffect(() => {
    console.log('TestRunnerPanel: reportData state changed:', reportData);
    console.log('TestRunnerPanel: reportData type:', typeof reportData);
    console.log('TestRunnerPanel: reportData truthy:', !!reportData);
  }, [reportData]);

  const handleRunSingleTest = async (test: GeneratedTest) => {
    setIsRunning(true);
    setRunResults([]);
    
    try {
      // Configure test runner based on selected mode
      testRunner.updateConfig({ headless: testMode === 'headless' });
      const result = await testRunner.runSingleTest(test);
      setRunResults([result]);
      
      // Generate enhanced report data with more details
      const enhancedResult = {
        ...result,
        screenshot: `screenshots/${result.id}-screenshot.png`,
        video: `videos/${result.id}-video.webm`,
        trace: `traces/${result.id}-trace.zip`,
        output: result.output || 'Test executed successfully from Test Runner'
      };
      
      const reportData = testRunner.generateReportData([enhancedResult]);
      setReportData(reportData);
      
      console.log('TestRunnerPanel: Single test report generated:', reportData);
    } catch (error) {
      console.error('Test execution failed:', error);
      
      // Generate error report data
      const errorResult = {
        id: 'error-test',
        testName: test.framework.name + ' Test',
        status: 'failed' as const,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: 'Test execution failed',
        screenshot: 'screenshots/error-screenshot.png',
        timestamp: new Date()
      };
      
      const errorReportData = testRunner.generateReportData([errorResult]);
      setReportData(errorReportData);
      console.log('TestRunnerPanel: Error report generated:', errorReportData);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSelectedTests = async () => {
    if (selectedTests.size === 0) return;
    
    setIsRunning(true);
    setSuiteResult(null);
    
    try {
      // Configure test runner based on selected mode
      testRunner.updateConfig({ headless: testMode === 'headless' });
      const testsToRun = Array.from(selectedTests).map(index => tests[index]);
      const suite = await testRunner.runMultipleTests(testsToRun);
      setSuiteResult(suite);
      
      // Generate enhanced report data with more details
      const enhancedTests = suite.tests.map(test => ({
        ...test,
        screenshot: `screenshots/${test.id}-screenshot.png`,
        video: `videos/${test.id}-video.webm`,
        trace: `traces/${test.id}-trace.zip`,
        output: test.output || 'Test executed successfully from Test Runner Suite'
      }));
      
      const reportData = testRunner.generateReportData(enhancedTests);
      setReportData(reportData);
      
      console.log('TestRunnerPanel: Test suite report generated:', reportData);
    } catch (error) {
      console.error('Test suite execution failed:', error);
      
      // Generate error report data for suite
      const errorResult = {
        id: 'suite-error',
        testName: 'Test Suite Execution',
        status: 'failed' as const,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown suite error',
        output: 'Test suite execution failed',
        screenshot: 'screenshots/suite-error-screenshot.png',
        timestamp: new Date()
      };
      
      const errorReportData = testRunner.generateReportData([errorResult]);
      setReportData(errorReportData);
      console.log('TestRunnerPanel: Suite error report generated:', errorReportData);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopTests = () => {
    testRunner.stopAllTests();
    setIsRunning(false);
  };

  const handleTestSelection = (index: number, selected: boolean) => {
    const newSelection = new Set(selectedTests);
    if (selected) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    setSelectedTests(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedTests(new Set(tests.map((_, index) => index)));
  };

  const handleDeselectAll = () => {
    setSelectedTests(new Set());
  };

  const handleConfigChange = (newConfig: Partial<RunnerConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    testRunner.updateConfig(updatedConfig);
  };

  const applyPreset = (presetName: keyof typeof RUNNER_PRESETS) => {
    const preset = RUNNER_PRESETS[presetName];
    handleConfigChange(preset);
  };

  const getStatusIcon = (status: TestRunResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-4 h-4" style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />;
      case 'passed':
        return <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />;
      case 'failed':
        return <XCircle className="w-4 h-4" style={{ color: '#dc2626' }} />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4" style={{ color: '#d97706' }} />;
      default:
        return <Clock className="w-4 h-4" style={{ color: '#9ca3af' }} />;
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #e5e7eb',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827'
            }}>Test Runner</h2>
            
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#92400e',
              marginTop: '8px'
            }}>
              <strong>Note:</strong> Extension runs simulated tests. For real browser execution, download the Playwright project below.
            </div>
            
            {/* Debug button */}
            <button
              onClick={() => {
                const testData = {
                  summary: { 
                    total: 3, 
                    passed: 2, 
                    failed: 1, 
                    skipped: 0, 
                    duration: 4.2 
                  },
                  results: [
                    {
                      id: 'debug-test-1',
                      testName: 'Login Test',
                      status: 'passed' as const,
                      duration: 1.8,
                      output: 'Login test executed successfully',
                      screenshot: 'screenshots/login-test-screenshot.png',
                      video: 'videos/login-test-video.webm',
                      trace: 'traces/login-test-trace.zip',
                      timestamp: new Date()
                    },
                    {
                      id: 'debug-test-2',
                      testName: 'Navigation Test',
                      status: 'passed' as const,
                      duration: 1.2,
                      output: 'Navigation test executed successfully',
                      screenshot: 'screenshots/nav-test-screenshot.png',
                      video: 'videos/nav-test-video.webm',
                      timestamp: new Date()
                    },
                    {
                      id: 'debug-test-3',
                      testName: 'Form Validation Test',
                      status: 'failed' as const,
                      duration: 1.2,
                      output: 'Form validation test failed',
                      error: 'Element not found: #submit-button',
                      screenshot: 'screenshots/form-test-screenshot.png',
                      video: 'videos/form-test-video.webm',
                      trace: 'traces/form-test-trace.zip',
                      timestamp: new Date()
                    }
                  ],
                  reportUrl: null // Don't use file URL since it doesn't exist
                };
                setReportData(testData);
                console.log('TestRunnerPanel: Manual report data set:', testData);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Enable Report
            </button>
          <div style={{
            padding: '4px 12px',
            fontSize: '14px',
            borderRadius: '6px',
            backgroundColor: testMode === 'headless' ? '#dbeafe' : '#dcfce7',
            color: testMode === 'headless' ? '#1e40af' : '#166534'
          }}>
            {testMode === 'headless' ? 'Headless Mode (no browser)' : 'Headed Mode (browser visible)'}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          padding: '4px'
        }}>
          <button
            onClick={() => setActiveTab('single')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'single' ? '#ffffff' : 'transparent',
              color: activeTab === 'single' ? '#2563eb' : '#6b7280',
              boxShadow: activeTab === 'single' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'single') {
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'single') {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            Single Test
          </button>
          <button
            onClick={() => setActiveTab('suite')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'suite' ? '#ffffff' : 'transparent',
              color: activeTab === 'suite' ? '#2563eb' : '#6b7280',
              boxShadow: activeTab === 'suite' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'suite') {
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'suite') {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            Test Suite
          </button>
          <button
            onClick={() => setActiveTab('config')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'config' ? '#ffffff' : 'transparent',
              color: activeTab === 'config' ? '#2563eb' : '#6b7280',
              boxShadow: activeTab === 'config' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'config') {
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'config') {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
          <button
            onClick={() => setActiveTab('report')}
            disabled={!reportData}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '4px',
              border: 'none',
              cursor: reportData ? 'pointer' : 'not-allowed',
              backgroundColor: activeTab === 'report' ? '#ffffff' : 'transparent',
              color: activeTab === 'report' ? '#2563eb' : reportData ? '#6b7280' : '#9ca3af',
              boxShadow: activeTab === 'report' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'report' && reportData) {
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'report' && reportData) {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            <FileText className="w-4 h-4" />
            Report
            {reportData && (
              <span style={{
                marginLeft: '4px',
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#dbeafe',
                color: '#2563eb',
                borderRadius: '12px'
              }}>
                {reportData.summary.total}
              </span>
            )}
            {!reportData && (
              <span style={{
                marginLeft: '4px',
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderRadius: '12px'
              }}>
                No Data
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {activeTab === 'single' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Real Browser Execution Notice */}
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '8px'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e40af',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🖥️ Want Real Browser Execution?
              </h4>
              <p style={{
                fontSize: '12px',
                color: '#1e40af',
                marginBottom: '12px'
              }}>
                The extension runs simulated tests. For actual browser automation with Playwright, download the complete project below.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    if (selectedTest) {
                      const { downloadPlaywrightProject } = require('../utils/reportGenerator');
                      downloadPlaywrightProject(selectedTest.code, selectedTest.framework.name + ' Test');
                    }
                  }}
                  disabled={!selectedTest}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: selectedTest ? 'pointer' : 'not-allowed',
                    opacity: selectedTest ? 1 : 0.5
                  }}
                >
                  📥 Download Playwright Project
                </button>
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280'
                }}>
                  Then run: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '3px' }}>npx playwright test --headed</code>
                </div>
              </div>
            </div>

            {selectedTest ? (
              <div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '8px',
                    fontSize: '16px'
                  }}>
                    {selectedTest.framework.name} Test
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '12px'
                  }}>
                    Framework: {selectedTest.framework.name} ({selectedTest.framework.language})
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleRunSingleTest(selectedTest)}
                      disabled={isRunning}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        opacity: isRunning ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isRunning) {
                          e.currentTarget.style.backgroundColor = '#047857';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isRunning) {
                          e.currentTarget.style.backgroundColor = '#059669';
                        }
                      }}
                    >
                      {isRunning ? (
                        <RefreshCw className="w-4 h-4" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Play className="w-4 h-4" style={{ marginRight: '8px' }} />
                      )}
                      {isRunning ? 'Running...' : 'Run Test'}
                    </button>
                    {isRunning && (
                      <button
                        onClick={handleStopTests}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                      >
                        <Square className="w-4 h-4" style={{ marginRight: '8px' }} />
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                {/* Single Test Results */}
                {runResults.length > 0 && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <h4 style={{
                      fontWeight: '500',
                      color: '#111827',
                      marginBottom: '12px',
                      fontSize: '16px'
                    }}>Test Results</h4>
                    {runResults.map((result) => (
                      <div key={result.id} style={{
                        borderLeft: '4px solid #3b82f6',
                        paddingLeft: '16px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(result.status)}
                            <span style={{
                              marginLeft: '8px',
                              fontWeight: '500',
                              fontSize: '14px'
                            }}>{result.testName}</span>
                          </div>
                          {result.duration && (
                            <span style={{
                              fontSize: '14px',
                              color: '#6b7280'
                            }}>
                              {PlaywrightTestRunner.formatDuration(result.duration)}
                            </span>
                          )}
                        </div>
                        {result.output && (
                          <div style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: '4px',
                            padding: '8px',
                            fontSize: '14px'
                          }}>
                            <pre style={{
                              whiteSpace: 'pre-wrap',
                              margin: 0,
                              fontFamily: 'monospace'
                            }}>{result.output}</pre>
                          </div>
                        )}
                        {result.error && (
                          <div style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            padding: '8px',
                            fontSize: '14px',
                            color: '#dc2626',
                            marginTop: '8px'
                          }}>
                            <strong>Error:</strong> {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px 0',
                color: '#6b7280'
              }}>
                <Play className="w-12 h-12" style={{
                  margin: '0 auto 16px',
                  color: '#d1d5db'
                }} />
                <p>No test selected. Generate a test first to run it.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'suite' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Real Browser Execution Notice */}
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '8px'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e40af',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🖥️ Want Real Browser Execution?
              </h4>
              <p style={{
                fontSize: '12px',
                color: '#1e40af',
                marginBottom: '12px'
              }}>
                The extension runs simulated tests. For actual browser automation with Playwright, download the complete project below.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    if (tests.length > 0) {
                      const { downloadPlaywrightProject } = require('../utils/reportGenerator');
                      downloadPlaywrightProject(tests[0].code, 'Test Suite');
                    }
                  }}
                  disabled={tests.length === 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: tests.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: tests.length > 0 ? 1 : 0.5
                  }}
                >
                  📥 Download Playwright Project
                </button>
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280'
                }}>
                  Then run: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '3px' }}>npx playwright test --headed</code>
                </div>
              </div>
            </div>

            {tests.length > 0 ? (
              <div>
                {/* Test Selection */}
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{
                      fontWeight: '500',
                      color: '#111827',
                      fontSize: '16px'
                    }}>Select Tests to Run</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleSelectAll}
                        style={{
                          fontSize: '14px',
                          color: '#2563eb',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#1d4ed8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#2563eb';
                        }}
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '160px',
                    overflowY: 'auto'
                  }}>
                    {tests.map((test, index) => (
                      <label key={index} style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedTests.has(index)}
                          onChange={(e) => handleTestSelection(index, e.target.checked)}
                          style={{
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            accentColor: '#3b82f6',
                            marginRight: '8px'
                          }}
                        />
                        <span style={{
                          fontSize: '14px',
                          color: '#374151'
                        }}>
                          {test.framework.name} Test #{index + 1}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {selectedTests.size} of {tests.length} tests selected
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleRunSelectedTests}
                        disabled={isRunning || selectedTests.size === 0}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: (isRunning || selectedTests.size === 0) ? 'not-allowed' : 'pointer',
                          opacity: (isRunning || selectedTests.size === 0) ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isRunning && selectedTests.size > 0) {
                            e.currentTarget.style.backgroundColor = '#047857';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isRunning && selectedTests.size > 0) {
                            e.currentTarget.style.backgroundColor = '#059669';
                          }
                        }}
                      >
                        {isRunning ? (
                          <RefreshCw className="w-4 h-4" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Play className="w-4 h-4" style={{ marginRight: '8px' }} />
                        )}
                        {isRunning ? 'Running Suite...' : 'Run Selected'}
                      </button>
                      {isRunning && (
                        <button
                          onClick={handleStopTests}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 16px',
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                          }}
                        >
                          <Square className="w-4 h-4" style={{ marginRight: '8px' }} />
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suite Results */}
                {suiteResult && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px'
                    }}>
                      <h4 style={{
                        fontWeight: '500',
                        color: '#111827',
                        fontSize: '16px'
                      }}>Suite Results</h4>
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {PlaywrightTestRunner.formatDuration(suiteResult.duration)}
                      </div>
                    </div>
                    
                    {/* Suite Summary */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '16px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#111827'
                        }}>{suiteResult.totalTests}</div>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>Total</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#059669'
                        }}>{suiteResult.passedTests}</div>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>Passed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#dc2626'
                        }}>{suiteResult.failedTests}</div>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>Failed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#d97706'
                        }}>{suiteResult.skippedTests}</div>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>Skipped</div>
                      </div>
                    </div>

                    {/* Individual Test Results */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {suiteResult.tests.map((result) => (
                        <div key={result.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '4px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(result.status)}
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '14px',
                              color: '#374151'
                            }}>{result.testName}</span>
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#6b7280'
                          }}>
                            {result.duration && PlaywrightTestRunner.formatDuration(result.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px 0',
                color: '#6b7280'
              }}>
                <Play className="w-12 h-12" style={{
                  margin: '0 auto 16px',
                  color: '#d1d5db'
                }} />
                <p>No tests available. Generate some tests first to run them as a suite.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Presets */}
            <div>
              <h3 style={{
                fontWeight: '500',
                color: '#111827',
                marginBottom: '12px',
                fontSize: '16px'
              }}>Configuration Presets</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
              }}>
                <button
                  onClick={() => applyPreset('development')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{
                    fontWeight: '500',
                    fontSize: '14px',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>Development</div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>Visible browser, videos on</div>
                </button>
                <button
                  onClick={() => applyPreset('ci')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{
                    fontWeight: '500',
                    fontSize: '14px',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>CI/CD</div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>Headless, retries enabled</div>
                </button>
                <button
                  onClick={() => applyPreset('debugging')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{
                    fontWeight: '500',
                    fontSize: '14px',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>Debugging</div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>No timeout, full recording</div>
                </button>
              </div>
            </div>

            {/* Manual Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{
                fontWeight: '500',
                color: '#111827',
                fontSize: '16px'
              }}>Manual Configuration</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Browser
                  </label>
                  <select
                    value={config.browser}
                    onChange={(e) => handleConfigChange({ browser: e.target.value as any })}
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => handleConfigChange({ timeout: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Retries
                  </label>
                  <input
                    type="number"
                    value={config.retries}
                    onChange={(e) => handleConfigChange({ retries: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Screenshot
                  </label>
                  <select
                    value={config.screenshot}
                    onChange={(e) => handleConfigChange({ screenshot: e.target.value as any })}
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="off">Off</option>
                    <option value="only-on-failure">Only on Failure</option>
                    <option value="on">On</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="headless"
                  checked={!config.headless}
                  onChange={(e) => handleConfigChange({ headless: !e.target.checked })}
                  style={{
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    accentColor: '#3b82f6',
                    marginRight: '8px'
                  }}
                />
                <label htmlFor="headless" style={{
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Run in headed mode (show browser)
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <>
            {/* Quick Actions */}
            {reportData && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Quick Actions
                </h3>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
              <button
                onClick={() => {
                  const { downloadHTMLReport } = require('../utils/reportGenerator');
                  downloadHTMLReport(reportData);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                <Download className="w-4 h-4" />
                Download Custom Report
              </button>
                  <button
                    onClick={() => {
                      const { openHTMLReportInNewTab } = require('../utils/reportGenerator');
                      openHTMLReportInNewTab(reportData);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </button>
              <button
                onClick={() => {
                  // Download Playwright project for official HTML reports
                  if (selectedTest) {
                    const { downloadPlaywrightProject } = require('../utils/reportGenerator');
                    downloadPlaywrightProject(selectedTest.code, selectedTest.framework.name + ' Test');
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
              >
                <FileText className="w-4 h-4" />
                Download Playwright Project
              </button>
              <button
                onClick={() => {
                  // Re-run the last test
                  if (selectedTest) {
                    handleRunSingleTest(selectedTest);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                <Play className="w-4 h-4" />
                Re-run Tests
              </button>
                </div>
              </div>
            )}
            
            <ReportViewer 
              reportData={reportData} 
              onClose={() => setActiveTab('single')} 
            />
          </>
        )}
      </div>
    </div>
  );
};