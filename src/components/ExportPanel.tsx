import React, { useState } from 'react';
import { Download, Copy, FolderOpen, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { GeneratedTest } from '../types';
import { TestExporter, ExportOptions, ProjectIntegration } from '../utils/exportUtils';

interface ExportPanelProps {
  tests: GeneratedTest[];
  selectedTest?: GeneratedTest;
}

interface ExportState {
  isExporting: boolean;
  lastExportStatus: 'success' | 'error' | null;
  lastExportMessage: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ tests, selectedTest }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'clipboard',
    includeComments: true,
    includeImports: true,
    projectStructure: 'organized'
  });
  
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    lastExportStatus: null,
    lastExportMessage: ''
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());

  const handleExport = async (exportType: 'single' | 'multiple' | 'project') => {
    setExportState({ isExporting: true, lastExportStatus: null, lastExportMessage: '' });
    
    try {
      switch (exportType) {
        case 'single':
          if (!selectedTest) {
            throw new Error('No test selected');
          }
          await exportSingleTest(selectedTest);
          break;
        case 'multiple':
          await exportSelectedTests();
          break;
        case 'project':
          await exportAsProject();
          break;
      }
      
      setExportState({
        isExporting: false,
        lastExportStatus: 'success',
        lastExportMessage: `Successfully exported ${exportType === 'single' ? '1 test' : `${getSelectedTestsArray().length} tests`}`
      });
    } catch (error) {
      setExportState({
        isExporting: false,
        lastExportStatus: 'error',
        lastExportMessage: error instanceof Error ? error.message : 'Export failed'
      });
    }
  };

  const exportSingleTest = async (test: GeneratedTest) => {
    switch (exportOptions.format) {
      case 'clipboard':
        await TestExporter.exportToClipboard(test, exportOptions);
        break;
      case 'file':
        await TestExporter.exportToFile(test, exportOptions);
        break;
    }
  };

  const exportSelectedTests = async () => {
    const testsToExport = getSelectedTestsArray();
    if (testsToExport.length === 0) {
      throw new Error('No tests selected');
    }
    
    await TestExporter.exportMultipleTests(testsToExport, exportOptions);
  };

  const exportAsProject = async () => {
    const testsToExport = getSelectedTestsArray();
    if (testsToExport.length === 0) {
      throw new Error('No tests selected');
    }
    
    await TestExporter.exportMultipleTests(testsToExport, {
      ...exportOptions,
      format: 'file',
      projectStructure: 'organized'
    });
  };

  const getSelectedTestsArray = (): GeneratedTest[] => {
    if (selectedTests.size === 0) {
      return selectedTest ? [selectedTest] : [];
    }
    return Array.from(selectedTests).map(index => tests[index]).filter(Boolean);
  };

  const toggleTestSelection = (index: number) => {
    const newSelection = new Set(selectedTests);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedTests(newSelection);
  };

  const selectAllTests = () => {
    setSelectedTests(new Set(tests.map((_, index) => index)));
  };

  const clearSelection = () => {
    setSelectedTests(new Set());
  };

  const downloadProjectFiles = async () => {
    if (!selectedTest) return;
    
    const framework = selectedTest.framework;
    
    // Generate package.json
    const packageJson = ProjectIntegration.generatePackageJson(framework);
    const packageBlob = new Blob([packageJson], { type: 'application/json' });
    const packageUrl = URL.createObjectURL(packageBlob);
    
    const packageLink = document.createElement('a');
    packageLink.href = packageUrl;
    packageLink.download = 'package.json';
    document.body.appendChild(packageLink);
    packageLink.click();
    document.body.removeChild(packageLink);
    URL.revokeObjectURL(packageUrl);
    
    // Generate config file
    const configFile = ProjectIntegration.generateConfigFile(framework);
    if (configFile) {
      const configBlob = new Blob([configFile], { type: 'text/plain' });
      const configUrl = URL.createObjectURL(configBlob);
      
      const configLink = document.createElement('a');
      configLink.href = configUrl;
      configLink.download = framework.id.includes('playwright') ? 'playwright.config.ts' : 'cypress.config.ts';
      document.body.appendChild(configLink);
      configLink.click();
      document.body.removeChild(configLink);
      URL.revokeObjectURL(configUrl);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Export Status */}
      {exportState.lastExportStatus && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          exportState.lastExportStatus === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {exportState.lastExportStatus === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{exportState.lastExportMessage}</span>
        </div>
      )}

      {/* Quick Export Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Quick Export</h3>
        
        <div className="grid grid-cols-1 gap-2">
          {/* Single Test Export */}
          {selectedTest && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('single')}
                disabled={exportState.isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Copy className="w-4 h-4" />
                Copy Current Test
              </button>
              
              <button
                onClick={() => {
                  setExportOptions({ ...exportOptions, format: 'file' });
                  handleExport('single');
                }}
                disabled={exportState.isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download className="w-4 h-4" />
                Download Current Test
              </button>
            </div>
          )}
          
          {/* Multiple Tests Export */}
          {tests.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('multiple')}
                disabled={exportState.isExporting || getSelectedTestsArray().length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download className="w-4 h-4" />
                Export Selected ({getSelectedTestsArray().length})
              </button>
              
              <button
                onClick={() => handleExport('project')}
                disabled={exportState.isExporting || getSelectedTestsArray().length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <FolderOpen className="w-4 h-4" />
                Export as Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Test Selection */}
      {tests.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Select Tests to Export</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllTests}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-1">
            {tests.map((test, index) => (
              <label key={index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTests.has(index)}
                  onChange={() => toggleTestSelection(index)}
                  className="rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {test.framework.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(test.timestamp).toLocaleString()}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <div className="space-y-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700"
        >
          <Settings className="w-4 h-4" />
          Advanced Options
        </button>
        
        {showAdvanced && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            {/* Export Format */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Export Format
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  format: e.target.value as 'file' | 'clipboard' | 'project'
                })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="clipboard">Copy to Clipboard</option>
                <option value="file">Download as File</option>
              </select>
            </div>
            
            {/* Include Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeComments}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    includeComments: e.target.checked
                  })}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-gray-700">Include metadata comments</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeImports}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    includeImports: e.target.checked
                  })}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-gray-700">Include import statements</span>
              </label>
            </div>
            
            {/* Project Structure */}
            {exportOptions.format === 'file' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Project Structure
                </label>
                <select
                  value={exportOptions.projectStructure}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    projectStructure: e.target.value as 'flat' | 'organized'
                  })}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="flat">Flat (individual files)</option>
                  <option value="organized">Organized (project structure)</option>
                </select>
              </div>
            )}
            
            {/* Custom File Name */}
            {exportOptions.format === 'file' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Custom File Name (optional)
                </label>
                <input
                  type="text"
                  value={exportOptions.fileName || ''}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    fileName: e.target.value || undefined
                  })}
                  placeholder="Leave empty for auto-generated name"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Setup Files */}
      {selectedTest && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Project Setup</h3>
          <button
            onClick={downloadProjectFiles}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
          >
            <Download className="w-4 h-4" />
            Download Configuration Files
          </button>
          <p className="text-xs text-gray-500">
            Downloads package.json and framework configuration files for {selectedTest.framework.name}
          </p>
        </div>
      )}
    </div>
  );
};