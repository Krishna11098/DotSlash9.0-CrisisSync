# Progressive Web App (PWA) Implementation Guide

## Overview

XSpark CRM is now a fully functional Progressive Web App with offline capabilities, installability, and native app-like experience.

## Features Implemented

### 1. ✅ Offline Functionality
- **Service Worker Caching**: Automatically caches app shell, static assets, and visited pages
- **Offline Fallback Page**: Beautiful offline page with connection status monitoring
- **Smart Caching Strategies**:
  - Static assets: Cache-first with background update
  - API calls: Network-first with cache fallback
  - Images: Cache-first for optimal performance
  - Navigation: Network-first with offline page fallback

### 2. ✅ App Installation
- **Install Prompt**: Custom installapp prompt appears after 5 seconds
- **Dismissal Logic**: Remembers dismissal for 7 days before showing again
- **Cross-Platform**: Works on Android, iOS (Add to Home Screen), Windows, and Mac
- **App Shortcuts**: Quick access to Staff and Admin pages from home screen

### 3. ✅ PWA Manifest
- **Branding**: Custom theme color (#8b5cf6 purple)
- **Display Mode**: Standalone (looks like native app)
- **Icons**: Support for multiple sizes (72px to 512px)
- **App Categories**: Business & Productivity

### 4. ✅ Service Worker Features
- **Version Management**: Automatic cache versioning
- **Update Detection**: Prompts user when new version available
- **Background Sync**: Syncs offline data when connection restored
- **Push Notifications**: Foundation for future notification features

## File Structure

```
frontend/
├── public/
│   ├── manifest.json              # PWA manifest configuration
│   ├── sw.js                      # Service worker for offline support
│   └── icons/                     # App icons (multiple sizes)
│       ├── generate-icons.html    # Tool to generate placeholder icons
│       └── ICONS_README.md        # Icon requirements guide
│
├── app/
│   ├── layout.tsx                 # Updated with PWA meta tags
│   ├── offline/
│   │   └── page.tsx              # Offline fallback page
│   └── components/
│       ├── PWAInstallPrompt.tsx           # Install prompt UI
│       └── ServiceWorkerRegistration.tsx  # Service worker registration
│
└── next.config.ts                 # Updated for PWA file serving
```

## Testing the PWA

### 1. Generate Icons (Required First)
```bash
# Open this file in your browser and download all sizes
frontend/public/icons/generate-icons.html

# Or visit: http://localhost:3000/icons/generate-icons.html when dev server is running
```

Place downloaded icons in `frontend/public/icons/`

### 2. Build for Production
PWAs require HTTPS in production and work best in production builds:

```bash
cd frontend
npm run build
npm start
```

### 3. Test Offline Functionality

#### Method 1: Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Check **Offline** checkbox
4. Try navigating the app - it should still work!
5. Try reloading - should show cached content instead of "page not found"

#### Method 2: Airplane Mode
1. Turn on airplane mode on your device
2. Try using the app
3. App should continue working with cached data

### 4. Test Installation

#### On Desktop (Chrome/Edge)
1. Look for install icon in address bar (⊕ or ⬇)
2. Click to install
3. Or wait for automatic install prompt
4. App appears in Start Menu/Applications

#### On Android (Chrome)
1. Visit the site
2. Wait for "Add to Home Screen" banner OR
3. Open menu → "Install app"
4. App appears on home screen like native app

#### On iOS (Safari)
1. Tap Share button (square with arrow)
2. Scroll down and tap "Add to Home Screen"
3. Enter name and tap "Add"
4. App icon appears on home screen

## Verification Checklist

✅ **Service Worker Registration**
- Open Chrome DevTools → Application → Service Workers
- Should show "activated and running"

✅ **Manifest**
- DevTools → Application → Manifest
- Check all fields are populated correctly
- Verify icons load without errors

✅ **Cache Storage**
- DevTools → Application → Cache Storage
- Should see 3 caches: static, dynamic, images
- Check cached files are listed

✅ **Offline Test**
1. Visit several pages while online
2. Turn on offline mode
3. Navigate to visited pages - should work
4. Refresh page - should still work
5. Try visiting new page - should show offline fallback

✅ **Install Test**
- Install prompt should appear after 5 seconds
- Clicking "Install" should add app to device
- Dismissing should remember choice for 7 days

## How It Works

### Initial Load (Online)
```
User visits app
    ↓
Service worker registers
    ↓
Cache app shell & static assets
    ↓
Load content from network
    ↓
Store in cache for offline use
```

### Subsequent Visits (Online)
```
User visits app
    ↓
Service worker intercepts requests
    ↓
Serve static assets from cache (fast!)
    ↓
Fetch fresh data from network
    ↓
Update cache in background
```

### Offline Scenario
```
User visits app (offline)
    ↓
Service worker intercepts requests
    ↓
Network request fails
    ↓
Serve from cache
    ↓
Show offline indicator if needed
```

### Connection Restored
```
Connection restored
    ↓
ServiceWorkerRegistration detects online
    ↓
Trigger background sync
    ↓
Upload any offline changes
    ↓
Refresh to latest data
```

## Integration with Existing Offline System

The PWA service worker **complements** the existing IndexedDB offline system:

### Staff Page (Offline-First)
- **IndexedDB (Dexie)**: Stores lead data for full CRUD operations offline
- **Service Worker**: Caches UI/pages so app loads offline
- **Together**: Complete offline experience - both app AND data work offline

### Admin Page (Online-First)
- **Direct Supabase**: Always fetches fresh data when online
- **Service Worker**: Caches pages so recently viewed content shows offline
- **Fallback**: Shows cached data if offline, with clear indicator

## Customization

### Change Theme Color
Edit `manifest.json`:
```json
{
  "theme_color": "#8b5cf6",  // Change this
  "background_color": "#ffffff"
}
```

Also update `app/layout.tsx`:
```typescript
export const viewport: Viewport = {
  themeColor: "#8b5cf6",  // Change this
}
```

### Change App Name
Edit `manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "YourApp"
}
```

### Adjust Cache Strategy
Edit `public/sw.js` to modify caching behavior for specific routes.

### Disable Install Prompt
Remove `<PWAInstallPrompt />` from `app/layout.tsx`.

## Troubleshooting

### Issue: Service Worker Not Updating
**Solution**: 
1. Unregister old service worker: DevTools → Application → Service Workers → Unregister
2. Clear all caches: DevTools → Application → Cache Storage → Delete all
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Update `CACHE_VERSION` in `sw.js` to force cache bust

### Issue: Install Prompt Not Showing
**Reasons**:
- Already installed (check if app is in standalone mode)
- Recently dismissed (< 7 days ago)
- Not served over HTTPS (except localhost)
- Browser doesn't support (Firefox doesn't show prompt)

