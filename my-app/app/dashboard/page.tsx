"use client"

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { saveRequestOffline } from '@/lib/offline-sync'
import { supabase } from '@/lib/supabase'
import { uploadAudioBlobToCloudinary } from '@/lib/audio-storage'
import { saveAudioBlobLocally } from '@/lib/audio-storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle, MapPin, Mic, Square } from 'lucide-react'

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
  
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('users2')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!error && data?.role) {
        setRole(data.role as 'citizen' | 'gov_employee')
      }

      setProfileLoading(false)
    }

    loadProfile()
  }, [user, router])

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude)
          setLongitude(pos.coords.longitude)
          setMessage({ text: 'Location updated!', type: 'success' })
        },
        (err) => {
          setMessage({ text: 'Failed to get location. Please enable location services.', type: 'error' })
        }
      )
    } else {
      setMessage({ text: 'Geolocation is not supported by your browser', type: 'error' })
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

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          setAudioBlob(blob)
          stream.getTracks().forEach((track) => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
        setAudioBlob(null)
      } catch (err) {
        console.error('Error starting recording:', err)
        setMessage({ text: 'Could not access microphone', type: 'error' })
      }
    }
  }

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    
    if (!preset || !cloudName) {
      throw new Error('Cloudinary config missing')
    }
    
    formData.append('upload_preset', preset)
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    })
    
    if (!res.ok) throw new Error('Cloudinary image upload failed')
    const data = await res.json()
    return data.secure_url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (role !== 'citizen') {
      setMessage({ text: 'Only citizens can submit requests.', type: 'error' })
      return
    }

    if (!topic || latitude === null || longitude === null) {
      setMessage({ text: 'Topic and Location are required', type: 'error' })
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

    try {
      let imageUrl = null
      let audioUrl = null

      if (isOnline) {
        if (imageFile) {
           imageUrl = await uploadImageToCloudinary(imageFile)
        }
        if (audioBlob) {
           audioUrl = await uploadAudioBlobToCloudinary(audioBlob, 'auth-req-audio.webm')
        }
      } else {
        // Offline: we store image as base64 preview, and we can't upload audio easily without keeping local blobs.
        // The instructions say "can upload image(using cloudinary and if internet is present)", implying it's skipped or delayed if offline.
        // We will store the base64 as image_url for now so it syncs up later since it's just a string field.
        if (imagePreview) imageUrl = imagePreview
        if (audioBlob) {
          const { offlineAudioRef } = await saveAudioBlobLocally(audioBlob, 'auth-req-audio.webm')
          audioUrl = offlineAudioRef
        }
      }

      await saveRequestOffline({
        topic,
        departments,
        urgency,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        latitude,
        longitude,
        image_url: imageUrl,
        audio_url: audioUrl,
      })

      setMessage({ text: 'Request submitted successfully!', type: 'success' })
      setTopic('')
      setDepartments([])
      setTimeLimit('')
      setImageFile(null)
      setImagePreview(null)
      setAudioBlob(null)
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to submit request', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  if (profileLoading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl py-8">
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Loading profile...</CardContent>
        </Card>
      </div>
    )
  }

  if (role !== 'citizen') {
    return (
      <div className="container mx-auto p-4 max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Request Access Restricted</CardTitle>
            <CardDescription>Only citizen accounts can submit requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Request</CardTitle>
          <CardDescription>Report an issue or submit a request directly to the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Topic */}
            <div className="space-y-2">
              <Label>Topic</Label>
              <Textarea 
                placeholder="Describe your request..." 
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            {/* Departments */}
            <div className="space-y-2">
              <Label>Departments</Label>
              <select
                multiple
                value={departments}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value as 'hospital' | 'fire' | 'police' | 'municipal corporation')
                  setDepartments(selected)
                }}
                className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="hospital">Hospital</option>
                <option value="fire">Fire</option>
                <option value="police">Police</option>
                <option value="municipal corporation">Municipal Corporation</option>
              </select>
              <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple departments.</p>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label>Urgency</Label>
              <div className="flex gap-4">
                {['moderate', 'urgent', 'emergency'].map(u => (
                  <label key={u} className="flex items-center space-x-2 border p-2 rounded cursor-pointer hover:bg-gray-50 flex-1 justify-center">
                    <input 
                      type="radio" 
                      name="urgency" 
                      value={u} 
                      checked={urgency === u} 
                      onChange={() => setUrgency(u as any)}
                      className="sr-only peer"
                    />
                    <span className="peer-checked:font-bold peer-checked:text-blue-600 capitalize">
                      {u}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            {(urgency === 'urgent' || urgency === 'emergency') && (
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <div className="text-sm text-gray-500 mb-2">If this request is not synced within this timeframe, it will be discarded automatically.</div>
                <Input 
                  type="number" 
                  min="1"
                  placeholder="e.g. 15"
                  value={timeLimit}
                  onChange={e => setTimeLimit(e.target.value)}
                />
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              {latitude && longitude ? (
                 <div className="text-sm text-green-600 flex items-center gap-2">
                   <CheckCircle size={16} /> Location securely captured
                 </div>
              ) : (
                <Button type="button" variant="outline" onClick={getLocation} className="w-full flex gap-2">
                  <MapPin size={16}/> Get Current Location
                </Button>
              )}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Attach Image (Optional)</Label>
              <Input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded shadow mt-2" />
              )}
              {!isOnline && <p className="text-xs text-yellow-600">You are offline. Image will be uploaded when online.</p>}
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <Label>Record Audio (Optional)</Label>
              <div className="flex gap-2 items-center">
                <Button 
                  type="button" 
                  variant={isRecording ? 'destructive' : 'secondary'} 
                  onClick={toggleRecording}
                >
                  {isRecording ? <><Square className="w-4 h-4 mr-2" /> Stop</> : <><Mic className="w-4 h-4 mr-2" /> Record</>}
                </Button>
                {audioBlob && <span className="text-sm text-green-600 flex items-center gap-2"><CheckCircle size={16}/> Recorded successfully</span>}
              </div>
            </div>

            {message.text && (
              <div className={`p-3 rounded flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle size={16}/>}
                <span>{message.text}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}