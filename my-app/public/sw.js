// Service Worker for XSpark CRM PWA
// Version 1.0.2

const CACHE_VERSION = 'xspark-v3';
const OFFLINE_URL = '/offline';

// Cache names
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// URLs to cache on install - use relative paths for cross-origin compatibility
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/login',
  '/tab',
  '/admin',
  '/install',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing... v1.0.3');
  console.log('[Service Worker] Origin:', self.location.origin);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.error('[Service Worker] Failed to cache assets:', error);
          // Don't fail installation if some assets can't be cached
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete caches that don't match current version
              return cacheName.startsWith('xspark-') && cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      event.respondWith(networkOnlyStrategy(request));
      return;
    }

    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }

  // Handle images - Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Handle navigation requests - Network First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to serve from cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Try serving the lead form page (start_url) as primary offline fallback
          const tabResponse = await caches.match('/tab');
          if (tabResponse) {
            return tabResponse;
          }

          // Serve offline page as secondary fallback
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
          
          // Ultimate fallback
          return new Response(
            '<html><body><h1>Offline</h1><p>You are currently offline. Please check your internet connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Handle other requests - Cache First with network fallback
  event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
});

// Strategy: Network First with cache fallback
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses only
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, trying cache:', request.url);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response if not in cache
    return new Response(
      JSON.stringify({ error: 'Offline - data not available in cache' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Strategy: Network only (for non-idempotent requests like POST)
async function networkOnlyStrategy(request) {
  return fetch(request);
}

// Strategy: Cache First with network fallback
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(cacheName).then((cache) => {
            cache.put(request, networkResponse);
          });
        }
      })
      .catch(() => {
        // Ignore network errors when cache exists
      });
    
    return cachedResponse;
  }
  
  // Fetch from network and cache
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    throw error;
  }
}

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag.startsWith('sync-lead-')) {
    event.waitUntil(syncLead(event.tag));
  }
});

async function syncLead(tag) {
  // This would integrate with your IndexedDB offline storage
  console.log('[Service Worker] Syncing lead:', tag);
  // Implementation would fetch from IndexedDB and POST to API
}

// Push notifications support (optional for future)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'XSpark CRM';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
