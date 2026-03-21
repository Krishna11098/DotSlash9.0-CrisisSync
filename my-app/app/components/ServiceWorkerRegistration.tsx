'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New service worker available');
                  
                  // Optionally show update notification to user
                  if (confirm('A new version is available. Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Handle service worker controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service Worker controller changed, reloading page');
        window.location.reload();
      });

      // Sync data when coming back online
      window.addEventListener('online', () => {
        console.log('[PWA] Connection restored, syncing data...');
        
        // Trigger background sync if supported
        if ('sync' in navigator.serviceWorker) {
          navigator.serviceWorker.ready.then((registration: any) => {
            // Background Sync API - may not be available in all browsers
            if (registration.sync) {
              return registration.sync.register('sync-offline-data');
            }
          }).catch((error) => {
            console.error('[PWA] Background sync registration failed:', error);
          });
        }
      });

      // Log offline status
      window.addEventListener('offline', () => {
        console.log('[PWA] Connection lost, entering offline mode');
      });

      // Log initial online status
      console.log('[PWA] Initial online status:', navigator.onLine ? 'Online' : 'Offline');
    } else {
      console.log('[PWA] Service Workers are not supported in this browser');
    }
  }, []);

  return null; // This component doesn't render anything
}
