'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { LogOut, Menu, X, Download, LayoutDashboard, ClipboardList, Sparkles } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/dashboard', label: 'Submit Request', icon: ClipboardList, authRequired: true },
  ]

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="shrink-0">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-linear-to-br from-purple-600 via-pink-600 to-purple-700 rounded-xl flex items-center justify-center group-hover:from-purple-700 group-hover:via-pink-700 group-hover:to-purple-800 transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:scale-105">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-slate-900 leading-tight">XORcists</span>
                <span className="text-[10px] text-slate-500 font-medium leading-none">Civic Platform</span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              if (link.authRequired && !user) return null
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg transition-all font-medium flex items-center space-x-2 ${
                    isActive(link.href)
                      ? 'bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              )
            })}

            {/* Install Button */}
            {user && (
              <Link
                href="/install"
                className="px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all font-medium flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Install</span>
              </Link>
            )}

            {/* Auth Section */}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-slate-200">
              {user ? (
                <>
                  <div className="hidden lg:flex flex-col items-end px-3">
                    <span className="text-sm font-medium text-slate-700 leading-tight">
                      {user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-tight">Admin</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center space-x-2 transition-all text-sm font-medium"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-5 py-2 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-slate-200">
            {navLinks.map((link) => {
              const Icon = link.icon
              if (link.authRequired && !user) return null
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${
                    isActive(link.href)
                      ? 'bg-linear-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              )
            })}

            {user && (
              <Link
                href="/install"
                className="px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium flex items-center space-x-3"
                onClick={() => setIsOpen(false)}
              >
                <Download size={18} />
                <span>Install App</span>
              </Link>
            )}
            
            <div className="border-t border-slate-200 pt-2 mt-2">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-slate-600 bg-slate-50 rounded-lg mb-2">
                    <div className="font-medium text-slate-800">{user.email?.split('@')[0]}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center space-x-3 transition-colors mt-2 font-medium"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link
                    href="/login"
                    className="block text-center px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="block text-center px-4 py-2 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
