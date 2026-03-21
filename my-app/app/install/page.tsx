'use client';

import { Download, Smartphone, CheckCircle2, Monitor, Tablet, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallPage() {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [browserType, setBrowserType] = useState<'chrome' | 'safari' | 'other'>('other');

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect browser
    const userAgent = navigator.userAgent;
    if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      setBrowserType('safari');
    } else if (/Chrome/.test(userAgent)) {
      setBrowserType('chrome');
    } else {
      setBrowserType('other');
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstalling(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-600 via-purple-500 to-blue-600 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-4">
            <Smartphone size={40} className="text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Install XSpark CRM</h1>
          <p className="text-purple-100 text-lg">
            Get the full app experience on your device
          </p>
        </div>

        {/* Already Installed Card */}
        {isInstalled && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            <div className="text-center">
              <CheckCircle2 size={64} className="text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                App Already Installed! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                You're running XSpark CRM in standalone mode. Look for the app icon in your applications or home screen.
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
              >
                Go to App
              </button>
            </div>
          </div>
        )}

        {/* Install Button Card */}
        {!isInstalled && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            {/* Chrome/Android Install */}
            {browserType === 'chrome' && deferredPrompt && (
              <div className="text-center">
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                  <h3 className="font-bold text-green-800 mb-2 text-lg">✅ Ready to Install!</h3>
                  <p className="text-green-700 text-sm">
                    Your browser supports PWA installation. Click below to download and install the full app!
                  </p>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Download & Install App
                </h2>
                <p className="text-gray-600 mb-8 text-lg">
                  This will install the complete app on your device - no app store needed!
                </p>
                
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-5 px-12 rounded-2xl text-xl transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105 inline-flex items-center gap-4 mb-4"
                >
                  <Download size={32} />
                  {isInstalling ? 'Installing App...' : 'INSTALL APP NOW'}
                </button>
                
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  By clicking this button, you'll install XSpark CRM as a standalone app. It will appear in your apps list and home screen.
                </p>
              </div>
            )}

            {/* Chrome but no prompt yet */}
            {browserType === 'chrome' && !deferredPrompt && (
              <div className="text-center">
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                  <h3 className="font-bold text-yellow-800 mb-2 text-lg">⏳ Installation Available</h3>
                  <p className="text-yellow-700 text-sm">
                    The install button will appear in a moment, or you can install manually using the browser menu.
                  </p>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  How to Install This App
                </h2>
                <p className="text-gray-600 mb-6">
                  XSpark CRM can be installed as a Progressive Web App (PWA). Here's how:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-left max-w-2xl mx-auto">
                  <h3 className="font-bold text-gray-900 mb-3">📱 Installation Methods:</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-purple-600 min-w-30">Method 1:</span>
                      <span>Look for the install icon (⊕ or 💾) in your browser's address bar and click it</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-purple-600 min-w-30">Method 2:</span>
                      <span>Open browser menu (⋮) → "Install app" or "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-purple-600 min-w-30">Method 3:</span>
                      <span>Wait a few seconds and an automatic prompt will appear</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  🔄 Refresh to Try Again
                </button>
              </div>
            )}

            {/* iOS Safari Instructions */}
            {browserType === 'safari' && (
              <div>
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
                  <h3 className="font-bold text-blue-800 mb-2 text-lg">🍎 iOS Device Detected</h3>
                  <p className="text-blue-700 text-sm">
                    iOS requires manual installation via Safari. Follow the steps below.
                  </p>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Install on iPhone/iPad
                </h2>
                <div className="bg-linear-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-8 mb-4">
                  <p className="text-gray-700 font-semibold mb-6 text-center text-lg">📲 Follow These Steps:</p>
                  <ol className="space-y-4 text-gray-700">
                    <li className="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm">
                      <span className="shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">1</span>
                      <div>
                        <strong className="block mb-1">Tap the Share Button</strong>
                        <span className="text-sm">Look for the square with arrow (↑) at the bottom of your Safari browser</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm">
                      <span className="shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">2</span>
                      <div>
                        <strong className="block mb-1">Find "Add to Home Screen"</strong>
                        <span className="text-sm">Scroll down in the share menu and tap this option</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm">
                      <span className="shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">3</span>
                      <div>
                        <strong className="block mb-1">Tap "Add" Button</strong>
                        <span className="text-sm">Confirm by tapping "Add" in the top right corner</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm border-2 border-green-300">
                      <span className="shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center text-lg font-bold">✓</span>
                      <div>
                        <strong className="block mb-1 text-green-700">Done! 🎉</strong>
                        <span className="text-sm">XSpark CRM icon now appears on your home screen!</span>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Other browsers */}
            {browserType === 'other' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Browser Not Supported
                </h2>
                <p className="text-gray-600 mb-4">
                  For the best experience, please use:
                </p>
                <ul className="text-gray-700 space-y-2 mb-6">
                  <li>• Google Chrome (Android/Desktop)</li>
                  <li>• Microsoft Edge (Desktop)</li>
                  <li>• Safari (iOS/Mac)</li>
                  <li>• Samsung Internet (Android)</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Wifi size={24} className="text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Works Offline</h3>
            <p className="text-gray-600 text-sm">
              Capture leads even without internet connection. Data syncs automatically when back online.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Monitor size={24} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Full Screen</h3>
            <p className="text-gray-600 text-sm">
              Runs in standalone mode with no browser UI, just like a native app.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Tablet size={24} className="text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">All Devices</h3>
            <p className="text-gray-600 text-sm">
              Install on Android, iOS, Windows, Mac, and Linux. Works everywhere!
            </p>
          </div>
        </div>

        {/* Device Instructions */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <h3 className="font-bold text-lg mb-4">Alternative Install Methods</h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Desktop (Chrome/Edge):</strong> Look for the install icon (⊕) in the address bar
            </div>
            <div>
              <strong>Android (Chrome):</strong> Menu (⋮) → "Install app" or "Add to Home Screen"
            </div>
            <div>
              <strong>iOS (Safari):</strong> Share button → "Add to Home Screen"
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-purple-100 font-medium transition-colors"
          >
            ← Back to App
          </button>
        </div>
      </div>
    </div>
  );
}
