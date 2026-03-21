'use client'

import Link from 'next/link'
import { Navbar } from './components/Navbar'
import {
  ClipboardList,
  TrendingUp,
  Zap,
  ArrowRight,
  Shield,
  Smartphone,
  Clock,
  Sparkles,
  Globe,
  Wifi,
  MapPin,
  Mic,
  Camera,
  Building2,
} from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { WarpBackground } from '@/components/ui/warp-background'

export default function LandingPage() {
  const { user } = useAuth()

  const features = [
    {
      icon: ClipboardList,
      title: 'Smart Request Submission',
      description: 'Submit civic requests with text, images, or voice notes — even without internet.'
    },
    {
      icon: Building2,
      title: 'Multi-Department Routing',
      description: 'Route your request to Hospital, Fire, Police, or Municipal Corporation instantly.'
    },
    {
      icon: MapPin,
      title: 'Location-Aware',
      description: 'Automatic GPS location capture ensures requests reach the right jurisdiction.'
    },
    {
      icon: Mic,
      title: 'Voice & Image Support',
      description: 'Record audio descriptions or attach photos — no typing required.'
    },
    {
      icon: Wifi,
      title: 'Offline First',
      description: 'Works seamlessly without internet. Data syncs automatically when connected.'
    },
    {
      icon: Smartphone,
      title: 'Install as App',
      description: 'Native-like PWA experience — install on your phone and access anytime.'
    }
  ]

  const stats = [
    { value: '24/7', label: 'Available', sublabel: 'Always On' },
    { value: '<50ms', label: 'Response', sublabel: 'Time' },
    { value: '100%', label: 'Offline', sublabel: 'Ready' },
    { value: '4+', label: 'Departments', sublabel: 'Connected' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Navbar />

      {/* Hero Section with WarpBackground */}
      <section className="relative overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Full-page WarpBackground */}
        <WarpBackground
          className="absolute inset-0 w-full h-full"
          style={{ background: 'linear-gradient(to bottom, hsl(35 40% 95%), hsl(35 35% 92%))' } as React.CSSProperties}
          beamsPerSide={6}
          beamSize={3}
          perspective={200}
          beamDuration={5}
          beamDelayMax={4}
        >
          <></>
        </WarpBackground>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full flex items-center justify-center">
          <div className="text-center space-y-6 max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-full shadow-sm">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">Civic Request Platform by XORcists</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-slate-900 leading-tight tracking-tight">
              Your Voice,
              <span className="block mt-2 text-slate-900">
                Their Action
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-slate-700 leading-relaxed max-w-3xl mx-auto">
              Report civic issues to the right government department instantly. Works offline, captures location, and supports text, photo, and voice submissions.
            </p>

            {/* CTA Buttons */}
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-900 font-semibold rounded-xl transition-all duration-200 border border-slate-200/50 shadow-sm"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-white to-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-slate-900">{stat.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-purple-200 rounded-full mb-4 shadow-sm">
              <Globe className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Powerful Features</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything you need to be heard
            </h2>
            <p className="text-lg text-slate-600">
              Built for citizens who want fast, reliable access to government services
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white p-8 hover:bg-slate-50 transition-all duration-300"
              >
                {/* Cyberpunk Corner Brackets - Top Left & Bottom Right */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-600" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-600" />

                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center mb-5 group-hover:bg-gradient-to-br group-hover:from-purple-100 group-hover:to-pink-100 transition-colors">
                    <feature.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-300">
              Three simple steps to get your issue resolved
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Describe the Issue', desc: 'Use text, photo, or voice to report your problem. Select the relevant department.' },
              { step: '02', title: 'Share Your Location', desc: 'Tap to capture GPS coordinates so the right authorities can respond.' },
              { step: '03', title: 'Submit & Track', desc: 'Your request is saved instantly — even offline — and synced when connected.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>

          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">X</span>
                </div>
                <span className="font-bold text-lg text-slate-900">XORcists</span>
              </div>
              <p className="text-slate-600 max-w-md">
                A civic request platform that connects citizens directly with government departments. Built to work offline, designed for everyone.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><Link href="/dashboard" className="text-slate-600 hover:text-blue-600 transition-colors">Submit Request</Link></li>
                <li><Link href="/install" className="text-slate-600 hover:text-blue-600 transition-colors">Install App</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-slate-600 hover:text-blue-600 cursor-pointer transition-colors">Privacy</span></li>
                <li><span className="text-slate-600 hover:text-blue-600 cursor-pointer transition-colors">Terms</span></li>
                <li><span className="text-slate-600 hover:text-blue-600 cursor-pointer transition-colors">Contact</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm">
              &copy; 2026 XORcists. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-slate-500 text-sm hover:text-slate-700 cursor-pointer transition-colors">Documentation</span>
              <span className="text-slate-500 text-sm hover:text-slate-700 cursor-pointer transition-colors">Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
