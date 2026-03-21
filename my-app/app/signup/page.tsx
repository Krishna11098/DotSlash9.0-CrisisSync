'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Mail, Lock, User, AlertCircle, CheckCircle, MapPin, Shield, Sparkles, ArrowRight } from 'lucide-react'

export default function SignUpPage() {
    const { signUp, user } = useAuth()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<'citizen' | 'gov_employee'>('citizen')
    const [govSubRole, setGovSubRole] = useState('')
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (user) {
            router.push('/')
        }
    }, [user, router])

    if (user) {
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        if (!fullName || !email || !password) {
            setError('All fields are required')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        if (role === 'gov_employee' && (latitude === null || longitude === null)) {
            setError('Location is required for government employees')
            setLoading(false)
            return
        }

        if (role === 'gov_employee' && !govSubRole.trim()) {
            setError('Sector is required for government employees')
            setLoading(false)
            return
        }

        try {
            await signUp(email, password, fullName, role, latitude || undefined, longitude || undefined, govSubRole)
            setSuccess('Account created successfully! Redirecting to login...')
            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } catch (err) {
            let message = 'Failed to sign up'
            if (err instanceof Error) message = err.message
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/80">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-600 rounded-tl-2xl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-600 rounded-br-2xl" />

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl mb-4 shadow-lg shadow-purple-200">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
                        <p className="text-slate-500 mt-2 text-sm">Join the XORcists civic platform</p>
                    </div>

                    {/* Sign Up Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="John Doe"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Role
                            </label>
                            <div className="flex space-x-3">
                                <label className="flex-1">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="citizen" 
                                        checked={role === 'citizen'}
                                        onChange={() => setRole('citizen')}
                                        className="sr-only peer"
                                    />
                                    <div className={`p-3 text-center border rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center gap-1.5 ${
                                        role === 'citizen'
                                            ? 'border-purple-500 bg-purple-50 shadow-sm'
                                            : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                                    }`}>
                                        <User size={22} className={role === 'citizen' ? 'text-purple-600' : 'text-slate-400'} />
                                        <span className={`text-sm font-medium ${role === 'citizen' ? 'text-purple-700' : 'text-slate-600'}`}>Citizen</span>
                                    </div>
                                </label>
                                <label className="flex-1">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="gov_employee" 
                                        checked={role === 'gov_employee'}
                                        onChange={() => setRole('gov_employee')}
                                        className="sr-only peer"
                                    />
                                    <div className={`p-3 text-center border rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center gap-1.5 ${
                                        role === 'gov_employee'
                                            ? 'border-purple-500 bg-purple-50 shadow-sm'
                                            : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                                    }`}>
                                        <Shield size={22} className={role === 'gov_employee' ? 'text-purple-600' : 'text-slate-400'} />
                                        <span className={`text-sm font-medium ${role === 'gov_employee' ? 'text-purple-700' : 'text-slate-600'}`}>Gov Employee</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Gov Employee Fields */}
                        {role === 'gov_employee' && (
                            <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Government Sector
                                    </label>
                                    <div className="relative">
                                        <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={govSubRole}
                                            onChange={(e) => setGovSubRole(e.target.value)}
                                            required
                                            placeholder="e.g., Health, Police, Fire, Municipal"
                                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Current Location
                                    </label>
                                    {latitude && longitude ? (
                                        <div className="flex items-center space-x-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                                            <CheckCircle size={16} />
                                            <span>Location captured ({latitude.toFixed(4)}, {longitude.toFixed(4)})</span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (navigator.geolocation) {
                                                    navigator.geolocation.getCurrentPosition(
                                                        (position) => {
                                                            setLatitude(position.coords.latitude)
                                                            setLongitude(position.coords.longitude)
                                                        },
                                                        () => {
                                                            setError('Failed to get location. Please enable location services.')
                                                        }
                                                    )
                                                } else {
                                                    setError('Geolocation is not supported by your browser')
                                                }
                                            }}
                                            className="w-full flex items-center justify-center space-x-2 border-2 border-dashed border-slate-300 bg-white rounded-xl py-3 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
                                        >
                                            <MapPin size={16} className="text-slate-500" />
                                            <span className="text-slate-600">Get Current Location</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">At least 6 characters</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-xl p-3">
                                <AlertCircle className="text-red-600 shrink-0" size={18} />
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                                <p className="text-emerald-600 text-sm">{success}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg mt-2"
                        >
                            {loading ? (
                                <span>Creating account...</span>
                            ) : (
                                <>
                                    <span>Sign Up</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="mt-8 mb-6 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white text-slate-500">Already have an account?</span>
                        </div>
                    </div>

                    {/* Login Link */}
                    <div className="text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                        >
                            Sign in instead
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
