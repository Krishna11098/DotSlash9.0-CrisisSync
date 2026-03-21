'use client';

import { Smartphone, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileDebugPage() {
  const router = useRouter();
  const [swRegistered, setSwRegistered] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [cacheCount, setCacheCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [protocol, setProtocol] = useState('');
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    setProtocol(window.location.protocol);
    setIsOnline(navigator.onLine);

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwRegistered(true);
          setSwActive(!!reg.active);
        }
      });
    }

    // Check caches
    if ('caches' in window) {
      caches.keys().then((keys) => {
        const xsparkCaches = keys.filter(k => k.startsWith('xspark-'));
        setCacheCount(xsparkCaches.length);
      });
    }

    // Check install capability
    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="text-purple-600" size={32} />
            Mobile Debug
          </h1>

          {/* Quick Status */}
          <div className="space-y-3 mb-6">
            <StatusItem 
              label="Service Worker" 
              status={swRegistered && swActive ? 'pass' : swRegistered ? 'warning' : 'fail'}
              message={swRegistered && swActive ? 'Active & Running' : swRegistered ? 'Registered but not active' : 'Not Registered'}
            />
            
            <StatusItem 
              label="Caching" 
              status={cacheCount > 0 ? 'pass' : 'fail'}
              message={cacheCount > 0 ? `${cacheCount} caches found` : 'No caches - visit pages first'}
            />
            
            <StatusItem 
              label="Connection" 
              status={protocol === 'http:' ? 'warning' : 'pass'}
              message={`Using ${protocol} on ${window.location.host}`}
            />
            
            <StatusItem 
              label="Install Available" 
              status={canInstall ? 'pass' : 'warning'}
              message={canInstall ? 'Browser supports PWA install' : 'Use "Add to Home Screen" manually'}
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-blue-900 mb-2">📱 TO FIX CACHING ON MOBILE:</h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li><strong>1.</strong> Service Worker needs to register - refresh this page</li>
              <li><strong>2.</strong> Visit /admin, /login pages (builds cache)</li>
              <li><strong>3.</strong> Check status here again - caches should appear</li>
              <li><strong>4.</strong> Turn on Airplane Mode and test</li>
            </ol>
          </div>

          {/* Install Instructions */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <h3 className="font-bold text-purple-900 mb-2">💾 TO INSTALL:</h3>
            <div className="text-sm text-purple-800 space-y-2">
              <p><strong>Android Chrome:</strong></p>
              <p className="pl-4">• Menu (⋮) → "Install app" or "Add to Home Screen"</p>
              <p><strong>iPhone Safari:</strong></p>
              <p className="pl-4">• Share button → "Add to Home Screen"</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg"
            >
              🔄 Refresh & Recheck
            </button>

            
            <button
              onClick={() => router.push('/pwa-test')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg"
            >
              🔧 Full Debug Page
            </button>
          </div>
        </div>

        {/* Console Logs */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="font-bold text-gray-900 mb-3">📋 Check Browser Console</h3>
          <p className="text-sm text-gray-600 mb-2">
            Open browser dev tools and look for messages starting with [PWA] or [Service Worker]
          </p>
          <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs">
            <div>[PWA] Service Worker registered</div>
            <div>[Service Worker] Installing... v1.0.1</div>
            <div>[Service Worker] Caching static assets</div>
            <div>[Service Worker] Installation complete</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, status, message }: { label: string; status: 'pass' | 'warning' | 'fail'; message: string }) {
  const icons = {
    pass: <CheckCircle className="text-green-600" size={20} />,
    warning: <AlertTriangle className="text-yellow-600" size={20} />,
    fail: <XCircle className="text-red-600" size={20} />
  };

  const colors = {
    pass: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    fail: 'bg-red-50 border-red-200'
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border-2 ${colors[status]}`}>
      {icons[status]}
      <div className="flex-1">
        <div className="font-semibold text-gray-900">{label}</div>
        <div className="text-sm text-gray-600">{message}</div>
      </div>
    </div>
  );
}
