"use client"

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { saveRequestOffline } from '@/lib/offline-sync'
import { supabase } from '@/lib/supabase'
import { uploadAudioBlobToCloudinary } from '@/lib/audio-storage'
import { saveAudioBlobLocally } from '@/lib/audio-storage'
import { SubmissionRequest, FinalResponse, VerificationResult, PrioritizationOutput } from '@/lib/report-types'
import ProtectedLayout from '@/app/components/ProtectedLayout'
import SyncStatusIndicator from '@/app/components/SyncStatusIndicator'
import GovEmployeeDashboard from '@/components/GovEmployeeDashboard'
import {
  AlertCircle,
  CheckCircle,
  MapPin,
  Mic,
  Square,
  ImagePlus,
  Send,
  Loader,
  FileText,
  Building2,
  AlertTriangle,
  Clock,
  X,
  Sparkles,
} from 'lucide-react'

const DEPARTMENT_OPTIONS = [
  { value: 'hospital', label: 'Hospital', icon: '🏥', color: 'from-red-500 to-rose-600' },
  { value: 'fire', label: 'Fire', icon: '🔥', color: 'from-orange-500 to-amber-600' },
  { value: 'police', label: 'Police', icon: '🚔', color: 'from-blue-500 to-indigo-600' },
  { value: 'municipal corporation', label: 'Municipal Corp', icon: '🏛️', color: 'from-emerald-500 to-teal-600' },
] as const

