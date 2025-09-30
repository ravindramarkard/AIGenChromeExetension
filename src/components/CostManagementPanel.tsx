import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Settings, 
  Download, 
  Upload, 
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react';
import { 
  CostTracker, 
  UsageMetrics, 
  UsageLimits, 
  UsageAlert, 
  CostEstimate 
} from '../utils/costTracker';

interface CostManagementPanelProps {
  currentProvider?: string;
  currentModel?: string;
}

export const CostManagementPanel: React.FC<CostManagementPanelProps> = ({ 
  currentProvider = 'openai', 
  currentModel = 'gpt-4' 
}) => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [limits, setLimits] = useState<UsageLimits>({});
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'limits' | 'analytics'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showLimitSettings, setShowLimitSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsData, limitsData, alertsData] = await Promise.all([
        CostTracker.getUsageMetrics(),
        CostTracker.getUsageLimits(),
        CostTracker.checkUsageAlerts()
      ]);
      
      setMetrics(metricsData);
      setLimits(limitsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load cost data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLimitChange = (key: keyof UsageLimits, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setLimits(prev => ({ ...prev, [key]: numValue }));
  };

  const saveLimits = async () => {
    await CostTracker.saveUsageLimits(limits);
    setShowLimitSettings(false);
    await loadData(); // Refresh alerts
  };

  const resetUsage = async (type: 'daily' | 'monthly' | 'all') => {
    if (!confirm(`Are you sure you want to reset ${type} usage data?`)) return;
    
    switch (type) {
      case 'daily':
        await CostTracker.resetDailyUsage();
        break;
      case 'monthly':
        await CostTracker.resetMonthlyUsage();
        break;
      case 'all':
        await CostTracker.resetAllUsage();
        break;
    }
    
    await loadData();
  };

  const exportData = async () => {
    const data = await CostTracker.exportUsageData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-testgen-usage-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    const success = await CostTracker.importUsageData(text);
    
    if (success) {
      await loadData();
      alert('Usage data imported successfully!');
    } else {
      alert('Failed to import usage data. Please check the file format.');
    }
    
    event.target.value = '';
  };

  const getTodayUsage = () => {
    if (!metrics) return null;
    const today = new Date().toISOString().split('T')[0];
    return metrics.dailyUsage[today] || { date: today, requests: 0, tokens: 0, cost: 0 };
  };

  const getThisMonthUsage = () => {
    if (!metrics) return null;
    const thisMonth = new Date().toISOString().slice(0, 7);
    return metrics.monthlyUsage[thisMonth] || { month: thisMonth, requests: 0, tokens: 0, cost: 0 };
  };

  const getEstimateForNextRequest = (): CostEstimate => {
    return CostTracker.estimateCost(currentProvider, currentModel, 2000); // Estimate 2k tokens
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const todayUsage = getTodayUsage();
  const monthUsage = getThisMonthUsage();
  const nextRequestEstimate = getEstimateForNextRequest();

  return (
    <div className="p-4 space-y-4">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 p-3 rounded-lg border ${
                alert.severity === 'critical'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 text-sm font-medium ${
            activeView === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveView('limits')}
          className={`px-4 py-2 text-sm font-medium ${
            activeView === 'limits'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Limits
        </button>
        <button
          onClick={() => setActiveView('analytics')}
          className={`px-4 py-2 text-sm font-medium ${
            activeView === 'analytics'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PieChart className="w-4 h-4 inline mr-2" />
          Analytics
        </button>
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Cost</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {CostTracker.formatCurrency(metrics?.totalCost || 0)}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Requests</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {CostTracker.formatNumber(metrics?.totalRequests || 0)}
              </div>
            </div>
          </div>

          {/* Today's Usage */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today's Usage
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Requests</div>
                <div className="font-medium">{todayUsage?.requests || 0}</div>
              </div>
              <div>
                <div className="text-gray-500">Tokens</div>
                <div className="font-medium">{CostTracker.formatNumber(todayUsage?.tokens || 0)}</div>
              </div>
              <div>
                <div className="text-gray-500">Cost</div>
                <div className="font-medium">{CostTracker.formatCurrency(todayUsage?.cost || 0)}</div>
              </div>
            </div>
          </div>

          {/* This Month's Usage */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">This Month's Usage</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Requests</div>
                <div className="font-medium">{monthUsage?.requests || 0}</div>
              </div>
              <div>
                <div className="text-gray-500">Tokens</div>
                <div className="font-medium">{CostTracker.formatNumber(monthUsage?.tokens || 0)}</div>
              </div>
              <div>
                <div className="text-gray-500">Cost</div>
                <div className="font-medium">{CostTracker.formatCurrency(monthUsage?.cost || 0)}</div>
              </div>
            </div>
          </div>

          {/* Next Request Estimate */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-700 mb-2">Next Request Estimate</h3>
            <div className="text-sm text-purple-600">
              {nextRequestEstimate.provider} • {nextRequestEstimate.model}
            </div>
            <div className="text-lg font-bold text-purple-900">
              ~{CostTracker.formatCurrency(nextRequestEstimate.estimatedCost)}
            </div>
            <div className="text-xs text-purple-600">
              (~{CostTracker.formatNumber(nextRequestEstimate.estimatedTokens)} tokens)
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Limits Tab */}
      {activeView === 'limits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Usage Limits</h3>
            <button
              onClick={() => setShowLimitSettings(!showLimitSettings)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Settings className="w-4 h-4" />
              {showLimitSettings ? 'Cancel' : 'Edit Limits'}
            </button>
          </div>

          {showLimitSettings ? (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Request Limit
                  </label>
                  <input
                    type="number"
                    value={limits.dailyRequestLimit || ''}
                    onChange={(e) => handleLimitChange('dailyRequestLimit', e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Request Limit
                  </label>
                  <input
                    type="number"
                    value={limits.monthlyRequestLimit || ''}
                    onChange={(e) => handleLimitChange('monthlyRequestLimit', e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Cost Limit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={limits.dailyCostLimit || ''}
                    onChange={(e) => handleLimitChange('dailyCostLimit', e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Cost Limit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={limits.monthlyCostLimit || ''}
                    onChange={(e) => handleLimitChange('monthlyCostLimit', e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Token Limit
                  </label>
                  <input
                    type="number"
                    value={limits.dailyTokenLimit || ''}
                    onChange={(e) => handleLimitChange('dailyTokenLimit', e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Token Limit
                  </label>
                  <input
                    type="number"
                    value={limits.monthlyTokenLimit || ''}
                    onChange={(e) => handleLimitChange('monthlyTokenLimit', e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveLimits}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Save Limits
                </button>
                <button
                  onClick={() => setShowLimitSettings(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(limits).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  <span className="text-sm text-gray-600">
                    {value ? (key.includes('Cost') ? CostTracker.formatCurrency(value) : CostTracker.formatNumber(value)) : 'No limit'}
                  </span>
                </div>
              ))}
              {Object.keys(limits).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No limits configured. Click "Edit Limits" to set usage limits.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeView === 'analytics' && (
        <div className="space-y-4">
          {/* Provider Breakdown */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Usage by Provider</h3>
            {Object.entries(metrics?.costsByProvider || {}).map(([provider, cost]) => (
              <div key={provider} className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 capitalize">{provider}</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{CostTracker.formatCurrency(cost)}</div>
                  <div className="text-xs text-gray-500">
                    {metrics?.requestsByProvider[provider] || 0} requests
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Daily Usage */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Daily Usage</h3>
            <div className="space-y-2">
              {Object.entries(metrics?.dailyUsage || {})
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 7)
                .map(([date, usage]) => (
                  <div key={date} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">{date}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{CostTracker.formatCurrency(usage.cost)}</div>
                      <div className="text-xs text-gray-500">
                        {usage.requests} requests • {CostTracker.formatNumber(usage.tokens)} tokens
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Reset Options */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-700 mb-3">Reset Usage Data</h3>
            <div className="flex gap-2">
              <button
                onClick={() => resetUsage('daily')}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Reset Today
              </button>
              <button
                onClick={() => resetUsage('monthly')}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Reset This Month
              </button>
              <button
                onClick={() => resetUsage('all')}
                className="px-3 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 text-sm"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};