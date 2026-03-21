'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { createLeadWithOfflineSync, getCachedEvents, getCachedLeadsByEvent, isBrowserOnline, syncEventsCache, syncEverything, syncLeadsForEvent } from '@/lib/offline-sync'
import { getAudioBlobByRef, markLocalAudioUploaded, saveAudioBlobLocally, uploadAudioBlobToCloudinary } from '@/lib/audio-storage'
import { isValidEmail, isValidPhone, validateMaxLength, validateRequiredText, PHONE_PATTERNS, EMAIL_PATTERNS } from '@/lib/validation'
import { scanBusinessCard, scanMultipleBusinessCards, extractCardData } from '@/lib/ocr'
import { Phone, Mail, User, Building2, FileText, AlertCircle, CheckCircle, Loader, Volume2, Star, Zap, Image as ImageIcon } from 'lucide-react'
import ProtectedLayout from '@/app/components/ProtectedLayout'
import SyncStatusIndicator from '@/app/components/SyncStatusIndicator'

// Regex patterns for data extraction
const REGEX_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    phone: /(?:\+91[-.\s]?)?(?:[0-9]{2,4}[-.\s]?)*[0-9]{7,10}/g,
}

// Check if browser is online
const isOnline = (): boolean => {
    if (typeof window === 'undefined') return false
    return navigator.onLine
}

// Validate extracted data quality
const isValidExtraction = (data: { [key: string]: string }): boolean => {
    if (data.name) {
        const nameWords = data.name.trim().split(/\s+/).length
        const nameLength = data.name.trim().length
        if (nameWords < 2 || nameLength > 60 || nameLength < 3) {
            return false
        }
    }
    if (data.company) {
        const companyLength = data.company.trim().length
        if (companyLength > 100 || companyLength < 2) {
            return false
        }
    }
    if (data.phone) {
        const phoneDigits = data.phone.replace(/\D/g, '')
        if (phoneDigits.length < 8 || phoneDigits.length > 13) {
            return false
        }
    }
    return true
}

// Extract data using regex patterns
const extractWithRegex = (text: string) => {
    const extractedData: { [key: string]: string } = {}

    // Extract email
    const emailMatch = text.match(REGEX_PATTERNS.email)
    if (emailMatch) {
        extractedData.email = emailMatch[0]
    }

    // Extract phone
    const phoneMatch = text.match(REGEX_PATTERNS.phone)
    if (phoneMatch) {
        extractedData.phone = phoneMatch[0].replace(/[^\d+]/g, '')
    }

    // Extract name - look for names with at least 2 words
    const lines = text.split('\n').filter((line) => line.trim().length > 0)
    for (const line of lines) {
        const trimmed = line.trim()
        const words = trimmed.split(/\s+/)
        // Look for lines with 2+ words that are mostly letters
        if (words.length >= 2 && /^[A-Za-z\s]{3,}$/.test(trimmed) && trimmed.length < 50) {
            extractedData.name = trimmed
            break
        }
    }

    // Extract company (look for common company indicators)
    const companyMatch = text.match(/(?:company|corp|ltd|inc|llc|pvt|co\.|org|company name)[:\s]+([A-Za-z\s&.-]+)/i)
    if (companyMatch) {
        extractedData.company = companyMatch[1].trim()
    }

    return extractedData
}

// Extract data using Gemini API
const extractWithGemini = async (extractedText: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
        throw new Error('NEXT_PUBLIC_GOOGLE_API_KEY not configured')
    }

    const prompt = `Extract NAME, PHONE, COMPANY from this business card text. Return ONLY a raw JSON object without markdown formatting.

TEXT:
${extractedText}

JSON Output:
{"name": "...", "phone": "...", "company": "..."}

Rules: name=person, phone=mobile, company=brand or company. Use "" if not found.`

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
        },
    }

    const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        }
    )

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!responseText) {
        throw new Error('Empty response from Gemini')
    }

    // Parse the JSON response
    let parsed
    try {
        parsed = JSON.parse(responseText)
    } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('No JSON found in Gemini response')
        }
        parsed = JSON.parse(jsonMatch[0])
    }

    return {
        name: parsed.name?.trim() || '',
        phone: parsed.phone?.trim() || '',
        company: parsed.company?.trim() || '',
    }
}

