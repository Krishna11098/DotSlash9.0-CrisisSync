'use client';

import { WifiOff, RefreshCw, Home, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => {
        router.push('/');
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push('/');
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Status Icon */}
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 transition-all duration-300 ${
          isOnline 
            ? 'bg-green-100 text-green-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          {isOnline ? (
            <RefreshCw size={48} className="animate-spin" />
          ) : (
            <WifiOff size={48} />
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {isOnline ? 'Back Online!' : 'You\'re Offline'}
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          {isOnline 
            ? 'Your connection has been restored. Redirecting...'
            : 'It looks like you\'re not connected to the internet. Please check your connection and try again.'
          }
        </p>

        {/* Connection Status */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 transition-all duration-300 ${
          isOnline 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            {isOnline ? 'Connected' : 'No Connection'}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {!isOnline && (
            <button
              onClick={() => router.push('/tab')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ClipboardList size={20} />
              Fill Lead Form Offline
            </button>
          )}

          <button
            onClick={handleRetry}
            disabled={isOnline}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} />
            {isOnline ? 'Reconnecting...' : 'Try Again'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Go to Home
          </button>
        </div>

        {/* Tips */}
        {!isOnline && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You can still fill the Lead Form offline</li>
              <li>• Data will auto-sync when you&apos;re back online</li>
              <li>• Check your WiFi or mobile data connection</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
