'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/app/components/Navbar'
import { ReactNode, useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    // Only redirect to login when online and not authenticated
    if (!loading && !user && isOnline) {
      router.push('/login')
    }
  }, [user, loading, router, isOnline])

  // Show loading state (only when online, offline should proceed immediately)
  if (loading && isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 animate-pulse">
            <span className="text-blue-600 font-bold text-2xl">XS</span>
          </div>
          <p className="text-white mt-4 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // When online and no user, don't render content (redirect will happen)
  if (!user && isOnline) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>You&apos;re offline — form data will be saved locally and synced when you reconnect</span>
        </div>
      )}
      <main>{children}</main>
    </div>
  )
}

