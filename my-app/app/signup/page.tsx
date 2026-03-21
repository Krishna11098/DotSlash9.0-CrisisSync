'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Mail, Lock, User, AlertCircle, CheckCircle, MapPin, Shield } from 'lucide-react'

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

    // Redirect if already logged in
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

        // Validation
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
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-lg shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                            <span className="text-white font-bold text-2xl">XS</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">XORcists</h1>
                        <p className="text-gray-600 mt-2">Create your account</p>
                    </div>

                    {/* Sign Up Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="John Doe"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex-1">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="citizen" 
                                        checked={role === 'citizen'}
                                        onChange={() => setRole('citizen')}
                                        className="sr-only peer"
                                    />
                                    <div className="p-3 text-center border rounded-lg cursor-pointer peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:bg-gray-50 flex flex-col items-center">
                                        <User size={24} className={role === 'citizen' ? 'text-blue-600' : 'text-gray-400'} />
                                        <span className="mt-1 text-sm font-medium">Citizen</span>
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
                                    <div className="p-3 text-center border rounded-lg cursor-pointer peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:bg-gray-50 flex flex-col items-center">
                                        <Shield size={24} className={role === 'gov_employee' ? 'text-blue-600' : 'text-gray-400'} />
                                        <span className="mt-1 text-sm font-medium">Gov Employee</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Location (Gov Employee Only) */}
                        {role === 'gov_employee' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Government Sector
                                </label>
                                <div className="relative mb-3">
                                    <Shield className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={govSubRole}
                                        onChange={(e) => setGovSubRole(e.target.value)}
                                        required
                                        placeholder="e.g., Health, Police, Fire, Municipal"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Location
                                </label>
                                {latitude && longitude ? (
                                    <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
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
                                                    (err) => {
                                                        setError('Failed to get location. Please enable location services.')
                                                    }
                                                )
                                            } else {
                                                setError('Geolocation is not supported by your browser')
                                            }
                                        }}
                                        className="w-full flex items-center justify-center space-x-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                    >
                                        <MapPin size={16} className="text-gray-500" />
                                        <span>Get Current Location</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                <AlertCircle className="text-red-600" size={20} />
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg p-3">
                                <CheckCircle className="text-green-600" size={20} />
                                <p className="text-green-600 text-sm">{success}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="mt-6 mb-6 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                        </div>
                    </div>

                    {/* Login Link */}
                    <div className="text-center">
                        <p className="text-gray-600">
                            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                                Sign in instead
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
