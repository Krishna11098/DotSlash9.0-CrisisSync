'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { createLeadWithOfflineSync, getCachedEvents, syncEventsCache, syncEverything } from '@/lib/offline-sync'
import { moderateRemarkWithWordList } from '@/lib/remark-moderation'
import { isValidEmail, isValidPhone, validateMaxLength, validateRequiredText } from '@/lib/validation'
import { Phone, Mail, User, Building2, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import ProtectedLayout from '@/app/components/ProtectedLayout'
import SyncStatusIndicator from '@/app/components/SyncStatusIndicator'

type EventOption = {
    id: string
    event_code: string
    name: string
}

export default function TabPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [events, setEvents] = useState<EventOption[]>([])
    const [eventsLoading, setEventsLoading] = useState(true)
    const [selectedEventId, setSelectedEventId] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        remarks: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        if (error) {
            setError('')
        }
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await syncEventsCache()
                setEvents(Array.isArray(data) ? (data as EventOption[]) : [])
            } catch (err) {
                const cachedEvents = await getCachedEvents()
                setEvents(Array.isArray(cachedEvents) ? (cachedEvents as EventOption[]) : [])
                if (!cachedEvents.length) {
                    setError('Failed to load events')
                }
            } finally {
                setEventsLoading(false)
            }
        }

        fetchEvents()
    }, [])

    useEffect(() => {
        const handleOnline = () => {
            syncEverything().catch(() => undefined)
        }

        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            // Validation
            if (!selectedEventId) {
                setError('Please select an event before submitting')
                return
            }

            const nameError = validateRequiredText('Name', formData.name)
            if (nameError) {
                setError(nameError)
                return
            }

            if (!isValidEmail(formData.email)) {
                setError('Please enter a valid email address')
                return
            }

            if (!isValidPhone(formData.phone)) {
                setError('Please enter a valid phone number')
                return
            }

            const companyError = validateMaxLength('Company', formData.company, 120)
            if (companyError) {
                setError(companyError)
                return
            }

            const remarksError = validateMaxLength('Remarks', formData.remarks, 1000)
            if (remarksError) {
                setError(remarksError)
                return
            }

            const remarkText = formData.remarks.trim()
            if (remarkText) {
                const moderation = moderateRemarkWithWordList(remarkText)
                if (moderation.isDerogatory) {
                    setError(
                        `Submission blocked: remarks contain abusive/derogatory language (${moderation.matchedTerms.join(', ')}).`
                    )
                    return
                }
            }

            setLoading(true)

            // Prepare data
            const leadData = {
                event_id: selectedEventId,
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                company: formData.company.trim() || null,
                remark: formData.remarks.trim() || null,
                entry_type: 'client',
                capture_mode: 'stall_self',
                stage: 'met',
                priority: 5,
                staff_id: null,
                stall_number: null,
                query_type: null,
                audio_file_url: null,
                audio_file_text: null,
                ai_summary: null,
                is_duplicate: false,
                duplicate_of: null,
            }

            const saveResult = await createLeadWithOfflineSync(leadData)

            const resultMessage = saveResult.synced
                ? '✓ Lead saved and synced successfully! Your information has been recorded.'
                : '⚠ Lead saved locally. Not synced with global DB yet; it will auto-sync when internet returns.'
            setSuccess(resultMessage)

            // Reset form
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                remarks: '',
            })

            // Redirect after 2 seconds
            setTimeout(() => {
                setSuccess('')
            }, 2000)
        } catch (err) {
            let message = 'Unknown error'
            if (err instanceof Error) message = err.message
            setError(`Error: ${message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <ProtectedLayout>
            <div className="min-h-screen bg-linear-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Lead Entry Form</h1>
                        <p className="text-lg text-gray-600">
                            Welcome! Please fill in your details below. All fields marked with <span className="text-red-600">*</span> are required.
                        </p>
                        <div className="mt-3">
                            <SyncStatusIndicator />
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Event <span className="text-red-600">*</span>
                                </label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => {
                                        setSelectedEventId(e.target.value)
                                        if (error) {
                                            setError('')
                                        }
                                    }}
                                    required
                                    disabled={eventsLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition disabled:bg-gray-100"
                                >
                                    <option value="">
                                        {eventsLoading ? 'Loading events...' : 'Select event'}
                                    </option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.event_code} - {event.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Name Field */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <span className="flex items-center">
                                        <User size={18} className="mr-2 text-blue-600" />
                                        Full Name <span className="text-red-600">*</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                />
                                <p className="text-xs text-gray-500 mt-1">e.g., John Doe</p>
                            </div>

                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <span className="flex items-center">
                                        <Mail size={18} className="mr-2 text-blue-600" />
                                        Email Address <span className="text-red-600">*</span>
                                    </span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                />
                                <p className="text-xs text-gray-500 mt-1">We will use this to contact you</p>
                            </div>

                            {/* Phone Field */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <span className="flex items-center">
                                        <Phone size={18} className="mr-2 text-blue-600" />
                                        Mobile Number <span className="text-red-600">*</span>
                                    </span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="+91-9876543210"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                />
                                <p className="text-xs text-gray-500 mt-1">Including country code</p>
                            </div>

                            {/* Company Field (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <span className="flex items-center">
                                        <Building2 size={18} className="mr-2 text-gray-400" />
                                        Company Name <span className="text-gray-400 text-xs">(Optional)</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="company"
                                    value={formData.company}
                                    onChange={handleChange}
                                    placeholder="Your company name (if applicable)"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave blank if not applicable</p>
                            </div>

                            {/* Remarks Field (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <span className="flex items-center">
                                        <FileText size={18} className="mr-2 text-gray-400" />
                                        Remarks <span className="text-gray-400 text-xs">(Optional)</span>
                                    </span>
                                </label>
                                <textarea
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    placeholder="Any additional information you'd like to share..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                />
                                <p className="text-xs text-gray-500 mt-1">Tell us about your interests or needs</p>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Your entry type is set to <strong>Client/Attendee</strong>. This form is designed for visitors entering their information at the event.
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
                                    <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-semibold text-red-800">Error</p>
                                        <p className="text-red-700 text-sm">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="flex items-start space-x-3 bg-green-50 border border-green-200 rounded-lg p-4">
                                    <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-semibold text-green-800">Success</p>
                                        <p className="text-green-700 text-sm">{success}</p>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-8"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Submit Lead Information</span>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Help Section */}
                    <div className="mt-8 bg-gray-50 rounded-xl p-6 text-center">
                        <p className="text-gray-600">
                            Need help? Contact us at <span className="font-semibold">support@xspark.com</span>
                        </p>
                    </div>
                </div>
            </div>
        </ProtectedLayout>
    )
}
