'use client'

import Link from 'next/link'
import { Navbar } from './components/Navbar'
import {
  Users,
  ClipboardList,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle,
  Shield,
  Smartphone,
  Clock,
  BarChart3,
  Sparkles,
  Globe,
  Camera,
  Wifi,
  AudioLines
} from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { WarpBackground } from '@/components/ui/warp-background'

export default function LandingPage() {
  const { user } = useAuth()

  const features = [
    {
      icon: ClipboardList,
      title: 'Smart Lead Capture',
      description: 'Intelligent forms with OCR scanning and offline support for seamless lead collection.'
    },
    {
      icon: Users,
      title: 'Role Management',
      description: 'Granular access control for staff, admins, and attendees with dedicated workflows.'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Live dashboards with actionable insights to track performance and optimize conversions.'
    },
    {
      icon: AudioLines,
      title: 'Audio Transcription',
      description: 'Convert voice notes to text automatically with AI-powered transcription.'
    },
    {
      icon: Wifi,
      title: 'Offline First',
      description: 'Work seamlessly without internet. Data syncs automatically when connected.'
    },
    {
      icon: Smartphone,
      title: 'Mobile Optimized',
      description: 'Native-like PWA experience with install support across all devices.'
    }
  ]

  const stats = [
    { value: '99.9%', label: 'Uptime', sublabel: 'Guaranteed' },
    { value: '<50ms', label: 'Response', sublabel: 'Time' },
    { value: '100%', label: 'Offline', sublabel: 'Ready' },
    { value: '24/7', label: 'Support', sublabel: 'Available' }
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
              <span className="text-sm font-medium text-slate-700">Next-Gen Lead Management Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-slate-900 leading-tight tracking-tight">
              Transform Your
              <span className="block mt-2 text-slate-900">
                Event Lead Capture
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-slate-700 leading-relaxed max-w-3xl mx-auto">
              Enterprise-grade CRM designed for event professionals. Capture, track, and convert leads with powerful tools that work offline and sync seamlessly.
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
              Everything you need to succeed
            </h2>
            <p className="text-lg text-slate-600">
              Built for modern event professionals with enterprise-grade capabilities
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

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to transform your event lead management?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Join teams already using XSpark CRM to capture and convert more leads.
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200"
                >
                  Start Free Trial
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
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">XS</span>
                </div>
                <span className="font-bold text-lg text-slate-900">XSpark CRM</span>
              </div>
              <p className="text-slate-600 max-w-md">
                Modern lead management platform designed for event professionals.
                Capture, track, and convert leads efficiently.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/tab" className="text-slate-600 hover:text-blue-600 transition-colors">Lead Form</Link></li>
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
              &copy; 2026 XSpark CRM. All rights reserved.
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
