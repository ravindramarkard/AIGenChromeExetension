import React from 'react';
import { ValidationResult, ValidationError, ValidationWarning } from '../utils/testValidator';

interface ValidationPanelProps {
  validationResult: ValidationResult | null;
  onFixSuggestion?: (line: number, fix: string) => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ 
  validationResult, 
  onFixSuggestion 
}) => {
  if (!validationResult) {
    return null;
  }

  const { isValid, errors, warnings, suggestions } = validationResult;

  const getErrorIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '🔴';
      case 'warning':
        return '🟡';
      default:
        return '🔵';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'syntax':
        return '#dc3545';
      case 'framework-specific':
        return '#fd7e14';
      case 'best-practice':
        return '#6f42c1';
      case 'performance':
        return '#20c997';
      case 'maintainability':
        return '#0d6efd';
      case 'accessibility':
        return '#198754';
      default:
        return '#6c757d';
    }
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        gap: '8px'
      }}>
        <span style={{ fontSize: '18px' }}>
          {isValid ? '✅' : '❌'}
        </span>
        <h3 style={{ 
          margin: 0, 
          color: isValid ? '#198754' : '#dc3545',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Validation {isValid ? 'Passed' : 'Failed'}
        </h3>
        <span style={{
          backgroundColor: isValid ? '#d1edff' : '#f8d7da',
          color: isValid ? '#0c63e4' : '#721c24',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {errors.filter(e => e.severity === 'error').length} errors, {warnings.length} warnings
        </span>
      </div>

      {/* Errors Section */}
      {errors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '14px', 
            fontWeight: '600',
            color: '#495057'
          }}>
            Issues Found:
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {errors.map((error, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px',
                  marginBottom: '4px',
                  backgroundColor: error.severity === 'error' ? '#fff5f5' : '#fffbf0',
                  border: `1px solid ${error.severity === 'error' ? '#fed7d7' : '#feebc8'}`,
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <span style={{ fontSize: '14px' }}>
                  {getErrorIcon(error.severity)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '500', 
                    color: '#2d3748',
                    marginBottom: '2px'
                  }}>
                    Line {error.line}, Column {error.column}
                  </div>
                  <div style={{ color: '#4a5568', marginBottom: '4px' }}>
                    {error.message}
                  </div>
                  <span
                    style={{
                      backgroundColor: getTypeColor(error.type),
                      color: 'white',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                  >
                    {error.type.replace('-', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '14px', 
            fontWeight: '600',
            color: '#495057'
          }}>
            Warnings:
          </h4>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {warnings.map((warning, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px',
                  marginBottom: '4px',
                  backgroundColor: '#fffbf0',
                  border: '1px solid #feebc8',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <span style={{ fontSize: '14px' }}>🟡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '500', 
                    color: '#2d3748',
                    marginBottom: '2px'
                  }}>
                    Line {warning.line}, Column {warning.column}
                  </div>
                  <div style={{ color: '#4a5568', marginBottom: '4px' }}>
                    {warning.message}
                  </div>
                  <span
                    style={{
                      backgroundColor: getTypeColor(warning.type),
                      color: 'white',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                  >
                    {warning.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '14px', 
            fontWeight: '600',
            color: '#495057'
          }}>
            💡 Suggestions for Improvement:
          </h4>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  marginBottom: '4px',
                  backgroundColor: '#e7f3ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#0c63e4'
                }}
              >
                <span style={{ fontSize: '14px' }}>💡</span>
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!isValid && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #bbdefb',
          borderRadius: '4px'
        }}>
          <div style={{ 
            fontSize: '13px', 
            color: '#1565c0',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Quick Actions:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => {
                // Auto-fix common issues
                console.log('Auto-fixing common issues...');
              }}
            >
              Auto-fix Common Issues
            </button>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => {
                // Show detailed help
                console.log('Showing detailed help...');
              }}
            >
              Show Help
            </button>
          </div>
        </div>
      )}
    </div>
  );
};