const CLIENT_ROLES = [
    { value: 'investor', label: 'Investor' },
    { value: 'entrepreneur', label: 'Entrepreneur' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'student', label: 'Student' },
    { value: 'other', label: 'Other' },
]

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

type EventOption = {
    id: string
    event_code: string
    name: string
}

type EventLead = {
    id?: string
    local_id?: number
    name?: string
    full_name?: string
    email: string
    phone: string
    company?: string | null
    remark?: string | null
    query_type?: string | null
    entry_type?: string | null
    capture_mode?: string | null
    stall_number?: string | null
    audio_file_url?: string | null
    audio_file_local_id?: string | null
    audio_file_text?: string | null
    designation?: string | null
    stage?: string | null
    priority?: number | null
    sync_status?: 'pending' | 'synced' | 'error'
    created_at: string
}

export default function StaffPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [transcribing, setTranscribing] = useState(false)
    const [ocrProcessing, setOcrProcessing] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [events, setEvents] = useState<EventOption[]>([])
    const [eventsLoading, setEventsLoading] = useState(true)
    const [selectedEventId, setSelectedEventId] = useState('')
    const [eventLeads, setEventLeads] = useState<EventLead[]>([])
    const [audioPlaybackUrls, setAudioPlaybackUrls] = useState<Record<string, string>>({})
    const [leadsLoading, setLeadsLoading] = useState(false)
    const [leadsError, setLeadsError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        remark: '',
        audioFile: null as File | null,
        audioFileText: '',
        imageFiles: [] as File[],
        ocrText: '',
        extractionMethod: 'none' as 'gemini' | 'regex' | 'none',
        importance: '5',
        clientRole: 'other',
        stallNumber: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        if (error) {
            setError('')
        }
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const getLeadRowKey = (lead: EventLead, index: number) => {
        if (lead.local_id) return `local-${lead.local_id}`
        if (lead.id) return `remote-${lead.id}-${index}`
        return `${lead.email}-${lead.phone}-${lead.created_at}-${index}`
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]

            const allowedExtensions = ['mp3', 'mp4', 'wav', 'm4a', 'flac', 'webm', 'ogg', 'aac', 'wma', 'mkv', 'mov', 'avi']
            const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || ''
            const isMediaMime = selectedFile.type.startsWith('audio/') || selectedFile.type.startsWith('video/')
            const isAllowedExtension = allowedExtensions.includes(fileExtension)

            if (!isMediaMime && !isAllowedExtension) {
                setError('Please upload a valid media file (MP3, MP4, WAV, M4A, FLAC, WebM, etc.)')
                e.target.value = ''
                return
            }

            const maxAudioFileSize = 20 * 1024 * 1024
            if (selectedFile.size > maxAudioFileSize) {
                setError('Audio/video file size must be 20 MB or less')
                e.target.value = ''
                return
            }

            if (error) {
                setError('')
            }
            setError('')
            setFormData((prev) => ({
                ...prev,
                audioFile: selectedFile,
                audioFileText: '', // Reset transcribed text when a new file is selected
            }))
        }
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            
            // Limit to 2 images maximum
            if (selectedFiles.length + formData.imageFiles.length > 2) {
                setError('Maximum 2 images allowed (front and back)')
                return
            }

            // Validate each file
            for (const file of selectedFiles) {
                if (!file.type.startsWith('image/')) {
                    setError('Please upload valid image file formats only')
                    return
                }

                const maxImageFileSize = 10 * 1024 * 1024
                if (file.size > maxImageFileSize) {
                    setError('Each image file must be 10 MB or less')
                    return
                }
            }

            if (error) {
                setError('')
            }
            
            setFormData((prev) => ({
                ...prev,
                imageFiles: [...prev.imageFiles, ...selectedFiles],
                ocrText: '', // Reset OCR text when new files are added
            }))
        }
    }
    
    // Remove an image from the list
    const handleRemoveImage = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            imageFiles: prev.imageFiles.filter((_, i) => i !== index),
            ocrText: '',
        }))
    }

    // Extract structured data from OCR text using regex patterns and Gemini API
    const extractDataFromOCR = async (text: string) => {
        const extractedData: { [key: string]: string } = {}
        let extractionMethod: 'gemini' | 'regex' = 'regex'
        let useGemini = false

        // Always extract email using regex (as per requirement)
        const emailMatch = text.match(REGEX_PATTERNS.email)
        if (emailMatch) {
            extractedData.email = emailMatch[0]
        }

        // Always extract phone using regex (as per requirement)
        const phoneMatch = text.match(REGEX_PATTERNS.phone)
        if (phoneMatch) {
            extractedData.phone = phoneMatch[0].replace(/[^\d+]/g, '')
        }

        // Get regex results first
        const regexResults = extractWithRegex(text)

        // Try Gemini for name and company if online
        let geminiResults: { [key: string]: string } | null = null
        if (isOnline()) {
            console.log(
                '%c⏳ Attempting Gemini 2.5 Flash extraction...',
                'color: #FFB347; font-weight: bold;'
            )
            try {
                geminiResults = await extractWithGemini(text)
                if (geminiResults && isValidExtraction(geminiResults)) {
                    useGemini = true
                    console.log(
                        '%c✨ Gemini extraction is valid, using Gemini results',
                        'color: #95E1D3; font-weight: bold;'
                    )
                } else if (geminiResults) {
                    console.log(
                        '%c⚠️ Gemini extraction failed validation, comparing with regex',
                        'color: #FFB347;'
                    )
                }
            } catch (error) {
                console.warn('Gemini extraction failed, using regex fallback')
            }
        }

        // Smart prioritization
        if (useGemini && geminiResults) {
            // Gemini results are valid, use them
            extractedData.name = geminiResults.name || regexResults.name || ''
            extractedData.company = geminiResults.company || regexResults.company || ''
            extractionMethod = 'gemini'
        } else if (isValidExtraction(regexResults)) {
            // Regex results are valid
            extractedData.name = regexResults.name || ''
            extractedData.company = regexResults.company || ''
            extractionMethod = 'regex'
        } else if (geminiResults) {
            // Fallback to gemini even if not perfect validation
            extractedData.name = geminiResults.name || ''
            extractedData.company = geminiResults.company || ''
            extractionMethod = 'gemini'
        } else {
            // Last resort: use whatever regex got
            extractedData.name = regexResults.name || ''
            extractedData.company = regexResults.company || ''
            extractionMethod = 'regex'
        }

        console.log(
            '%c✅ FINAL EXTRACTION SUMMARY',
            'color: #95E1D3; font-weight: bold; font-size: 14px;',
            {
                extractionMethod: extractionMethod.toUpperCase(),
                finalResults: extractedData,
                isValid: isValidExtraction(extractedData),
                timestamp: new Date().toISOString(),
            }
        )

        return { data: extractedData, method: extractionMethod }
    }

    const handleProcessOCR = async () => {
        if (formData.imageFiles.length === 0) {
            setError('Please select at least one image file')
            return
        }

        setOcrProcessing(true)
        setError('')

        try {
            console.log(`📸 Starting business card OCR processing with ${formData.imageFiles.length} image(s)...`)
            const scanStartTime = performance.now()

            // Use optimized scanBusinessCard or scanMultipleBusinessCards from lib/ocr
            const cardData = formData.imageFiles.length === 1 
                ? await scanBusinessCard(formData.imageFiles[0])
                : await scanMultipleBusinessCards(formData.imageFiles)

            const scanEndTime = performance.now()
            const totalLatency = (scanEndTime - scanStartTime).toFixed(2)

            console.log(
                '%c📊 OCR PROCESSING COMPLETE',
                'color: #00C851; font-weight: bold; font-size: 14px;',
                {
                    totalLatency: `${totalLatency}ms`,
                    extractedData: cardData,
                    timestamp: new Date().toISOString(),
                }
            )

            // Pre-fill form with extracted data
            setFormData((prev) => ({
                ...prev,
                name: cardData.name || prev.name,
                email: cardData.email || prev.email,
                phone: cardData.phone || prev.phone,
                company: cardData.company || prev.company,
            }))

            setSuccess(`✓ Business card scanned successfully! Latency: ${totalLatency}ms. Form pre-filled with extracted data.`)
            setTimeout(() => setSuccess(''), 4000)
        } catch (err) {
            let message = 'Unknown error'
            if (err instanceof Error) message = err.message
            setError(`OCR error: ${message}`)
            console.error('❌ OCR Processing Error:', err)
        } finally {
            setOcrProcessing(false)
        }
    }

    const handleGenerateText = async () => {
        if (!formData.audioFile) {
            setError('Please select an audio or video file first')
            return
        }

        setTranscribing(true)
        setError('')

        try {
            const audioFormData = new FormData()
            audioFormData.append('file', formData.audioFile)

            const response = await fetch(`${FASTAPI_URL}/transcribe`, {
                method: 'POST',
                body: audioFormData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Transcription failed')
            }

            const data = await response.json()

            if (data.success && data.text) {
                setFormData((prev) => ({
                    ...prev,
                    audioFileText: data.text,
                }))
                setSuccess('✓ Audio transcribed successfully!')
                setTimeout(() => setSuccess(''), 3000)
            } else {
                setError('Failed to transcribe audio')
            }
        } catch (err) {
            let message = 'Unknown error'
            if (err instanceof Error) message = err.message
            setError(`Transcription error: ${message}`)
        } finally {
            setTranscribing(false)
        }
    }

    const fetchEvents = async () => {
        try {
            const data = await syncEventsCache()
            setEvents(Array.isArray(data) ? (data as EventOption[]) : [])
        } catch (err) {
            const cachedEvents = await getCachedEvents()
            setEvents(Array.isArray(cachedEvents) ? (cachedEvents as EventOption[]) : [])
            if (!cachedEvents.length) {
                setLeadsError('Failed to load events')
            }
        } finally {
            setEventsLoading(false)
        }
    }

    const fetchLeadsForEvent = async () => {
        if (!selectedEventId) {
            setLeadsError('Please select an event first')
            setEventLeads([])
            return
        }

        setLeadsError('')
        setLeadsLoading(true)

        try {
            const data = isBrowserOnline()
                ? await syncLeadsForEvent(selectedEventId)
                : await getCachedLeadsByEvent(selectedEventId)

            setEventLeads(Array.isArray(data) ? (data as EventLead[]) : [])
        } catch (err) {
            setLeadsError('Failed to load leads for selected event')
            setEventLeads([])
        } finally {
            setLeadsLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()
    }, [])

    useEffect(() => {
        const handleOnline = () => {
            syncEverything().then(fetchEvents).catch(() => undefined)
        }

        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        const objectUrlsToRevoke: string[] = []

        const resolvePlaybackUrls = async () => {
            const nextUrls: Record<string, string> = {}

            for (let index = 0; index < eventLeads.length; index += 1) {
                const lead = eventLeads[index]
                const rowKey = getLeadRowKey(lead, index)
                const audioUrl = lead.audio_file_url

                if (!audioUrl) continue

                if (audioUrl.startsWith('offline-audio://')) {
                    const localBlob = await getAudioBlobByRef(audioUrl)
                    if (!localBlob) continue

                    const objectUrl = URL.createObjectURL(localBlob)
                    objectUrlsToRevoke.push(objectUrl)
                    nextUrls[rowKey] = objectUrl
                    continue
                }

                nextUrls[rowKey] = audioUrl
            }

            if (cancelled) {
                objectUrlsToRevoke.forEach((url) => URL.revokeObjectURL(url))
                return
            }

            setAudioPlaybackUrls(nextUrls)
        }

        resolvePlaybackUrls().catch(() => {
            if (!cancelled) {
                setAudioPlaybackUrls({})
            }
        })

        return () => {
            cancelled = true
            objectUrlsToRevoke.forEach((url) => URL.revokeObjectURL(url))
        }
    }, [eventLeads])

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

            const remarkError = validateMaxLength('Remarks', formData.remark, 1000)
            if (remarkError) {
                setError(remarkError)
                return
            }

            const stallError = validateMaxLength('Stall number', formData.stallNumber, 30)
            if (stallError) {
                setError(stallError)
                return
            }

            if (formData.stallNumber.trim() && !/^[A-Za-z0-9\s-/#]+$/.test(formData.stallNumber.trim())) {
                setError('Stall number can only include letters, numbers, spaces, -, /, and #')
                return
            }

            const parsedPriority = Number.parseInt(formData.importance, 10)
            if (Number.isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 10) {
                setError('Lead priority must be between 1 and 10')
                return
            }

            setLoading(true)

            let audioFileUrl = null
            let audioFileLocalId: string | null = null
            let audioUploadWarning = ''

            // Save local audio always; upload to Cloudinary immediately when online.
            if (formData.audioFile) {
                const localAudio = await saveAudioBlobLocally(formData.audioFile, formData.audioFile.name)
                audioFileLocalId = localAudio.audioId
                audioFileUrl = localAudio.offlineAudioRef

                try {
                    if (isBrowserOnline()) {
                        audioFileUrl = await uploadAudioBlobToCloudinary(formData.audioFile, formData.audioFile.name)
                        await markLocalAudioUploaded(localAudio.audioId, audioFileUrl)
                    } else {
                        audioUploadWarning = 'Note: Offline mode detected. Audio saved locally and will upload to Cloudinary when internet returns.'
                    }
                } catch (uploadErr) {
                    const uploadMessage = uploadErr instanceof Error ? uploadErr.message : 'Unknown upload error'
                    audioUploadWarning = `Note: Cloud upload failed (${uploadMessage}). Audio is saved locally and will retry on sync.`
                }
            }

            // Prepare data
            const query_type_map: { [key: string]: string | null } = {
                investor: 'investment',
                entrepreneur: 'wealth',
                consultant: 'tax',
                student: 'financial_planning',
                other: null,
            }

            const leadData = {
                event_id: selectedEventId,
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                company: formData.company.trim() || null,
                remark: formData.remark.trim() || null,
                entry_type: 'staff',
                capture_mode: 'stall_staff',
                stage: 'met',
                priority: parsedPriority,
                staff_id: user?.id || null,
                stall_number: formData.stallNumber.trim() || null,
                query_type: query_type_map[formData.clientRole] || null,
                audio_file_url: audioFileUrl,
                audio_file_local_id: audioFileLocalId,
                audio_file_text: formData.audioFileText.trim() || null,
                ai_summary: null,
                is_duplicate: false,
                duplicate_of: null,
                designation: formData.clientRole === 'other' ? formData.clientRole : formData.clientRole,
            }

            const saveResult = await createLeadWithOfflineSync(leadData)

            let successMessage = saveResult.synced
                ? '✓ Lead saved and synced successfully! Returning to home...'
                : '⚠ Lead saved locally. Not synced with global DB yet; it will auto-sync when internet returns.'
            if (audioUploadWarning) {
                successMessage += ` ${audioUploadWarning}`
            }
            setSuccess(successMessage)

            // Reset form
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                remark: '',
                audioFile: null,
                audioFileText: '',
                imageFiles: [],
                ocrText: '',
                extractionMethod: 'none',
                importance: '5',
                clientRole: 'other',
                stallNumber: '',
            })

            if (selectedEventId) {
                await fetchLeadsForEvent()
            }

            // Redirect after 2 seconds
            setTimeout(() => {
                setSuccess('');
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
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Staff Lead Entry</h1>
                        <p className="text-lg text-gray-600">
                            Welcome, <span className="font-semibold text-blue-600">{user?.email}</span>! Record lead information with extended details.
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            Fields marked with <span className="text-red-600">*</span> are required.
                        </p>
                        <div className="mt-3">
                            <SyncStatusIndicator />
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Required Fields Section */}
                            <div className="border-b-2 border-gray-100 pb-6">
                                <h2 className="text-lg font-semibold text-red-600 mb-4">Required Information</h2>

                                <div className="mb-4">
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
                                <div className="mb-4">
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
                                        placeholder="Enter lead's full name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                    />
                                </div>

                                {/* Email Field */}
                                <div className="mb-4">
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
                                        placeholder="lead@example.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                    />
                                </div>

                                {/* Phone Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center">
                                            <Phone size={18} className="mr-2 text-blue-600" />
                                            Phone Number <span className="text-red-600">*</span>
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
                                </div>
                            </div>

                            {/* Optional Fields Section */}
                            <div className="border-b-2 border-gray-100 pb-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

                                {/* Company Field */}
                                <div className="mb-4">
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
                                        placeholder="Company name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                    />
                                </div>

                                {/* Stall Number Field */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Stall Number <span className="text-gray-400 text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="stallNumber"
                                        value={formData.stallNumber}
                                        onChange={handleChange}
                                        placeholder="e.g., A-01, B-05"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                    />
                                </div>

                                {/* Client Role */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Lead Category <span className="text-gray-400 text-xs">(Optional)</span>
                                    </label>
                                    <select
                                        name="clientRole"
                                        value={formData.clientRole}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                    >
                                        {CLIENT_ROLES.map((role) => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Importance/Priority */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center">
                                            <Star size={18} className="mr-2 text-yellow-500" />
                                            Lead Priority <span className="text-gray-400 text-xs">(1=Low, 10=High)</span>
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        name="importance"
                                        value={formData.importance}
                                        onChange={handleChange}
                                        min="1"
                                        max="10"
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>Low Priority (1)</span>
                                        <span className="font-semibold text-lg text-blue-600">{formData.importance}</span>
                                        <span>High Priority (10)</span>
                                    </div>
                                </div>

                                {/* Remarks Field */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center">
                                            <FileText size={18} className="mr-2 text-gray-400" />
                                            Remarks <span className="text-gray-400 text-xs">(Optional)</span>
                                        </span>
                                    </label>
                                    <textarea
                                        name="remark"
                                        value={formData.remark}
                                        onChange={handleChange}
                                        placeholder="Any notes or observations about this lead..."
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                                    />
                                </div>

                                {/* Audio File Upload */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center">
                                            <Volume2 size={18} className="mr-2 text-gray-400" />
                                            Audio Note <span className="text-gray-400 text-xs">(Optional)</span>
                                        </span>
                                    </label>
                                    
                                    {/* File Upload Area */}
                                    <div className="mb-4">
                                        <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition bg-gray-50">
                                            <div className="text-center">
                                                {formData.audioFile ? (
                                                    <div className="space-y-2">
                                                        <Volume2 size={32} className="mx-auto text-green-600" />
                                                        <p className="text-sm font-semibold text-green-700">File Selected:</p>
                                                        <p className="text-sm text-gray-700 wrap-break-word max-w-xs">
                                                            {formData.audioFile.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            ({(formData.audioFile.size / 1024 / 1024).toFixed(2)} MB)
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <Volume2 size={32} className="mx-auto text-gray-400" />
                                                        <p className="text-sm font-semibold text-gray-700">Click to upload or drag and drop</p>
                                                        <p className="text-xs text-gray-500">MP3, MP4, WAV, M4A, FLAC, WebM or other audio/video formats</p>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="audio/*,video/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {/* Generate Text Button */}
                                    {formData.audioFile && (
                                        <div className="space-y-2 mb-4">
                                            <button
                                                type="button"
                                                onClick={handleGenerateText}
                                                disabled={transcribing}
                                                className="w-full bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                                            >
                                                {transcribing ? (
                                                    <>
                                                        <Loader className="animate-spin" size={18} />
                                                        <span>Transcribing Media...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap size={18} />
                                                        <span>Generate Text from Media</span>
                                                    </>
                                                )}
                                            </button>
                                            {transcribing && (
                                                <p className="text-xs text-gray-500 text-center">This may take a few moments...</p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setFormData((prev) => ({ ...prev, audioFile: null, audioFileText: '' }))}
                                                disabled={transcribing}
                                                className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg border border-gray-300 hover:border-gray-400 transition disabled:opacity-50"
                                            >
                                                Change File
                                            </button>
                                        </div>
                                    )}

                                    {/* Display Transcribed Text */}
                                    {formData.audioFileText && (
                                        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-blue-900 flex items-center">
                                                    <CheckCircle size={16} className="mr-2 text-green-600" />
                                                    Transcription Complete
                                                </p>
                                            </div>
                                            <div className="bg-white p-4 rounded border border-blue-100 max-h-48 overflow-y-auto">
                                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {formData.audioFileText}
                                                </p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(formData.audioFileText)
                                                        alert('Text copied to clipboard!')
                                                    }}
                                                    className="flex-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 py-2 px-3 rounded font-medium transition"
                                                >
                                                    📋 Copy Text
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, audioFileText: '' }))}
                                                    className="flex-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 py-2 px-3 rounded font-medium transition"
                                                >
                                                    ✕ Clear Text
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Image/Business Card OCR Upload */}
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center">
                                            <ImageIcon size={18} className="mr-2 text-gray-400" />
                                            Scan Image (Business Card/Invoice) <span className="text-gray-400 text-xs">(Optional)</span>
                                        </span>
                                    </label>
                                    
                                    {/* Image Upload Area */}
                                    <div className="mb-4">
                                        <div className="mb-3">
                                            <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-600 hover:bg-green-50 transition bg-gray-50">
                                                <div className="text-center">
                                                    <div className="space-y-2">
                                                        <ImageIcon size={32} className="mx-auto text-gray-400" />
                                                        <p className="text-sm font-semibold text-gray-700">Click to upload or drag and drop</p>
                                                        <p className="text-xs text-gray-500">JPG, PNG, WEBP (max 2 images, 10MB each)</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleImageFileChange}
                                                    disabled={formData.imageFiles.length >= 2}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>

                                        {/* Image Previews */}
                                        {formData.imageFiles.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                {formData.imageFiles.map((file, index) => (
                                                    <div key={index} className="relative border-2 border-green-300 rounded-lg p-3 bg-green-50">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-semibold text-green-700">{index === 0 ? 'Front' : 'Back'}</p>
                                                                <p className="text-sm text-gray-700 wrap-break-word truncate">
                                                                    {file.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveImage(index)}
                                                                disabled={ocrProcessing}
                                                                className="ml-2 p-1 hover:bg-red-200 rounded-full transition disabled:opacity-50"
                                                            >
                                                                <span className="text-red-600 font-bold">×</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Process OCR Button */}
                                    {formData.imageFiles.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            <button
                                                type="button"
                                                onClick={handleProcessOCR}
                                                disabled={ocrProcessing}
                                                className="w-full bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                                            >
                                                {ocrProcessing ? (
                                                    <>
                                                        <Loader className="animate-spin" size={18} />
                                                        <span>Processing {formData.imageFiles.length} Image{formData.imageFiles.length > 1 ? 's' : ''}...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap size={18} />
                                                        <span>Extract Text from {formData.imageFiles.length} Image{formData.imageFiles.length > 1 ? 's' : ''} (OCR)</span>
                                                    </>
                                                )}
                                            </button>
                                            {ocrProcessing && (
                                                <p className="text-xs text-gray-500 text-center">Processing {formData.imageFiles.length} image{formData.imageFiles.length > 1 ? 's' : ''} - this may take a few moments...</p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setFormData((prev) => ({ ...prev, imageFiles: [], ocrText: '' }))}
                                                disabled={ocrProcessing}
                                                className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg border border-gray-300 hover:border-gray-400 transition disabled:opacity-50"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}

                                    {/* Display OCR Text */}
                                    {formData.ocrText && (
                                        <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-green-900 flex items-center">
                                                    <CheckCircle size={16} className="mr-2 text-green-600" />
                                                    OCR Extraction Complete
                                                </p>
                                            </div>
                                            <div className="bg-white p-4 rounded border border-green-100 max-h-48 overflow-y-auto">
                                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {formData.ocrText}
                                                </p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(formData.ocrText)
                                                        alert('Text copied to clipboard!')
                                                    }}
                                                    className="flex-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-100 py-2 px-3 rounded font-medium transition"
                                                >
                                                    📋 Copy Text
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, ocrText: '' }))}
                                                    className="flex-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-100 py-2 px-3 rounded font-medium transition"
                                                >
                                                    ✕ Clear Text
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Staff Info Box */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">
                                    <strong>Staff Entry Mode:</strong> Your entry is recorded as <strong>Staff/Admin</strong> and will be attributed to <strong>{user?.email}</strong>.
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
                                className="w-full bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-8"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Submit Lead Entry</span>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">View Leads by Event</h2>
                        <p className="text-sm text-gray-600 mb-4">Select an event, then fetch leads for that specific event.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Event</label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => {
                                        setSelectedEventId(e.target.value)
                                        setLeadsError('')
                                        setEventLeads([])
                                    }}
                                    disabled={eventsLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition disabled:bg-gray-100"
                                >
                                    <option value="">
                                        {eventsLoading ? 'Loading events...' : 'Choose an event'}
                                    </option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.event_code} - {event.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={fetchLeadsForEvent}
                                disabled={leadsLoading || eventsLoading || !selectedEventId}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {leadsLoading ? 'Fetching...' : 'Fetch Leads'}
                            </button>
                        </div>

                        {leadsError && (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                {leadsError}
                            </div>
                        )}

                        {!leadsLoading && selectedEventId && eventLeads.length === 0 && !leadsError && (
                            <div className="text-sm text-gray-600">No leads found for this event.</div>
                        )}

                        {eventLeads.length > 0 && (
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead Category</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Remarks</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Audio</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Audio Text</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entry Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Capture Mode</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stall</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sync</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {eventLeads.map((lead, index) => (
                                            <tr
                                                key={getLeadRowKey(lead, index)}
                                                className={
                                                    lead.sync_status === 'pending'
                                                        ? 'bg-amber-50'
                                                        : lead.sync_status === 'error'
                                                            ? 'bg-red-50'
                                                            : ''
                                                }
                                            >
                                                <td className="px-4 py-3 text-sm text-gray-900">{lead.name || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.email || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.phone || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.company || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.query_type ? lead.query_type.replaceAll('_', ' ') : '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700 max-w-xs whitespace-pre-wrap">{lead.remark || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700 min-w-52">
                                                    {audioPlaybackUrls[getLeadRowKey(lead, index)] ? (
                                                        <audio controls preload="metadata" className="w-full max-w-52">
                                                            <source src={audioPlaybackUrls[getLeadRowKey(lead, index)]} />
                                                            Your browser does not support audio playback.
                                                        </audio>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 max-w-xs whitespace-pre-wrap">{lead.audio_file_text || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.entry_type || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.capture_mode || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.stall_number || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.stage || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.priority ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {lead.created_at ? new Date(lead.created_at).toLocaleString() : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {lead.sync_status === 'pending' ? (
                                                        <span className="text-amber-700 font-medium">Not Synced</span>
                                                    ) : lead.sync_status === 'error' ? (
                                                        <span className="text-red-700 font-medium">Sync Error</span>
                                                    ) : (
                                                        <span className="text-green-700 font-medium">Synced</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Help Section */}
                    <div className="mt-8 bg-gray-50 rounded-xl p-6 text-center">
                        <p className="text-gray-600">
                            Need assistance? Contact your admin at <span className="font-semibold">admin@xspark.com</span>
                        </p>
                    </div>
                </div>
            </div>
        </ProtectedLayout>
    )
}
