'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Wifi, WifiOff, Download, RefreshCw, Copy } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export default function PWATestPage() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Collect device info
    setDeviceInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      url: window.location.href,
      protocol: window.location.protocol,
      host: window.location.host,
    });

    runTests();
    setIsOnline(navigator.onLine);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runTests = async () => {
    setIsLoading(true);
    const results: TestResult[] = [];

    // Test 1: Service Worker Support
    results.push({
      name: 'Service Worker Support',
      status: 'serviceWorker' in navigator ? 'pass' : 'fail',
      message: 'serviceWorker' in navigator 
        ? 'Browser supports service workers' 
        : 'Browser does not support service workers'
    });

    // Test 2: Service Worker Registration
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        results.push({
          name: 'Service Worker Registration',
          status: registration ? 'pass' : 'warning',
          message: registration 
            ? `Service worker registered at ${registration.scope}` 
            : 'Service worker not yet registered'
        });
        
        // Test 3: Service Worker Active
        if (registration) {
          results.push({
            name: 'Service Worker Active',
            status: registration.active ? 'pass' : 'warning',
            message: registration.active 
              ? 'Service worker is active and running' 
              : 'Service worker is installing or waiting'
          });
        }
      } catch (error) {
        results.push({
          name: 'Service Worker Registration',
          status: 'fail',
          message: `Error checking registration: ${error}`
        });
      }
    }

    // Test 4: Cache API Support
    results.push({
      name: 'Cache API Support',
      status: 'caches' in window ? 'pass' : 'fail',
      message: 'caches' in window 
        ? 'Cache API is available' 
        : 'Cache API not supported'
    });

    // Test 5: Check Caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const xsparkCaches = cacheNames.filter(name => name.startsWith('xspark-'));
        results.push({
          name: 'PWA Caches',
          status: xsparkCaches.length > 0 ? 'pass' : 'warning',
          message: xsparkCaches.length > 0 
            ? `Found ${xsparkCaches.length} cache(s): ${xsparkCaches.join(', ')}` 
            : 'No PWA caches found yet (visit pages to populate)'
        });
      } catch (error) {
        results.push({
          name: 'PWA Caches',
          status: 'warning',
          message: 'Could not check cache storage'
        });
      }
    }

    // Test 6: Manifest
    try {
      const response = await fetch('/manifest.json');
      if (response.ok) {
        const manifest = await response.json();
        results.push({
          name: 'PWA Manifest',
          status: 'pass',
          message: `Manifest loaded: "${manifest.name}"`
        });
        
        // Test 7: Icons in Manifest
        results.push({
          name: 'Manifest Icons',
          status: manifest.icons && manifest.icons.length > 0 ? 'pass' : 'warning',
          message: manifest.icons 
            ? `${manifest.icons.length} icons defined` 
            : 'No icons defined in manifest'
        });
      } else {
        results.push({
          name: 'PWA Manifest',
          status: 'fail',
          message: `Manifest failed to load (${response.status})`
        });
      }
    } catch (error) {
      results.push({
        name: 'PWA Manifest',
        status: 'fail',
        message: 'Could not fetch manifest.json'
      });
    }

    // Test 8: HTTPS or Localhost
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
    results.push({
      name: 'Secure Context',
      status: isSecure ? 'pass' : 'warning',
      message: isSecure 
        ? 'Running on secure context (HTTPS or localhost)' 
        : 'PWA requires HTTPS in production'
    });

    // Test 9: IndexedDB (for offline storage)
    results.push({
      name: 'IndexedDB Support',
      status: 'indexedDB' in window ? 'pass' : 'fail',
      message: 'indexedDB' in window 
        ? 'IndexedDB available for offline storage' 
        : 'IndexedDB not supported'
    });

    // Test 10: Install Prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    results.push({
      name: 'Install Status',
      status: isInstalled ? 'pass' : 'warning',
      message: isInstalled 
        ? '✅ App is installed and running in standalone mode!' 
        : dismissed 
          ? 'Install prompt was dismissed (will show again in 7 days)' 
          : 'Install prompt available (wait 5 seconds after page load)'
    });

    setTests(results);
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="text-green-600" size={20} />;
      case 'fail':
        return <XCircle className="text-red-600" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const passCount = tests.filter(t => t.status === 'pass').length;
  const failCount = tests.filter(t => t.status === 'fail').length;
  const warningCount = tests.filter(t => t.status === 'warning').length;

  const copyDebugInfo = () => {
    const debugInfo = `
PWA Debug Report
Generated: ${new Date().toLocaleString()}

=== DEVICE INFO ===
User Agent: ${deviceInfo.userAgent}
Platform: ${deviceInfo.platform}
Language: ${deviceInfo.language}
Cookies Enabled: ${deviceInfo.cookieEnabled}
Online Status: ${deviceInfo.onLine}
Current URL: ${deviceInfo.url}
Protocol: ${deviceInfo.protocol}
Host: ${deviceInfo.host}

=== PWA STATUS ===
Installed (Standalone): ${isStandalone ? 'YES' : 'NO'}
Online: ${isOnline ? 'YES' : 'NO'}

=== TEST RESULTS ===
Passed: ${passCount}
Warnings: ${warningCount}
Failed: ${failCount}

${tests.map((test, i) => `
${i + 1}. ${test.name}
   Status: ${test.status.toUpperCase()}
   ${test.message}
`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(debugInfo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      alert('Debug info:\n\n' + debugInfo);
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h1 className="text-3xl font-bold text-gray-900">PWA Status</h1>
            <div className="flex gap-2">
              <button
                onClick={copyDebugInfo}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Copy size={18} />
                {copied ? 'Copied!' : 'Copy Debug Info'}
              </button>
              <button
                onClick={runTests}
                disabled={isLoading}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                Retest
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4">
            Comprehensive test of Progressive Web App functionality
          </p>

          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                {isOnline ? (
                  <Wifi className="text-green-600" size={24} />
                ) : (
                  <WifiOff className="text-red-600" size={24} />
                )}
              </div>
              <div className="text-sm text-gray-600">Connection</div>
              <div className="font-bold text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{passCount}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{failCount}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {/* Install Status */}
          {isStandalone && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Download size={20} />
                <span className="font-semibold">App is installed and running in standalone mode! 🎉</span>
              </div>
            </div>
          )}
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Results</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto text-purple-600 mb-2" size={32} />
              <p className="text-gray-600">Running tests...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getStatusColor(test.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{test.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Information */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Device Information</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm font-mono">
            <div className="grid grid-cols-1 gap-2">
              <div><span className="text-gray-600">URL:</span> <span className="text-gray-900">{deviceInfo.url}</span></div>
              <div><span className="text-gray-600">Protocol:</span> <span className="text-gray-900">{deviceInfo.protocol}</span></div>
              <div><span className="text-gray-600">Host:</span> <span className="text-gray-900">{deviceInfo.host}</span></div>
              <div><span className="text-gray-600">Platform:</span> <span className="text-gray-900">{deviceInfo.platform}</span></div>
              <div><span className="text-gray-600">Language:</span> <span className="text-gray-900">{deviceInfo.language}</span></div>
              <div><span className="text-gray-600">Online:</span> <span className={deviceInfo.onLine ? 'text-green-600' : 'text-red-600'}>{deviceInfo.onLine ? 'Yes' : 'No'}</span></div>
              <div><span className="text-gray-600">Cookies:</span> <span className={deviceInfo.cookieEnabled ? 'text-green-600' : 'text-red-600'}>{deviceInfo.cookieEnabled ? 'Enabled' : 'Disabled'}</span></div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-purple-600 hover:text-purple-700 font-sans font-medium">Show User Agent</summary>
              <div className="mt-2 text-xs break-all text-gray-700">{deviceInfo.userAgent}</div>
            </details>
          </div>
        </div>

        {/* Help Links */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              📚 <a href="/PWA_QUICKSTART.md" className="text-purple-600 hover:underline">Read the Quick Start Guide</a>
            </p>
            <p className="text-gray-600">
              📖 <a href="/PWA_GUIDE.md" className="text-purple-600 hover:underline">Read the Complete PWA Guide</a>
            </p>
            <p className="text-gray-600">
              🎨 <a href="/icons/generate-icons.html" className="text-purple-600 hover:underline">Generate App Icons</a>
            </p>
            <p className="text-gray-600">
              🔧 Open Chrome DevTools → Application tab to inspect service worker and caches
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
