import React, { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, Play, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { downloadHTMLReport, openHTMLReportInNewTab } from '../utils/reportGenerator';

interface TestResult {
  id: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration?: number;
  error?: string;
  screenshot?: string;
  video?: string;
  trace?: string;
  timestamp: Date;
}

interface ReportData {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  results: TestResult[];
  reportUrl?: string;
}

interface ReportViewerProps {
  reportData?: ReportData;
  onClose: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ reportData, onClose }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'results' | 'artifacts'>('summary');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);

  if (!reportData) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          No Report Available
        </h3>
        <p style={{ fontSize: '14px' }}>
          Run a test to generate a Playwright report
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'failed':
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      case 'running':
        return <Clock className="w-4 h-4" style={{ color: '#3b82f6' }} />;
      case 'skipped':
        return <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />;
      default:
        return <Clock className="w-4 h-4" style={{ color: '#64748b' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'running':
        return '#3b82f6';
      case 'skipped':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText className="w-6 h-6" style={{ color: '#3b82f6' }} />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1e293b' }}>
              Playwright Report
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Generated on {reportData.results[0]?.timestamp.toLocaleString()}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => downloadHTMLReport(reportData)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download className="w-3 h-3" />
            Download Report
          </button>
          <button
            onClick={() => openHTMLReportInNewTab(reportData)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ExternalLink className="w-3 h-3" />
            Open in New Tab
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex'
      }}>
        {[
          { id: 'summary', label: 'Summary', count: reportData.summary.total },
          { id: 'results', label: 'Test Results', count: reportData.results.length },
          { id: 'artifacts', label: 'Artifacts', count: reportData.results.filter(r => r.screenshot || r.video || r.trace).length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#64748b',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {tab.label}
            <span style={{
              backgroundColor: activeTab === tab.id ? '#3b82f6' : '#e2e8f0',
              color: activeTab === tab.id ? '#ffffff' : '#64748b',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '10px',
              minWidth: '16px',
              textAlign: 'center'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'summary' && (
          <div>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                Test Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                    {reportData.summary.total}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Tests
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                    {reportData.summary.passed}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Passed
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
                    {reportData.summary.failed}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Failed
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                    {reportData.summary.skipped}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Skipped
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                    {formatDuration(reportData.summary.duration)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Duration
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#eff6ff',
                    color: '#3b82f6',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
                <button
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid #10b981',
                    backgroundColor: '#f0fdf4',
                    color: '#10b981',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Play className="w-4 h-4" />
                  Re-run Tests
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}>
              {reportData.results.map((result, index) => (
                <div
                  key={result.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < reportData.results.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setSelectedResult(result)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {getStatusIcon(result.status)}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                          {result.testName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {result.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {formatDuration(result.duration)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: getStatusColor(result.status),
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {result.status}
                      </div>
                    </div>
                  </div>
                  {result.error && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#dc2626'
                    }}>
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '20px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                Test Artifacts
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {reportData.results
                  .filter(result => result.screenshot || result.video || result.trace)
                  .map((result, index) => (
                    <div
                      key={result.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#1e293b' }}>
                        {result.testName}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {result.screenshot && (
                          <button
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: '1px solid #d1d5db',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            📸 Screenshot
                          </button>
                        )}
                        {result.video && (
                          <button
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: '1px solid #d1d5db',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            🎥 Video
                          </button>
                        )}
                        {result.trace && (
                          <button
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: '1px solid #d1d5db',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            🔍 Trace
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
