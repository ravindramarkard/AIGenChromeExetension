import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { GeneratedTest } from '../types';
import { 
  PlaywrightTestRunner, 
  TestRunResult, 
  TestSuite, 
  RunnerConfig, 
  RUNNER_PRESETS,
  testRunner 
} from '../utils/testRunner';

interface TestRunnerPanelProps {
  tests: GeneratedTest[];
  selectedTest?: GeneratedTest;
  testMode: 'headed' | 'headless';
}

export const TestRunnerPanel: React.FC<TestRunnerPanelProps> = ({ tests, selectedTest, testMode }) => {
  const [activeTab, setActiveTab] = useState<'single' | 'suite' | 'config'>('single');
  const [runResults, setRunResults] = useState<TestRunResult[]>([]);
  const [suiteResult, setSuiteResult] = useState<TestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<RunnerConfig>(testRunner.getConfig());
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Auto-select the latest test if available
    if (selectedTest && tests.length > 0) {
      const latestIndex = tests.length - 1;
      setSelectedTests(new Set([latestIndex]));
    }
  }, [selectedTest, tests]);

  const handleRunSingleTest = async (test: GeneratedTest) => {
    setIsRunning(true);
    setRunResults([]);
    
    try {
      // Configure test runner based on selected mode
      testRunner.updateConfig({ headless: testMode === 'headless' });
      const result = await testRunner.runSingleTest(test);
      setRunResults([result]);
    } catch (error) {
      console.error('Test execution failed:', error);
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
    } catch (error) {
      console.error('Test suite execution failed:', error);
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
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Test Runner</h2>
          <div className={`px-3 py-1 text-sm rounded-lg ${
            testMode === 'headless' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {testMode === 'headless' ? 'Headless Mode' : 'Headed Mode'}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
              activeTab === 'single'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Single Test
          </button>
          <button
            onClick={() => setActiveTab('suite')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
              activeTab === 'suite'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Test Suite
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
              activeTab === 'config'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1" />
            Config
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'single' && (
          <div className="space-y-4">
            {selectedTest ? (
              <div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {selectedTest.framework.name} Test
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Framework: {selectedTest.framework.name} ({selectedTest.framework.language})
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleRunSingleTest(selectedTest)}
                      disabled={isRunning}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRunning ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      {isRunning ? 'Running...' : 'Run Test'}
                    </button>
                    {isRunning && (
                      <button
                        onClick={handleStopTests}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                {/* Single Test Results */}
                {runResults.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
                    {runResults.map((result) => (
                      <div key={result.id} className="border-l-4 border-l-blue-500 pl-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {getStatusIcon(result.status)}
                            <span className="ml-2 font-medium">{result.testName}</span>
                          </div>
                          {result.duration && (
                            <span className="text-sm text-gray-500">
                              {PlaywrightTestRunner.formatDuration(result.duration)}
                            </span>
                          )}
                        </div>
                        {result.output && (
                          <div className="bg-gray-50 rounded p-2 text-sm">
                            <pre className="whitespace-pre-wrap">{result.output}</pre>
                          </div>
                        )}
                        {result.error && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700 mt-2">
                            <strong>Error:</strong> {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Play className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No test selected. Generate a test first to run it.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'suite' && (
          <div className="space-y-4">
            {tests.length > 0 ? (
              <div>
                {/* Test Selection */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Select Tests to Run</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tests.map((test, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTests.has(index)}
                          onChange={(e) => handleTestSelection(index, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm">
                          {test.framework.name} Test #{index + 1}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600">
                      {selectedTests.size} of {tests.length} tests selected
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleRunSelectedTests}
                        disabled={isRunning || selectedTests.size === 0}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRunning ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        {isRunning ? 'Running Suite...' : 'Run Selected'}
                      </button>
                      {isRunning && (
                        <button
                          onClick={handleStopTests}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suite Results */}
                {suiteResult && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Suite Results</h4>
                      <div className="text-sm text-gray-600">
                        {PlaywrightTestRunner.formatDuration(suiteResult.duration)}
                      </div>
                    </div>
                    
                    {/* Suite Summary */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{suiteResult.totalTests}</div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{suiteResult.passedTests}</div>
                        <div className="text-sm text-gray-600">Passed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{suiteResult.failedTests}</div>
                        <div className="text-sm text-gray-600">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{suiteResult.skippedTests}</div>
                        <div className="text-sm text-gray-600">Skipped</div>
                      </div>
                    </div>

                    {/* Individual Test Results */}
                    <div className="space-y-2">
                      {suiteResult.tests.map((result) => (
                        <div key={result.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            {getStatusIcon(result.status)}
                            <span className="ml-2 text-sm">{result.testName}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.duration && PlaywrightTestRunner.formatDuration(result.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Play className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No tests available. Generate some tests first to run them as a suite.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Presets */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Configuration Presets</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => applyPreset('development')}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="font-medium text-sm">Development</div>
                  <div className="text-xs text-gray-600">Visible browser, videos on</div>
                </button>
                <button
                  onClick={() => applyPreset('ci')}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="font-medium text-sm">CI/CD</div>
                  <div className="text-xs text-gray-600">Headless, retries enabled</div>
                </button>
                <button
                  onClick={() => applyPreset('debugging')}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="font-medium text-sm">Debugging</div>
                  <div className="text-xs text-gray-600">No timeout, full recording</div>
                </button>
              </div>
            </div>

            {/* Manual Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Manual Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Browser
                  </label>
                  <select
                    value={config.browser}
                    onChange={(e) => handleConfigChange({ browser: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => handleConfigChange({ timeout: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retries
                  </label>
                  <input
                    type="number"
                    value={config.retries}
                    onChange={(e) => handleConfigChange({ retries: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screenshot
                  </label>
                  <select
                    value={config.screenshot}
                    onChange={(e) => handleConfigChange({ screenshot: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="off">Off</option>
                    <option value="only-on-failure">Only on Failure</option>
                    <option value="on">On</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="headless"
                  checked={config.headless}
                  onChange={(e) => handleConfigChange({ headless: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="headless" className="ml-2 text-sm text-gray-700">
                  Run in headless mode
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};