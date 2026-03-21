'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { LogOut, Menu, X, Download, LayoutDashboard, ClipboardList, Sparkles, UserRound, MapPin, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    try {
      setProfileDropdownOpen(false)
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/dashboard', label: 'Submit Request', icon: ClipboardList, authRequired: true },
  ]

  const userInitials = user?.email?.split('@')[0]?.slice(0, 2)?.toUpperCase() || 'U'

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
            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-slate-200">
              {user ? (
                <>
                  {/* Profile Avatar with Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      id="profile-avatar-btn"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className={`relative group flex items-center space-x-2 focus:outline-none`}
                      aria-label="Profile menu"
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                        isActive('/profile') ? 'ring-2 ring-purple-400 ring-offset-2' : ''
                      }`}>
                        {userInitials}
                      </div>
                      {/* Active indicator dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                    </button>

                    {/* Dropdown Menu */}
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* User Info Header */}
                        <div className="px-4 py-3 border-b border-slate-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {user.email?.split('@')[0]}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <Link
                            href="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                              <UserRound size={16} className="text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">My Profile</p>
                              <p className="text-xs text-slate-500">View & edit your profile</p>
                            </div>
                          </Link>

                          <Link
                            href="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <MapPin size={16} className="text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium">Edit Location</p>
                              <p className="text-xs text-slate-500">Update your map location</p>
                            </div>
                          </Link>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100 my-1" />

                        {/* Logout */}
                        <div className="py-1">
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <LogOut size={16} className="text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">Logout</p>
                              <p className="text-xs text-red-400">Sign out of your account</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Profile Avatar */}
            {user && (
              <Link
                href="/profile"
                className={`w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-md transition-all duration-200 hover:scale-105 ${
                  isActive('/profile') ? 'ring-2 ring-purple-400 ring-offset-1' : ''
                }`}
              >
                {userInitials}
              </Link>
            )}
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

            {/* Profile link in mobile menu */}
            {user && (
              <Link
                href="/profile"
                className={`px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${
                  isActive('/profile')
                    ? 'bg-linear-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <UserRound size={18} />
                <span>Profile & Location</span>
              </Link>
            )}

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
                  <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50 rounded-lg mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {userInitials}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{user.email?.split('@')[0]}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
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
