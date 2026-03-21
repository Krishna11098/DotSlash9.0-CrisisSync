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
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 sm:pt-24 sm:pb-16 flex-none">
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex flex-col items-center justify-center p-1 rounded-3xl bg-gradient-to-br from-slate-200/50 to-white shadow-xl shadow-purple-900/5 mb-8 border border-white">
            <div className="w-20 h-20 bg-white rounded-[22px] flex items-center justify-center border border-slate-100 shadow-sm">
              <Smartphone size={34} className="text-purple-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
            Install <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">XORcists</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            Get the full app experience — instant access from your home screen, offline capability, and native features.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 relative z-10 pb-20 w-full flex-1">
        {/* Already Installed */}
        {isInstalled && (
          <div className="relative bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-8 sm:p-12 mb-8 text-center group overflow-hidden">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-150"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-300"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200"></div>

            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100 shadow-sm">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              App Installed Successfully
            </h2>
            <p className="text-slate-600 mb-8 font-medium">
              XORcists is running in standalone mode. Find it on your home screen or app launcher.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 hover:-translate-y-0.5"
            >
              Open Dashboard
            </button>
          </div>
        )}

        {/* Install Actions */}
        {!isInstalled && (
          <div className="relative bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-8 sm:p-12 mb-8 group overflow-hidden">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500 rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500 rounded-tr-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-150"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-300"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500 rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200"></div>

            {/* Chrome with prompt ready */}
            {browserType === 'chrome' && deferredPrompt && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full mb-6">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-sm font-semibold text-emerald-700">Ready to Install</span>
                </div>

                <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                  One Tap Install
                </h2>
                <p className="text-slate-600 mb-8 text-lg max-w-sm mx-auto font-medium">
                  No app store needed. Install directly to your device securely.
                </p>

                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-all shadow-xl shadow-purple-600/20 hover:shadow-2xl hover:shadow-purple-600/30 hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0"
                >
                  <Download size={22} className={isInstalling ? "animate-bounce" : ""} />
                  {isInstalling ? 'Installing...' : 'Install App Securely'}
                </button>

                <p className="text-sm text-slate-400 font-medium mt-5">
                  Confirm the prompt to add to your home screen.
                </p>
              </div>
            )}

            {/* Chrome without prompt */}
            {browserType === 'chrome' && !deferredPrompt && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 rounded-full mb-6">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <span className="text-sm font-semibold text-amber-700">Waiting for browser...</span>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Install Manually
                </h2>
                <p className="text-slate-600 mb-8 font-medium">
                  The automatic installer is loading. You can also install manually:
                </p>

                <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-md mx-auto mb-8 border border-slate-100 shadow-inner">
                  <div className="space-y-4">
                    {[
                      { step: '1', text: 'Look for the install icon (⊕) in your address bar' },
                      { step: '2', text: 'Or open browser menu (⋮) → "Install app"' },
                      { step: '3', text: 'Tap "Install" to confirm' },
                    ].map(item => (
                      <div key={item.step} className="flex items-start gap-3">
                        <span className="shrink-0 w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-extrabold">
                          {item.step}
                        </span>
                        <span className="text-slate-700 text-sm pt-0.5 font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors text-sm"
                >
                  🔄 Refresh Check
                </button>
              </div>
            )}

            {/* Safari (iOS) */}
            {browserType === 'safari' && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full mb-6">
                    <span className="text-sm">🍎</span>
                    <span className="text-sm font-semibold text-slate-700">iOS Detected</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                    Install on iPhone or iPad
                  </h2>
                  <p className="text-slate-600 font-medium">Follow these quick steps to add to your home screen</p>
                </div>

                <div className="space-y-3 max-w-md mx-auto">
                  {[
                    { step: '1', title: 'Tap the Share Button', desc: 'The square with arrow (↑) at the bottom of Safari', color: 'bg-blue-600' },
                    { step: '2', title: '"Add to Home Screen"', desc: 'Scroll down in the share menu and tap this option', color: 'bg-blue-600' },
                    { step: '3', title: 'Tap "Add"', desc: 'Confirm in the top right corner', color: 'bg-blue-600' },
                    { step: '✓', title: 'Done! 🎉', desc: 'XORcists now appears on your home screen', color: 'bg-purple-600' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
                        item.step === '✓'
                          ? 'bg-purple-50/50 border-purple-200 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <span className={`shrink-0 w-10 h-10 ${item.color} text-white rounded-xl flex items-center justify-center text-sm font-extrabold shadow-md`}>
                        {item.step}
                      </span>
                      <div>
                        <strong className="block text-slate-900 text-sm">{item.title}</strong>
                        <span className="text-slate-500 text-xs font-medium">{item.desc}</span>
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
                <p className="text-slate-600 mb-6 font-medium">
                  For the best install experience, please use one of these browsers:
                </p>
                <div className="inline-flex flex-col gap-2 text-left text-slate-700 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  {[
                    'Google Chrome (Android/Desktop)',
                    'Microsoft Edge (Desktop)',
                    'Safari (iOS/Mac)',
                    'Samsung Internet (Android)',
                  ].map(browser => (
                    <div key={browser} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-purple-500 shrink-0" />
                      <span className="text-sm font-medium">{browser}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className={`w-12 h-12 ${benefit.bg} rounded-2xl flex items-center justify-center mb-5 border border-white shadow-sm transition-transform group-hover:scale-110 duration-300`}>
                <benefit.icon size={22} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{benefit.title}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Alternative Methods Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          <h3 className="font-bold text-base mb-5 flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            Alternative Install Methods
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm font-medium">
            {[
              { platform: 'Desktop', instruction: 'Click ⊕ in the address bar', icon: '💻' },
              { platform: 'Android', instruction: 'Menu (⋮) → "Install app"', icon: '🤖' },
              { platform: 'iOS', instruction: 'Share → "Add to Home Screen"', icon: '📱' },
            ].map(method => (
              <div key={method.platform} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                <span className="font-bold text-purple-300 flex items-center gap-2 mb-2">
                  <span>{method.icon}</span> {method.platform}
                </span>
                <span className="text-slate-400 text-xs">{method.instruction}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-10">
          <button
            onClick={() => router.push('/')}
            className="text-slate-500 hover:text-slate-900 font-semibold transition-colors text-sm inline-flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