const URGENCY_OPTIONS = [
  { value: 'moderate', label: 'Moderate', icon: '🟢', bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' },
  { value: 'urgent', label: 'Urgent', icon: '🟡', bgClass: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100', activeClass: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200' },
  { value: 'emergency', label: 'Emergency', icon: '🔴', bgClass: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100', activeClass: 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-200' },
] as const

export default function CitizenDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [role, setRole] = useState<'citizen' | 'gov_employee' | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [topic, setTopic] = useState('')
  const [departments, setDepartments] = useState<Array<'hospital' | 'fire' | 'police' | 'municipal corporation'>>([])
  const [urgency, setUrgency] = useState<'moderate' | 'urgent' | 'emergency'>('moderate')
  const [timeLimit, setTimeLimit] = useState<string>('')

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioTranscription, setAudioTranscription] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [submissionResult, setSubmissionResult] = useState<FinalResponse | null>(null)

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        console.log('[Dashboard] 🔍 Loading user profile...')
        console.log('[Dashboard] Online status:', navigator.onLine)
        
        const { data, error } = await supabase
          .from('users2')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!error && data?.role) {
          console.log('[Dashboard] ✅ Role fetched from Supabase:', data.role)
          setRole(data.role as 'citizen' | 'gov_employee')
          // Cache role for offline use
          if (typeof window !== 'undefined') {
            localStorage.setItem(`user-role-${user.id}`, data.role)
          }
        } else {
          throw new Error(error?.message || 'Failed to fetch role')
        }
      } catch (err) {
        console.log('[Dashboard] ⚠️ Failed to fetch role from Supabase, using cached/default:', err)
        
        // Try to get cached role
        let cachedRole = null
        if (typeof window !== 'undefined') {
          cachedRole = localStorage.getItem(`user-role-${user.id}`)
        }
        
        if (cachedRole) {
          console.log('[Dashboard] 📦 Using cached role:', cachedRole)
          setRole(cachedRole as 'citizen' | 'gov_employee')
        } else {
          // Default to citizen (always show citizen form for offline)
          console.log('[Dashboard] 📝 Defaulting to citizen role (offline)')
          setRole('citizen')
        }
      }

      setProfileLoading(false)
    }

    loadProfile()
  }, [user, router])

  // Fetch and log user's recent requests
  useEffect(() => {
    const fetchUserRequests = async () => {
      if (!user) return;
      
      try {
        console.log(`\n📋 [Dashboard] Fetching requests for user: ${user.id}`);
        
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('user_id', user.id)
          .order('client_created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error(`❌ [Dashboard] Error fetching requests:`, error);
          return;
        }

        console.log(`✅ [Dashboard] Fetched ${data?.length || 0} requests:`);
        if (data && data.length > 0) {
          data.forEach((req: any, idx: number) => {
            console.log(`\n   Request ${idx + 1}:`);
            console.log(`     - ID: ${req.id}`);
            console.log(`     - Priority Number: ${req.priority_number}`);
            console.log(`     - Status: ${req.status}`);
            console.log(`     - Urgency: ${req.urgency}`);
            console.log(`     - Time Limit: ${req.time_limit_minutes}m`);
            console.log(`     - Departments: [${req.departments?.join(", ")}]`);
            console.log(`     - Topic: "${req.topic.substring(0, 50)}..."`);
            console.log(`     - Created: ${new Date(req.client_created_at).toLocaleString()}`);
          });
        } else {
          console.log(`   No requests found`);
        }
        console.log(``);
      } catch (err) {
        console.error(`❌ [Dashboard] Exception while fetching requests:`, err);
      }
    };

    fetchUserRequests();
    
    // Re-fetch every 10 seconds
    const interval = setInterval(fetchUserRequests, 10000);
    return () => clearInterval(interval);
  }, [user])

  // Listen for offline sync completion to show real priority
  useEffect(() => {
    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[Dashboard] 🔔 Sync completed! Showing real priority:', customEvent.detail.data?.priority);
      
      // Update the submission result with real data from sync
      if (customEvent.detail.data) {
        setSubmissionResult(customEvent.detail.data as FinalResponse);
        setMessage({
          text: '✅ Request verified and routed to authorities after coming online!',
          type: 'success'
        });
      }
    };

    window.addEventListener('offline-sync-complete', handleSyncComplete);
    return () => window.removeEventListener('offline-sync-complete', handleSyncComplete);
  }, [])

  const getLocation = () => {
    // Hardcoded Surat coordinates for offline mode
    const SURAT_LATITUDE = 21.1794
    const SURAT_LONGITUDE = 72.8311

    if (!isOnline) {
      // Offline mode: use hardcoded Surat coordinates
      console.log('[Dashboard] 📍 Offline mode detected - using hardcoded Surat coordinates')
      setLatitude(SURAT_LATITUDE)
      setLongitude(SURAT_LONGITUDE)
      setMessage({ text: '📍 Location set to Surat, Gujarat (Offline Mode)', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 2000)
      return
    }

    if (navigator.geolocation) {
      setLocationLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude)
          setLongitude(pos.coords.longitude)
          setMessage({ text: 'Location captured successfully!', type: 'success' })
          setLocationLoading(false)
          setTimeout(() => setMessage({ text: '', type: '' }), 2000)
        },
        () => {
          // Fallback to Surat if geolocation fails
          console.log('[Dashboard] 📍 Geolocation failed - using fallback Surat coordinates')
          setLatitude(SURAT_LATITUDE)
          setLongitude(SURAT_LONGITUDE)
          setMessage({ text: 'Could not get precise location - using Surat, Gujarat as default', type: 'warning' })
          setLocationLoading(false)
          setTimeout(() => setMessage({ text: '', type: '' }), 3000)
        }
      )
    } else {
      // Fallback to Surat if geolocation not supported
      console.log('[Dashboard] 📍 Geolocation not supported - using fallback Surat coordinates')
      setLatitude(SURAT_LATITUDE)
      setLongitude(SURAT_LONGITUDE)
      setMessage({ text: 'Geolocation not supported - using Surat, Gujarat as default', type: 'warning' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const toggleDepartment = (dept: 'hospital' | 'fire' | 'police' | 'municipal corporation') => {
    setDepartments(prev =>
      prev.includes(dept)
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    )
  }

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []
        setRecordingDuration(0)

        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1)
        }, 1000)

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          setAudioBlob(blob)
          stream.getTracks().forEach((track) => track.stop())
          
          // Transcribe audio after recording
          setIsTranscribing(true)
          try {
            const formData = new FormData()
            formData.append('audio', blob, 'audio.webm')
            
            const response = await fetch('/api/transcribe-audio', {
              method: 'POST',
              body: formData
            })
            
            if (response.ok) {
              const data = await response.json()
              const transcribedText = data.text || data.transcription || ''
              setAudioTranscription(transcribedText)
              console.log('✅ Audio transcribed:', transcribedText)
            } else {
              const errorData = await response.json()
              console.error('❌ Transcription failed:', errorData.error || errorData)
            }
            setIsTranscribing(false)
          } catch (error) {
            console.error('Transcription error:', error)
            setIsTranscribing(false)
          }
        }

        mediaRecorder.start()
        setIsRecording(true)
        setAudioBlob(null)
      } catch {
        setMessage({ text: 'Could not access microphone', type: 'error' })
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'xorcists/images')
    formData.append('resource_type', 'image')

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Image upload failed' }))
      throw new Error(errorData.error || 'Image upload failed')
    }
    const data = await res.json()
    return data.secure_url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (role !== 'citizen') {
      setMessage({ text: 'Only citizens can submit requests.', type: 'error' })
      return
    }

    if (!topic.trim() && !imageFile && !audioBlob) {
      setMessage({ text: 'Please provide at least one: a description, photo, or voice note', type: 'error' })
      return
    }

    if (latitude === null || longitude === null) {
      setMessage({ text: 'Please capture your location first', type: 'error' })
      return
    }

    if (departments.length === 0) {
      setMessage({ text: 'Select at least one department', type: 'error' })
      return
    }

    if ((urgency === 'urgent' || urgency === 'emergency') && !timeLimit) {
      setMessage({ text: 'Time Limit is required for urgent/emergency requests', type: 'error' })
      return
    }

    if ((urgency === 'urgent' || urgency === 'emergency') && Number(timeLimit) <= 0) {
      setMessage({ text: 'Time Limit must be greater than 0', type: 'error' })
      return
    }

    setLoading(true)
    setMessage({ text: '', type: '' })

    // ✅ OFFLINE MODE - Save locally immediately
    if (!isOnline) {
      console.log('[submit] 📡 OFFLINE MODE - Saving request locally...')
      try {
        // Save audio locally if present
        let audioUrl: string | null = null
        if (audioBlob) {
          const { offlineAudioRef } = await saveAudioBlobLocally(audioBlob, 'auth-req-audio.webm')
          audioUrl = offlineAudioRef
        }

        // Save to IndexedDB
        const saveResult = await saveRequestOffline({
          topic: topic || '',
          departments,
          urgency,
          time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
          latitude,
          longitude,
          image_url: imagePreview, // Use base64 preview for offline
          audio_url: audioUrl,
          status: 'pending',
        })

        console.log('[submit] ✅ Offline save result:', saveResult)

        // Show success message
        setMessage({
          text: '✅ Request saved offline! Will verify and route to authorities when you\'re back online.',
          type: 'success'
        })

        // Show pending results
        setSubmissionResult({
          approved: true,
          is_fake: false,
          reasoning: 'Saved offline - will verify when synced',
          image_fake_score: 0,
          text_spam_score: 0,
          clip_similarity: 0,
          confidence: 0,
          priority: {
            priority_level: 'PENDING',
            priority_score: 0,
            department: (departments[0] === 'hospital' ? 'Hospital' :
              departments[0] === 'fire' ? 'Fire' :
              departments[0] === 'police' ? 'Police' :
              'Municipal') as any,
            department_priority: 'Syncing...',
            recommendation: 'Your request is saved locally and will be verified and routed to the nearest authorities when you connect to the internet.',
            estimated_urgency_seconds: 0,
            department_confidence: 0,
          },
          severity: 'PENDING',
          detected_objects: [],
        })

        setLoading(false)
        return // Stop here - don't try API call
      } catch (err: any) {
        console.error('[submit] ❌ Offline save failed:', err)
        setMessage({
          text: `Failed to save offline: ${err.message || 'Unknown error'}`,
          type: 'error'
        })
        setLoading(false)
        return
      }
    }

    // 🌐 ONLINE MODE - Upload to cloud, verify, and route
    console.log('[submit] 🌐 ONLINE MODE - Processing request...')
    try {
      let imageUrl = null
      let audioUrl = null

      if (isOnline) {
        if (imageFile) {
          try {
            console.log('[submit] Uploading image...')
            imageUrl = await uploadImageToCloudinary(imageFile)
            console.log('[submit] Image uploaded:', imageUrl)
          } catch (uploadErr) {
            console.warn('[submit] Image upload failed, saving base64 instead:', uploadErr)
            imageUrl = imagePreview // fallback to base64
          }
        }
        if (audioBlob) {
          try {
            console.log('[submit] Uploading audio...')
            audioUrl = await uploadAudioBlobToCloudinary(audioBlob, 'auth-req-audio.webm')
            console.log('[submit] Audio uploaded:', audioUrl)
          } catch (uploadErr) {
            console.warn('[submit] Audio upload failed, saving locally:', uploadErr)
            const { offlineAudioRef } = await saveAudioBlobLocally(audioBlob, 'auth-req-audio.webm')
            audioUrl = offlineAudioRef
          }
        }
      } else {
        if (imagePreview) imageUrl = imagePreview
        if (audioBlob) {
          const { offlineAudioRef } = await saveAudioBlobLocally(audioBlob, 'auth-req-audio.webm')
          audioUrl = offlineAudioRef
        }
      }

      console.log('[submit] 💾 Saving request offline...')
      await saveRequestOffline({
        topic: topic || '',
        departments,
        urgency,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        latitude,
        longitude,
        image_url: imageUrl,
        audio_url: audioUrl,
        status: 'pending',
      })
      console.log('[submit] ✅ Request saved to local storage')

      // Call real verification API (online mode)
      console.log('[submit] 🔐 Online - calling verification API...')
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token

      if (!authToken) {
        throw new Error('Authentication failed. Please log in again.')
      }

      const apiResponse = await fetch('/api/submit-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          image: imageUrl || imagePreview || '',
          text_description: topic,
          audio: audioUrl || null,
          location: `${latitude}, ${longitude}`,
          departments,
          coordinates: { lat: latitude, lng: longitude },
          report_count: 1,
        }),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ error: 'API request failed' }))
        throw new Error(errorData.error || errorData.message || 'Verification failed')
      }

      const apiData = await apiResponse.json()
      const results = apiData.data as FinalResponse

      console.log('[submit] Verification results:', results)
      setSubmissionResult(results)

      if (results.approved) {
        setMessage({ text: '✅ Request verified and routed to authorities!', type: 'success' })
      } else if (results.is_fake) {
        setMessage({ text: '⚠️ Request flagged: ' + results.reasoning, type: 'error' })
      } else {
        setMessage({ text: '📊 Request processed and saved for review', type: 'success' })
      }
    } catch (err: any) {
      console.error('[submit] Error:', err)
      setMessage({ text: err.message || 'Failed to submit request', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Reset form and results
  const handleResetForm = () => {
    setTopic('')
    setDepartments([])
    setTimeLimit('')
    setLatitude(null)
    setLongitude(null)
    setImageFile(null)
    setImagePreview(null)
    setAudioBlob(null)
    setSubmissionResult(null)
    setMessage({ text: '', type: '' })
  }

  if (!user) return null

  if (profileLoading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading your profile...</p>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  if (role !== 'citizen') {
    console.log(`[Dashboard] 🔐 Rendering Gov Dashboard (role: ${role})`)
    return <GovEmployeeDashboard />
  }
  
  console.log(`[Dashboard] 📝 Rendering Citizen Form (role: ${role})`)

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          {/* Display form only if no results yet */}
          {!submissionResult ? (
            <>
              {/* Header */}
              <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Submit Request</h1>
                <p className="text-slate-500 text-sm">Report an issue to the relevant authorities</p>
              </div>
            </div>
            <SyncStatusIndicator />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic / Description */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 transition-shadow hover:shadow-md">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <FileText size={16} className="text-purple-600" />
                Describe Your Request
                <span className="text-slate-400 text-xs font-normal">(or attach photo/voice note)</span>
              </label>
              <textarea
                placeholder="What issue are you facing? Provide details..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Departments */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 transition-shadow hover:shadow-md">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <Building2 size={16} className="text-purple-600" />
                Select Departments <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-4">Tap to select one or more departments</p>
              <div className="grid grid-cols-2 gap-3">
                {DEPARTMENT_OPTIONS.map(dept => {
                  const isSelected = departments.includes(dept.value)
                  return (
                    <button
                      key={dept.value}
                      type="button"
                      onClick={() => toggleDepartment(dept.value)}
                      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-100'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-2xl">{dept.icon}</span>
                      <span className={`font-medium text-sm ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>
                        {dept.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Urgency */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 transition-shadow hover:shadow-md">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <AlertTriangle size={16} className="text-purple-600" />
                Urgency Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {URGENCY_OPTIONS.map(opt => {
                  const isActive = urgency === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgency(opt.value as any)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all duration-200 ${
                        isActive ? opt.activeClass : opt.bgClass
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="font-semibold text-xs">{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Time Limit (conditional) */}
              {(urgency === 'urgent' || urgency === 'emergency') && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <label className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
                    <Clock size={14} />
                    Time Limit (minutes) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-amber-700 mb-3">
                    If not synced within this time, the request will be discarded.
                  </p>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 15"
                    value={timeLimit}
                    onChange={e => setTimeLimit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 transition-shadow hover:shadow-md">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <MapPin size={16} className="text-purple-600" />
                Location <span className="text-red-500">*</span>
              </label>
              {latitude && longitude ? (
                <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-400 rounded-xl px-4 py-3 shadow-sm shadow-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle size={18} className="text-emerald-600" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm">Location captured ✓</span>
                      {!isOnline && latitude === 21.1794 && longitude === 72.8311 && (
                        <span className="text-xs text-emerald-600 font-medium">📍 Surat, Gujarat</span>
                      )}
                      {isOnline && (latitude !== 21.1794 || longitude !== 72.8311) && (
                        <span className="text-xs text-emerald-600">({latitude?.toFixed(4)}, {longitude?.toFixed(4)})</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLatitude(null); setLongitude(null) }}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline hover:bg-emerald-100 px-2 py-1 rounded"
                  >
                    Recapture
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={locationLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-50"
                >
                  {locationLoading ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <MapPin size={18} />
                  )}
                  <span className="font-medium text-sm">
                    {locationLoading ? 'Getting location...' : 'Tap to Capture Location'}
                  </span>
                </button>
              )}
            </div>

            {/* Attachments Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image Upload */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 transition-shadow hover:shadow-md">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <ImagePlus size={16} className="text-purple-600" />
                  Photo
                  <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-36 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <ImagePlus size={24} className="text-slate-400 mb-1" />
                    <span className="text-xs text-slate-500 font-medium">Tap to add photo</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
                {!isOnline && imageFile && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Will upload when online
                  </p>
                )}
              </div>

              {/* Audio Recording */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 transition-shadow hover:shadow-md">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Mic size={16} className="text-purple-600" />
                  Voice Note
                  <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                </label>
                <div className="flex flex-col items-center justify-center h-28">
                  {audioBlob && !isRecording ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle size={18} />
                        <span className="text-sm font-medium">Audio recorded</span>
                      </div>
                      {isTranscribing ? (
                        <div className="text-xs text-slate-500 italic">Converting speech to text...</div>
                      ) : audioTranscription ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full">
                          <p className="text-xs font-semibold text-slate-600 mb-1">📝 Transcription:</p>
                          <p className="text-sm text-slate-700">{audioTranscription}</p>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setAudioBlob(null)
                          setAudioTranscription('')
                        }}
                        className="text-xs text-slate-500 hover:text-red-600 font-medium underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={toggleRecording}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 animate-pulse'
                            : 'bg-slate-100 hover:bg-purple-100 border-2 border-slate-200 hover:border-purple-400'
                        }`}
                      >
                        {isRecording ? (
                          <Square size={18} className="text-white" />
                        ) : (
                          <Mic size={20} className="text-slate-500" />
                        )}
                      </button>
                      {isRecording && (
                        <span className="text-red-600 text-xs font-mono mt-2 font-semibold">
                          ● REC {formatDuration(recordingDuration)}
                        </span>
                      )}
                      {!isRecording && !audioBlob && (
                        <span className="text-xs text-slate-500 mt-2">Tap to record</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            {message.text && (
              <div
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  message.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                {message.type === 'error' ? (
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </form>

          {/* Help - Only show when no results */}
          {!submissionResult && (
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                Need help? Contact us at <span className="font-semibold text-slate-700">support@xorcists.com</span>
              </p>
            </div>
          )}
            </>
          ) : null}

          {/* Results Display */}
          {submissionResult && (
            <div className="mt-12 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-8">
                {/* Success Header */}
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-200">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    submissionResult.is_fake ? 'bg-red-100' : 'bg-emerald-100'
                  }`}>
                    {submissionResult.is_fake ? (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {submissionResult.is_fake ? '🚨 Verification Alert' : '✅ Report Verified'}
                    </h2>
                    <p className="text-sm text-slate-500">{submissionResult.reasoning}</p>
                  </div>
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Priority */}
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <p className="text-sm text-slate-600 mb-2 font-semibold">PRIORITY LEVEL</p>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-3xl font-bold ${
                        submissionResult.priority.priority_level === 'CRITICAL' ? 'text-red-600' :
                        submissionResult.priority.priority_level === 'HIGH' ? 'text-orange-600' :
                        submissionResult.priority.priority_level === 'MEDIUM' ? 'text-amber-600' :
                        submissionResult.priority.priority_level === 'PENDING' ? 'text-slate-500' :
                        'text-emerald-600'
                      }`}>
                        {submissionResult.priority.priority_level}
                      </span>
                      <span className="text-slate-600 text-sm">Score: {submissionResult.priority.priority_score}/100</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-2">{submissionResult.priority.department_priority}</p>
                  </div>

                  {/* Approval Status */}
                  <div className={`p-6 rounded-xl border-2 ${
                    submissionResult.is_fake
                      ? 'bg-red-50 border-red-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <p className="text-sm text-slate-600 mb-2 font-semibold">STATUS</p>
                    <div className="flex items-center gap-2">
                      {submissionResult.is_fake ? (
                        <>
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                          <div>
                            <p className="font-bold text-red-600">FLAGGED</p>
                            <p className="text-xs text-slate-600 mt-1">Suspicious content detected</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                          <div>
                            <p className="font-bold text-emerald-600">{submissionResult.approved ? 'APPROVED' : 'SAVED'}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {submissionResult.approved ? 'Routed to authorities' : 'Pending review'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Metrics */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Verification Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-slate-600 mb-2">Image Authenticity</p>
                      <p className="text-2xl font-bold text-blue-600">{Math.round((1 - submissionResult.image_fake_score) * 100)}%</p>
                      <p className="text-xs text-slate-500 mt-1">Fake score: {Math.round(submissionResult.image_fake_score * 100)}%</p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-xs text-slate-600 mb-2">Text Credibility</p>
                      <p className="text-2xl font-bold text-indigo-600">{Math.round((1 - submissionResult.text_spam_score) * 100)}%</p>
                      <p className="text-xs text-slate-500 mt-1">Spam score: {Math.round(submissionResult.text_spam_score * 100)}%</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs text-slate-600 mb-2">Image-Text Match</p>
                      <p className="text-2xl font-bold text-purple-600">{Math.round(submissionResult.clip_similarity * 100)}%</p>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                      <p className="text-xs text-slate-600 mb-2">Confidence</p>
                      <p className="text-2xl font-bold text-pink-600">{Math.round(submissionResult.confidence * 100)}%</p>
                    </div>
                  </div>
                </div>

                {/* Severity & Department Routing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Severity */}
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">📍 SEVERITY</h4>
                    <p className={`text-lg font-bold capitalize ${
                      submissionResult.severity === 'CRITICAL' ? 'text-red-600' :
                      submissionResult.severity === 'HIGH' ? 'text-orange-600' :
                      submissionResult.severity === 'MEDIUM' ? 'text-amber-600' :
                      submissionResult.severity === 'PENDING' ? 'text-slate-500' :
                      'text-emerald-600'
                    }`}>
                      {submissionResult.severity}
                    </p>
                  </div>

                  {/* Department Routed */}
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">🏛️ ROUTED TO</h4>
                    <p className="text-lg font-bold text-slate-900 capitalize">{submissionResult.priority.department}</p>
                    <p className="text-xs text-slate-600 mt-2">Priority: {submissionResult.priority.department_priority}</p>
                  </div>

                  {/* Detected Objects */}
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">🔍 DETECTED OBJECTS</h4>
                    <div className="flex flex-wrap gap-2">
                      {submissionResult.detected_objects && submissionResult.detected_objects.length > 0 ? (
                        submissionResult.detected_objects.map((obj, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                            {obj.replace(/_/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No objects detected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                {submissionResult.priority.recommendation && (
                  <div className="mb-8 p-6 bg-amber-50 rounded-xl border border-amber-200">
                    <h4 className="text-sm font-bold text-amber-900 mb-3">📋 RECOMMENDATION</h4>
                    <p className="text-sm text-amber-800">{submissionResult.priority.recommendation}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200">
                  <button
                    onClick={handleResetForm}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300"
                  >
                    📝 Submit Another Request
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all border border-slate-300"
                  >
                    🏠 Go Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}