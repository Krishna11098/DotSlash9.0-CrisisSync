// Service Worker for XSpark CRM PWA
// Version 2.0.1 (Force update)

const CACHE_VERSION = 'xspark-v4';
const OFFLINE_URL = '/offline';

// Cache names
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Key routes to cache - MUST work offline
const KEY_ROUTES = [
  '/',
  '/offline',
  '/login',
  '/dashboard',
  '/admin',
  '/install',
];

// Install event - cache routes INDIVIDUALLY
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 🔧 Installing v2.0.1...');
  console.log('[Service Worker] Origin:', self.location.origin);
  
  event.waitUntil(
    Promise.all([
      // Cache manifest
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('[Service Worker] 📦 Caching manifest.json');
          return cache.addAll(['/manifest.json']).catch((err) => {
            console.warn('[Service Worker] ⚠️  Failed to cache manifest:', err.message);
          });
        }),
      
      // Cache each route individually - if one fails, others continue
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          console.log('[Service Worker] 📦 Caching routes individually...');
          return Promise.all(
            KEY_ROUTES.map((route) => {
              return cache.add(route)
                .then(() => {
                  console.log(`[Service Worker] ✅ Cached: ${route}`);
                  return true;
                })
                .catch((error) => {
                  console.warn(`[Service Worker] ⚠️  Failed to cache ${route}:`, error.message);
                  return false;
                });
            })
          ).then((results) => {
            const cached = results.filter(r => r).length;
            console.log(`[Service Worker] ✅ Installation complete: ${cached}/${KEY_ROUTES.length} routes cached`);
          });
        })
    ])
      .then(() => {
        console.log('[Service Worker] 🚀 Claiming clients...');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[Service Worker] ❌ Installation error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 🔄 Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[Service Worker] Found caches:', cacheNames);
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old version caches
              return cacheName.startsWith('xspark-') && cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] 🗑️  Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] ✅ Activation complete');
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

  // Handle navigation requests - Network First with smart offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful nav responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          console.log(`[Service Worker] 📡 Online request failed: ${request.url}`);
          const url = new URL(request.url);
          const pathname = url.pathname;
          
          // Strategy 1: Try exact URL from cache
          let cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log(`[Service Worker] ✅ Serving from exact cache: ${pathname}`);
            return cachedResponse;
          }
          
          // Strategy 2: Try main route (e.g., /dashboard for /dashboard/something)
          // Extract base route like /dashboard from /dashboard/sub/path
          const basePath = '/' + pathname.split('/')[1];
          if (basePath !== '/' && basePath !== pathname) {
            cachedResponse = await caches.match(basePath);
            if (cachedResponse) {
              console.log(`[Service Worker] ✅ Serving base route: ${basePath}`);
              return cachedResponse;
            }
          }
          
          // Strategy 3: Try root /
          cachedResponse = await caches.match('/');
          if (cachedResponse) {
            console.log(`[Service Worker] ✅ Serving root as fallback`);
            return cachedResponse;
          }
          
          // Strategy 4: Try offline page
          cachedResponse = await caches.match(OFFLINE_URL);
          if (cachedResponse) {
            console.log(`[Service Worker] ✅ Serving offline page`);
            return cachedResponse;
          }
          
          // Fallback: Return offline HTML
          console.log(`[Service Worker] ❌ No cache available, showing offline message`);
          return new Response(
            '<html><body style="font-family: Arial; text-align: center; padding: 50px;"><h1>📡 Offline</h1><p>You are offline and this page is not cached.</p><p>Visit the main app or dashboard when online to cache pages for offline use.</p></body></html>',
            { 
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html; charset=utf-8' } 
            }
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
  const title = data.title || 'XORcists';
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