**Solution**: 
- Check DevTools → Application → Manifest for errors
- Clear localStorage: `localStorage.removeItem('pwa-install-dismissed')`
- Use Chrome/Edge which have best PWA support

### Issue: Offline Page Not Loading
**Solution**:
1. Visit offline page while online first: `/offline`
2. Check it's cached: DevTools → Application → Cache Storage
3. Verify in service worker: `STATIC_ASSETS` includes `/offline`

### Issue: Icons Not Loading
**Solution**:
1. Generate icons using `/icons/generate-icons.html`
2. Place all 8 sizes in `/public/icons/` folder
3. Verify paths in `manifest.json` match actual files
4. Check DevTools → Application → Manifest → Icons

## Performance Benefits

### ⚡ Faster Load Times
- Static assets load instantly from cache
- Eliminates network latency for cached content
- Background updates keep content fresh

### 📱 Native App Experience
- Appears in app drawer/home screen alongside native apps
- Full-screen display (no browser UI)
- App-like navigation and animations

### 🔌 Offline Capability
- Works without internet connection
- Critical functionality remains available
- Graceful degradation for online-only features

### 💾 Reduced Data Usage
- Minimizes repeated downloads
- Smart caching reduces bandwidth consumption
- Better experience on slow/metered connections

## Browser Support

| Browser | Install | Offline | Notifications |
|---------|---------|---------|---------------|
| Chrome (Desktop/Android) | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Safari (iOS 11.3+) | Manual* | ✅ | ❌ |
| Safari (macOS) | ✅ | ✅ | ❌ |
| Firefox | ❌ | ✅ | ✅ |
| Samsung Internet | ✅ | ✅ | ✅ |

*iOS Safari requires manual "Add to Home Screen" - no install prompt

## Next Steps

### Recommended Enhancements
1. **Push Notifications**: Enable real-time alerts for new leads
2. **Background Sync**: Auto-sync when connection available
3. **Periodic Background Sync**: Update cache even when app closed
4. **Share Target**: Allow sharing to app from other apps
5. **File Handling**: Register as handler for specific file types

### Analytics
Track PWA metrics:
- Install rate
- Offline usage
- Standalone mode usage
- Service worker update rate

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox (Advanced SW library)](https://developers.google.com/web/tools/workbox)

## Support

For PWA-related issues:
1. Check browser console for service worker logs
2. Verify manifest in DevTools
3. Test in Chrome first (best PWA support)
4. Ensure HTTPS in production
5. Check service worker scope and registration

---

**Status**: ✅ PWA Implementation Complete & Ready for Testing

**Last Updated**: February 15, 2026
