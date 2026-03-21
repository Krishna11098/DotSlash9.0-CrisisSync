"use client"

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import ProtectedLayout from '@/app/components/ProtectedLayout'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LocateFixed,
  MapPin,
  RefreshCcw,
  User,
  Mail,
  Shield,
  Building2,
  Navigation,
  Crosshair,
  Save,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const LeafletLocationPicker = dynamic(
  () => import('../components/LeafletLocationPicker').then(mod => mod.LeafletLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse flex items-center justify-center">
        <div className="text-center space-y-3">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto animate-bounce" />
          <p className="text-sm text-slate-400 font-medium">Loading map...</p>
        </div>
      </div>
    ),
  }
)

type UserProfile = {
  name: string
  email: string
  role: 'citizen' | 'gov_employee'
  gov_sub_role: string | null
  latitude: number | null
  longitude: number | null
}

type Status = {
  type: 'success' | 'error' | 'info' | ''
  text: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>({ type: '', text: '' })
  const [locatingGPS, setLocatingGPS] = useState(false)

  const hasLocation = latitude !== null && longitude !== null

  const locationLabel = useMemo(() => {
    if (!hasLocation) return 'Not set'
    return `${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`
  }, [hasLocation, latitude, longitude])

  const hasUnsavedChanges = useMemo(() => {
    if (!profile) return false
    return latitude !== profile.latitude || longitude !== profile.longitude
  }, [profile, latitude, longitude])

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      setLoading(true)
      setStatus({ type: '', text: '' })

      const { data, error } = await supabase
        .from('users2')
        .select('name, email, role, gov_sub_role, latitude, longitude')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        setStatus({ type: 'error', text: 'Unable to load your profile right now.' })
      } else {
        setProfile(data as UserProfile)
        setLatitude(data.latitude)
        setLongitude(data.longitude)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [user])

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus({ type: 'error', text: 'Geolocation is not supported by your browser.' })
      return
    }

    setLocatingGPS(true)
    setStatus({ type: 'info', text: 'Requesting your current location…' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setStatus({ type: 'success', text: 'Location captured from your device.' })
        setLocatingGPS(false)
      },
      () => {
        setStatus({ type: 'error', text: 'Could not read your location. Please allow location access.' })
        setLocatingGPS(false)
      }
    )
  }

  const handleSave = async () => {
    if (!user) return

    if (profile?.role === 'gov_employee' && (!hasLocation || latitude === null || longitude === null)) {
      setStatus({ type: 'error', text: 'Government accounts must keep a saved location.' })
      return
    }

    setSaving(true)
    setStatus({ type: '', text: '' })

    const { error } = await supabase
      .from('users2')
      .update({ latitude, longitude })
      .eq('id', user.id)

    if (error) {
      setStatus({ type: 'error', text: 'Failed to save changes. Please try again.' })
    } else {
      setProfile(prev => prev ? { ...prev, latitude, longitude } : prev)
      setStatus({ type: 'success', text: 'Location saved to your profile.' })
    }

    setSaving(false)
  }

  const handleReset = () => {
    setLatitude(profile?.latitude ?? null)
    setLongitude(profile?.longitude ?? null)
    setStatus({ type: '', text: '' })
  }

  const userInitials = profile?.name?.slice(0, 2)?.toUpperCase() || user?.email?.slice(0, 2)?.toUpperCase() || 'U'

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        {/* Profile Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }} />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 text-white/70 hover:text-white transition-colors mb-6 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-white/70" />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
              </div>

              {/* Name & Info */}
              <div className="flex-1 min-w-0 space-y-1">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-7 bg-white/20 rounded-lg w-48 animate-pulse" />
                    <div className="h-4 bg-white/10 rounded w-64 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-white tracking-tight truncate">{profile?.name || 'Your Profile'}</h1>
                    <p className="text-white/70 text-sm truncate">{profile?.email}</p>
                  </>
                )}
              </div>

              {/* Role Badge */}
              {profile && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm backdrop-blur-sm ${
                  profile.role === 'gov_employee'
                    ? 'bg-amber-400/20 text-amber-100 border border-amber-300/30'
                    : 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30'
                }`}>
                  <Shield size={14} />
                  {profile.role === 'gov_employee' ? 'Government Employee' : 'Citizen'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-12">
          {/* Status Alert */}
          {status.text && (
            <div
              className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium shadow-lg mb-6 backdrop-blur-sm ${
                status.type === 'error'
                  ? 'bg-red-50/90 text-red-700 border border-red-200'
                  : status.type === 'success'
                    ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-200'
                    : 'bg-blue-50/90 text-blue-700 border border-blue-200'
              }`}
            >
              {status.type === 'error' && <AlertCircle size={18} />}
              {status.type === 'success' && <CheckCircle2 size={18} />}
              {status.type === 'info' && <Navigation size={18} className="animate-pulse" />}
              <span>{status.text}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Profile Info Cards */}
            <div className="space-y-5 lg:col-span-1">
              {/* Profile Overview Card */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 border-b border-purple-100/50">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <User size={18} className="text-purple-600" />
                    Profile Details
                  </h2>
                </div>

                <div className="p-5">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="h-3 bg-slate-100 rounded w-16 animate-pulse" />
                          <div className="h-5 bg-slate-100 rounded w-3/4 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : profile ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={16} className="text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Name</p>
                          <p className="font-semibold text-slate-900 mt-0.5">{profile.name}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Mail size={16} className="text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Email</p>
                          <p className="font-semibold text-slate-900 mt-0.5 truncate">{profile.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Shield size={16} className="text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Role</p>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mt-1 ${
                            profile.role === 'gov_employee'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {profile.role === 'gov_employee' ? '🏛️ Government' : '👤 Citizen'}
                          </span>
                        </div>
                      </div>

                      {profile.gov_sub_role && (
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 size={16} className="text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Department</p>
                            <p className="font-semibold text-slate-900 mt-0.5">{profile.gov_sub_role}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No profile data found.</p>
                  )}
                </div>
              </div>

              {/* Current Location Card */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 border-b border-emerald-100/50">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin size={18} className="text-emerald-600" />
                    Saved Location
                  </h2>
                </div>

                <div className="p-5">
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${
                    hasLocation ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      hasLocation ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
                    }`}>
                      <MapPin size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 font-medium">Coordinates</p>
                      <p className={`font-mono text-sm font-semibold truncate ${
                        hasLocation ? 'text-emerald-800' : 'text-slate-500'
                      }`}>
                        {locationLabel}
                      </p>
                    </div>
                  </div>

                  {hasUnsavedChanges && (
                    <div className="mt-3 flex items-center gap-2 text-amber-600 text-xs font-medium bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                      <AlertCircle size={14} />
                      <span>You have unsaved location changes</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Map Editor */}
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200/80 overflow-hidden">
                {/* Map Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-indigo-100/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Crosshair size={18} className="text-indigo-600" />
                        Edit Your Location
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">Click on the map to drop a pin or use GPS to auto-detect your location.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={locatingGPS}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-60"
                      >
                        {locatingGPS ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <LocateFixed size={16} className="text-indigo-500" />
                        )}
                        {locatingGPS ? 'Locating…' : 'Use GPS'}
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                      >
                        <RefreshCcw size={16} className="text-slate-500" />
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div className="p-5 space-y-5">
                  <LeafletLocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    height={400}
                    onChange={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                      setStatus({ type: 'info', text: 'Pin moved — remember to save your changes.' })
                    }}
                  />

                  {/* Coordinate Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <Navigation size={14} className="text-indigo-500" />
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={latitude ?? ''}
                        onChange={(e) => setLatitude(e.target.value === '' ? null : parseFloat(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 bg-slate-50/50 hover:bg-white transition-colors"
                        placeholder="e.g. 19.0760"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <Navigation size={14} className="text-indigo-500 rotate-90" />
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={longitude ?? ''}
                        onChange={(e) => setLongitude(e.target.value === '' ? null : parseFloat(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 bg-slate-50/50 hover:bg-white transition-colors"
                        placeholder="e.g. 72.8777"
                      />
                    </div>
                  </div>

                  {/* Save Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-purple-50/50 border border-slate-200/80">
                    <p className="text-sm text-slate-600">
                      {profile?.role === 'gov_employee'
                        ? '🏛️ Government profiles must keep an up-to-date location.'
                        : '📍 Saving your location helps us prioritize and route requests faster.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || loading || !hasUnsavedChanges}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                        hasUnsavedChanges
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5'
                          : 'bg-slate-300 cursor-not-allowed'
                      } disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none`}
                    >
                      {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      {saving ? 'Saving…' : 'Save Location'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
