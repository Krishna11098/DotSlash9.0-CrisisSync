'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const { signIn, user } = useAuth()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push('/dashboard')
        }
    }, [user, router])

    if (user) {
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signIn(email, password)
            router.push('/dashboard')
        } catch (err) {
            let message = 'Failed to sign in'
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
                        <p className="text-gray-600 mt-2">Lead Management System</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                <AlertCircle className="text-red-600" size={20} />
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="mt-6 mb-6 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Don&apos;t have an account?</span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-gray-600">
                            <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                                Create account
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Demo Credentials */}
                <div className="mt-6 bg-blue-50 rounded-lg p-4 text-center text-sm text-gray-700">
                    <p className="font-semibold mb-2">Demo Credentials:</p>
                    <p>Email: <code className="bg-white px-2 py-1 rounded">admin@xspark.com</code></p>
                    <p>Password: <code className="bg-white px-2 py-1 rounded">password123</code></p>
                </div>
            </div>
        </div>
    )
}
