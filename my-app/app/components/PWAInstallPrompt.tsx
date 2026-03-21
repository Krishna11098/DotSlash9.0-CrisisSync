'use client';

import { Download, X, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show prompt if not dismissed or if it's been more than 7 days
    if (!dismissed || daysSinceDismissed > 7) {
      // Listen for the beforeinstallprompt event
      const handler = (e: Event) => {
        e.preventDefault();
        console.log('[PWA] Install prompt available');
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        
        // Show prompt after 5 seconds of page load
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      };

      window.addEventListener('beforeinstallprompt', handler);

      // Listen for successful installation
      window.addEventListener('appinstalled', () => {
        console.log('[PWA] App installed successfully');
        setIsInstalled(true);
        setShowPrompt(false);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`[PWA] User response: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save dismissal timestamp
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <>
      {/* Mobile bottom sheet style */}
      <div className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-300" onClick={handleDismiss} />
      
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 md:bottom-4 md:left-auto md:right-4 md:max-w-md">
        <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 m-0 md:m-4">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <X size={24} />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-purple-100 p-4 rounded-2xl">
              <Smartphone size={40} className="text-purple-600" />
            </div>
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Install XSpark CRM
          </h3>
          
          <p className="text-gray-600 text-center mb-6">
            Install our app for quick access, offline functionality, and a native app experience
          </p>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
              </div>
              <span className="text-gray-700">Works offline - capture leads anywhere</span>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              </div>
              <span className="text-gray-700">Fast loading and smooth performance</span>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-purple-600 rounded-full" />
              </div>
              <span className="text-gray-700">Native app experience on your device</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleInstall}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Download size={20} />
              Install App
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
