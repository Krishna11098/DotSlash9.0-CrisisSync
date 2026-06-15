"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import ProtectedLayout from '@/app/components/ProtectedLayout'
import {
  Loader,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Zap,
  Building2,
  AlertTriangle,
  Eye,
  Check,
  X,
} from 'lucide-react'

interface AssignedRequest {
  id: string
  request_id: string
  department: string
  distance_km?: number
  status: string
  assigned_at: string
  request?: {
    id: string
    topic: string
    image_url: string
    audio_url: string | null
    latitude: number
    longitude: number
    urgency: 'moderate' | 'urgent' | 'emergency'
    priority_number: number
    status: string
    flagged_for_review?: boolean
    flagged_reason?: string | null
    verification_result?: {
      is_fake: boolean
      severity: string
      priority_level: string
      image_fake_score: number
      text_spam_score: number
      clip_similarity: number
      detected_objects: string[]
      reasoning: string
    }
  } | null
}

export default function GovEmployeeDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<AssignedRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<AssignedRequest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Fetch assigned requests
  useEffect(() => {
    const fetchAssignedRequests = async () => {
      if (!user) return

      try {
        setLoading(true)
        console.log('📋 Fetching assigned requests for gov employee:', user.id)

        // First try to fetch assignments
        const { data: assignments, error: assignmentError } = await supabase
          .from('request_assignments')
          .select('*')
          .eq('assigned_to_user_id', user.id)
          .order('assigned_at', { ascending: false })

        if (assignmentError) {
          console.error('❌ Error fetching assignments:', assignmentError)
          console.error('Full error details:', JSON.stringify(assignmentError, null, 2))
          setMessage({ text: `Error: ${assignmentError.message || 'Failed to load requests'}`, type: 'error' })
          return
        }

        console.log('✅ Fetched', assignments?.length || 0, 'assigned requests')

        // Now fetch the full request details for each assignment
        if (assignments && assignments.length > 0) {
          const requestIds = assignments.map(a => a.request_id)
          console.log('📋 Fetching details for request IDs:', requestIds)

          const { data: requestDetails, error: requestError } = await supabase
            .from('requests')
            .select('*')
            .in('id', requestIds)

          if (requestError) {
            console.error('❌ Error fetching request details:', requestError)
            // Still show assignments even if we can't get full details
            setRequests(assignments.map(a => ({ ...a, request: null })))
            return
          }

          // Combine assignments with request details
          const combined = assignments.map(assignment => {
            const requestData = requestDetails?.find(r => r.id === assignment.request_id)
            return {
              ...assignment,
              request: requestData || {
                id: assignment.request_id,
                topic: 'Loading...',
                image_url: '',
                audio_url: null,
                latitude: 0,
                longitude: 0,
                urgency: 'moderate',
                priority_number: 0,
                status: 'pending',
                flagged_for_review: false,
                flagged_reason: null,
                verification_result: null,
              },
            }
          })

          console.log('✅ Combined data:', combined)
          setRequests(combined)
        } else {
          setRequests([])
        }
      } catch (err) {
        console.error('❌ Unexpected error:', err)
        setMessage({ text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchAssignedRequests()
  }, [user])

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionLoading(true)
      console.log('✅ Accepting request:', requestId)

      const { error } = await supabase
        .from('request_assignments')
        .update({ status: 'acknowledged' })
        .eq('request_id', requestId)
        .eq('assigned_to_user_id', user?.id)

      if (error) throw error

      // Remove from list after accepting (card disappears from dashboard)
      setRequests(requests.filter(req => req.request_id !== requestId))
      setSelectedRequest(null)

      setMessage({ text: '✅ Request accepted! You can now take action.', type: 'success' })
    } catch (err: any) {
      console.error('Error:', err)
      setMessage({ text: err.message || 'Failed to accept request', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      setActionLoading(true)
      console.log('❌ Rejecting request:', requestId)

      // Delete the assignment instead of updating status (no 'rejected' status exists)
      const { error } = await supabase
        .from('request_assignments')
        .delete()
        .eq('request_id', requestId)
        .eq('assigned_to_user_id', user?.id)

      if (error) throw error

      // Remove from list
      setRequests(requests.filter(req => req.request_id !== requestId))
      setSelectedRequest(null)

      setMessage({ text: '⚠️ Request rejected. Moving to next officer.', type: 'success' })
    } catch (err: any) {
      console.error('Error:', err)
      setMessage({ text: err.message || 'Failed to reject request', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-300'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return '🔴'
      case 'urgent':
        return '🟡'
      default:
        return '🟢'
    }
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading your assignments...</p>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Assignment Board</h1>
                <p className="text-slate-500 text-sm">Incoming citizen requests assigned to you</p>
              </div>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div
              className={`mb-6 flex items-start gap-3 p-4 rounded-xl border ${
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

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Request List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  📋 Assigned Requests ({requests.length})
                </h2>

                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No pending requests right now</p>
                    <p className="text-slate-400 text-xs mt-1">You'll be notified when new requests arrive</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {requests.map(req => (
                      <button
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedRequest?.id === req.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {req.request?.topic?.substring(0, 40) || 'Loading...'}...
                          </span>
                          <span className="text-xs">{req.request?.urgency ? getUrgencyIcon(req.request.urgency) : '🔄'}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(req.request?.verification_result?.priority_level || 'MEDIUM')}`}>
                            {req.request?.priority_number || 0}
                          </div>
                          <span className="text-xs text-slate-500">
                            {req.distance_km?.toFixed(1) || '?'}km away
                          </span>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {req.status?.toUpperCase() || 'UNKNOWN'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Request Details */}
            <div className="lg:col-span-2">
              {selectedRequest && selectedRequest.request ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-200">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Details</h2>
                      <p className="text-sm text-slate-500">ID: {selectedRequest.request?.id || 'Loading...'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedRequest.request?.verification_result?.is_fake
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedRequest.request?.verification_result?.is_fake ? '⚠️ FLAGGED' : '✅ VERIFIED'}
                    </span>
                  </div>

                  {/* Warning banner for manual review flag */}
                  {selectedRequest.request?.flagged_for_review && (
                    <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-900 mb-1">⚠️ FLAGGED FOR MANUAL REVIEW</h4>
                        <p className="text-xs text-red-800 leading-relaxed">
                          {selectedRequest.request?.flagged_reason || 'Inconsistent client-side timestamp / clock drift detected.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Topic & Description */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">📝 Description</h3>
                    <p className="text-slate-700">{selectedRequest.request?.topic || 'Loading description...'}</p>
                  </div>

                  {/* Priority & Severity */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Priority Score</p>
                      <p className={`text-2xl font-bold ${
                        (selectedRequest.request?.priority_number || 0) >= 80 ? 'text-red-600' :
                        (selectedRequest.request?.priority_number || 0) >= 60 ? 'text-orange-600' :
                        (selectedRequest.request?.priority_number || 0) >= 40 ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {selectedRequest.request?.priority_number || 0}/100
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Severity</p>
                      <p className={`text-lg font-bold ${
                        selectedRequest.request?.verification_result?.severity === 'CRITICAL' ? 'text-red-600' :
                        selectedRequest.request?.verification_result?.severity === 'HIGH' ? 'text-orange-600' :
                        selectedRequest.request?.verification_result?.severity === 'MEDIUM' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {selectedRequest.request?.verification_result?.severity || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Verification Metrics */}
                  {selectedRequest.request?.verification_result && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-700 mb-3">🔍 Verification Metrics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-slate-600 mb-1">Image</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Math.round((1 - (selectedRequest.request.verification_result.image_fake_score || 0)) * 100)}%
                          </p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <p className="text-xs text-slate-600 mb-1">Text</p>
                          <p className="text-lg font-bold text-indigo-600">
                            {Math.round((1 - (selectedRequest.request.verification_result.text_spam_score || 0)) * 100)}%
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xs text-slate-600 mb-1">Match</p>
                          <p className="text-lg font-bold text-purple-600">
                            {Math.round((selectedRequest.request.verification_result.clip_similarity || 0) * 100)}%
                          </p>
                        </div>
                        <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                          <p className="text-xs text-slate-600 mb-1">Distance</p>
                          <p className="text-lg font-bold text-pink-600">{selectedRequest.distance_km?.toFixed(1) || '?'}km</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">📍 Location</h3>
                    <p className="text-slate-700 text-sm">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      {selectedRequest.request?.latitude?.toFixed(4) || '?'}, {selectedRequest.request?.longitude?.toFixed(4) || '?'}
                    </p>
                  </div>

                  {/* Detected Objects */}
                  {selectedRequest.request?.verification_result?.detected_objects && selectedRequest.request.verification_result.detected_objects.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-700 mb-3">🎯 Detected Objects</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.request.verification_result.detected_objects.map((obj, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  {selectedRequest.request?.verification_result?.reasoning && (
                    <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h3 className="text-sm font-bold text-amber-900 mb-2">💡 Analysis</h3>
                      <p className="text-sm text-amber-800">{selectedRequest.request.verification_result.reasoning}</p>
                    </div>
                  )}

                  {/* Images */}
                  {selectedRequest.request?.image_url && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-700 mb-3">📸 Image Evidence</h3>
                      <img
                        src={selectedRequest.request.image_url}
                        alt="Request evidence"
                        className="w-full h-64 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-slate-200">
                    <button
                      onClick={() => selectedRequest.request?.id && handleAcceptRequest(selectedRequest.request.id)}
                      disabled={actionLoading || selectedRequest.status === 'acknowledged' || !selectedRequest.request?.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check size={18} />
                      {selectedRequest.status === 'acknowledged' ? 'Already Accepted' : 'Accept Request'}
                    </button>
                    <button
                      onClick={() => selectedRequest.request?.id && handleRejectRequest(selectedRequest.request.id)}
                      disabled={actionLoading || !selectedRequest.request?.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X size={18} />
                      Reject & Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-12 text-center">
                  <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Select a request to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
