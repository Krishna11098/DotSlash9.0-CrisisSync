'use client';

import { Download, Smartphone, CheckCircle2, Monitor, Tablet, Wifi, ArrowLeft, Sparkles, Zap, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';

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
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const userAgent = navigator.userAgent;
    if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      setBrowserType('safari');
    } else if (/Chrome/.test(userAgent)) {
      setBrowserType('chrome');
    } else {
      setBrowserType('other');
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
    setIsInstalling(false);
  };

  const benefits = [
    {
      icon: Wifi,
      title: 'Works Offline',
      description: 'Submit requests without internet. Syncs automatically when reconnected.',
      gradient: 'from-purple-500 to-violet-600',
      bg: 'bg-purple-50',
    },
    {
      icon: Monitor,
      title: 'Full Screen',
      description: 'Runs like a native app — no browser UI, no distractions.',
      gradient: 'from-blue-500 to-cyan-600',
      bg: 'bg-blue-50',
    },
    {
      icon: Tablet,
      title: 'All Devices',
      description: 'Install on Android, iOS, Windows, Mac — works everywhere.',
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 pt-16 pb-24">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl mb-6 shadow-2xl">
            <Smartphone size={36} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Install XORcists
          </h1>
          <p className="text-lg text-purple-200 max-w-lg mx-auto">
            Get the full app experience — instant access from your home screen, offline support, and push notifications.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 -mt-12 relative z-10 pb-16">
        {/* Already Installed */}
        {isInstalled && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 mb-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              App Installed! 🎉
            </h2>
            <p className="text-slate-600 mb-6">
              XORcists is running in standalone mode. Find it on your home screen or app list.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-200"
            >
              Open App
            </button>
          </div>
        )}

        {/* Install Actions */}
        {!isInstalled && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 mb-8">
            {/* Chrome with prompt ready */}
            {browserType === 'chrome' && deferredPrompt && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full mb-6">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-emerald-700">Ready to Install</span>
                </div>

                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                  One Tap Install
                </h2>
                <p className="text-slate-600 mb-8 text-lg max-w-md mx-auto">
                  No app store needed — install directly from your browser in seconds.
                </p>

                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-all shadow-xl shadow-purple-200 hover:shadow-2xl hover:shadow-purple-300 hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0"
                >
                  <Download size={24} />
                  {isInstalling ? 'Installing...' : 'Install App'}
                </button>

                <p className="text-sm text-slate-400 mt-4 max-w-sm mx-auto">
                  A quick install dialog will appear — just tap &quot;Install&quot; to confirm.
                </p>
              </div>
            )}

            {/* Chrome without prompt */}
            {browserType === 'chrome' && !deferredPrompt && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full mb-6">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-amber-700">Waiting for browser...</span>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Install Manually
                </h2>
                <p className="text-slate-600 mb-8">
                  The automatic installer is loading. You can also install manually:
                </p>

                <div className="bg-slate-50 rounded-xl p-6 text-left max-w-lg mx-auto mb-6">
                  <div className="space-y-4">
                    {[
                      { step: '1', text: 'Look for the install icon (⊕) in your address bar' },
                      { step: '2', text: 'Or open browser menu (⋮) → "Install app"' },
                      { step: '3', text: 'Tap "Install" to confirm' },
                    ].map(item => (
                      <div key={item.step} className="flex items-start gap-3">
                        <span className="shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </span>
                        <span className="text-slate-700 text-sm pt-0.5">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
                >
                  🔄 Refresh Page
                </button>
              </div>
            )}

            {/* Safari (iOS) */}
            {browserType === 'safari' && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full mb-6">
                    <span className="text-sm">🍎</span>
                    <span className="text-sm font-medium text-blue-700">iOS Detected</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Install on iPhone/iPad
                  </h2>
                  <p className="text-slate-600">Follow these quick steps to add to your home screen</p>
                </div>

                <div className="space-y-3 max-w-lg mx-auto">
                  {[
                    { step: '1', title: 'Tap the Share Button', desc: 'The square with arrow (↑) at the bottom of Safari', color: 'bg-blue-600' },
                    { step: '2', title: '"Add to Home Screen"', desc: 'Scroll down in the share menu and tap this option', color: 'bg-blue-600' },
                    { step: '3', title: 'Tap "Add"', desc: 'Confirm in the top right corner', color: 'bg-blue-600' },
                    { step: '✓', title: 'Done! 🎉', desc: 'XORcists now appears on your home screen', color: 'bg-emerald-600' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                        item.step === '✓'
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`shrink-0 w-9 h-9 ${item.color} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                        {item.step}
                      </span>
                      <div>
                        <strong className="block text-slate-900 text-sm">{item.title}</strong>
                        <span className="text-slate-500 text-xs">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other browsers */}
            {browserType === 'other' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Open in a Supported Browser
                </h2>
                <p className="text-slate-600 mb-6">
                  For the best install experience, please use:
                </p>
                <div className="inline-flex flex-col gap-2 text-left text-slate-700">
                  {[
                    'Google Chrome (Android/Desktop)',
                    'Microsoft Edge (Desktop)',
                    'Safari (iOS/Mac)',
                    'Samsung Internet (Android)',
                  ].map(browser => (
                    <div key={browser} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                      <CheckCircle2 size={14} className="text-purple-500" />
                      <span className="text-sm">{browser}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 hover:shadow-md transition-shadow"
            >
              <div className={`w-11 h-11 ${benefit.bg} rounded-xl flex items-center justify-center mb-4`}>
                <benefit.icon size={20} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1 text-sm">{benefit.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Alternative Methods */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            Alternative Install Methods
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            {[
              { platform: 'Desktop', instruction: 'Click ⊕ in the address bar' },
              { platform: 'Android', instruction: 'Menu (⋮) → "Install app"' },
              { platform: 'iOS', instruction: 'Share → "Add to Home Screen"' },
            ].map(method => (
              <div key={method.platform} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="font-semibold text-purple-300 block mb-1">{method.platform}</span>
                <span className="text-slate-400">{method.instruction}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Back */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/')}
            className="text-slate-500 hover:text-slate-700 font-medium transition-colors text-sm inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
