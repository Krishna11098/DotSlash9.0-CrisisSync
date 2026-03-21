'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Building2,
  TrendingUp,
  MapPin,
  Zap,
  ArrowLeft,
} from 'lucide-react'
import ProtectedLayout from '@/app/components/ProtectedLayout'

interface PriorityData {
  category: 'Hospital' | 'Fire' | 'Municipal' | 'Police'
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  priority_score: number
  confidence: number
  department_confidence: number
  recommendation: string
  estimated_urgency_seconds: number
  reasoning: string
}

const PRIORITY_COLORS = {
  CRITICAL: {
    bg: 'from-red-600 to-red-700',
    border: 'border-red-300 bg-red-50',
    badge: 'bg-red-200 text-red-800',
    icon: '🚨',
    text: 'text-red-700',
  },
  HIGH: {
    bg: 'from-orange-500 to-orange-600',
    border: 'border-orange-300 bg-orange-50',
    badge: 'bg-orange-200 text-orange-800',
    icon: '⚠️',
    text: 'text-orange-700',
  },
  MEDIUM: {
    bg: 'from-yellow-500 to-yellow-600',
    border: 'border-yellow-300 bg-yellow-50',
    badge: 'bg-yellow-200 text-yellow-800',
    icon: '🟡',
    text: 'text-yellow-700',
  },
  LOW: {
    bg: 'from-green-500 to-green-600',
    border: 'border-green-300 bg-green-50',
    badge: 'bg-green-200 text-green-800',
    icon: '✅',
    text: 'text-green-700',
  },
}

const DEPARTMENT_INFO = {
  Hospital: {
    icon: '🏥',
    label: 'Hospital',
    color: 'from-red-500 to-rose-600',
    contact: 'Call Emergency: 108 / 102',
  },
  Fire: {
    icon: '🚒',
    label: 'Fire Department',
    color: 'from-orange-500 to-amber-600',
    contact: 'Call Fire Service: 101',
  },
  Police: {
    icon: '🚔',
    label: 'Police',
    color: 'from-blue-500 to-indigo-600',
    contact: 'Call Police: 100',
  },
  Municipal: {
    icon: '🏗️',
    label: 'Municipal Corporation',
    color: 'from-emerald-500 to-teal-600',
    contact: 'Contact: Corporation helpline',
  },
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [priorityData, setPriorityData] = useState<PriorityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    // Get all data from URL parameters
    const data: PriorityData = {
      category: (searchParams.get('category') as any) || 'Municipal',
      priority_level: (searchParams.get('priority_level') as any) || 'LOW',
      priority_score: parseInt(searchParams.get('priority_score') || '0'),
      confidence: parseFloat(searchParams.get('confidence') || '0'),
      department_confidence: parseFloat(searchParams.get('department_confidence') || '0.62'),
      recommendation: searchParams.get('recommendation') || '',
      estimated_urgency_seconds: parseInt(searchParams.get('estimated_urgency_seconds') || '3600'),
      reasoning: searchParams.get('reasoning') || '',
    }

    setDescription(searchParams.get('description') || '')
    setUrgency(searchParams.get('urgency') || '')
    setLocation(searchParams.get('location') || '')
    setPriorityData(data)
    setLoading(false)
  }, [searchParams])

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <p className="text-slate-600">Loading results...</p>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  if (!priorityData) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">No Results Found</h1>
            <p className="text-slate-600 mb-6">Could not load priority analysis results.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  const colors = PRIORITY_COLORS[priorityData.priority_level]
  const deptInfo = DEPARTMENT_INFO[priorityData.category]
  const urgencyMinutes = Math.ceil(priorityData.estimated_urgency_seconds / 60)

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🔥</span>
              <h1 className="text-3xl font-bold text-slate-900">
                Civic Emergency Analysis
              </h1>
            </div>
            <p className="text-slate-600">
              Complete priority assessment and department routing
            </p>
          </div>

          {/* Main Result Card */}
          <div
            className={`bg-gradient-to-r ${colors.bg} rounded-2xl p-8 text-white mb-8 shadow-lg`}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{colors.icon}</span>
                  <span className={`px-4 py-1 rounded-full font-bold text-lg`}>
                    {priorityData.priority_level} PRIORITY
                  </span>
                </div>
                <p className="text-lg opacity-90">
                  {deptInfo.icon} Route to {deptInfo.label}
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{priorityData.priority_score}</div>
                <div className="text-sm opacity-75">/100 Priority Score</div>
              </div>
            </div>

            {/* Response Time */}
            <div className="flex items-center gap-2 pt-6 border-t border-white border-opacity-20">
              <Clock className="w-5 h-5" />
              <div>
                <span className="font-semibold">
                  Estimated Response Time: {urgencyMinutes} minute{urgencyMinutes !== 1 ? 's' : ''}
                </span>
                <p className="text-sm opacity-75">
                  {priorityData.estimated_urgency_seconds < 60
                    ? 'IMMEDIATE'
                    : `Within ${urgencyMinutes} minute${urgencyMinutes !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`border-l-4 ${colors.border} rounded-lg p-6 mb-8`}>
            <h3 className={`font-bold mb-2 flex items-center gap-2 ${colors.text}`}>
              <Zap className="w-5 h-5" />
              Recommended Action
            </h3>
            <p className={`${colors.text}`}>{priorityData.recommendation}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Analysis Details */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Analysis Details
              </h2>

              <div className="space-y-4">
                {/* Category Confidence */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-slate-700">Category Confidence</span>
                    <span className="font-bold text-blue-600">
                      {(priorityData.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${priorityData.confidence * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    How confident the system is about this category
                  </p>
                </div>

                {/* Department Base Score */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-slate-700">
                      {priorityData.category} Priority Base
                    </span>
                    <span className="font-bold text-purple-600">
                      {(priorityData.department_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${priorityData.department_confidence * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Base priority weight for {priorityData.category} department
                  </p>
                </div>

                {/* Priority Score Breakdown */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-slate-700">Final Priority Score</span>
                    <span className="font-bold text-green-600">{priorityData.priority_score}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-green-600 h-full rounded-full"
                      style={{ width: `${priorityData.priority_score}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Combined score from confidence × urgency × keywords
                  </p>
                </div>
              </div>
            </div>

            {/* Department Info Card */}
            <div
              className={`bg-gradient-to-br ${deptInfo.color} rounded-xl shadow-md p-6 text-white`}
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Department Routing
              </h2>

              <div className="space-y-6">
                <div>
                  <div className="text-4xl mb-2">{deptInfo.icon}</div>
                  <h3 className="text-2xl font-bold">{deptInfo.label}</h3>
                </div>

                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur">
                  <p className="text-sm opacity-75 mb-1">Contact Information:</p>
                  <p className="font-bold text-lg">{deptInfo.contact}</p>
                </div>

                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <p className="text-sm mb-2">Priority Band</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold">
                      {priorityData.priority_level}
                    </span>
                    {priorityData.priority_level === 'CRITICAL' && (
                      <span className="text-sm opacity-75">
                        Immediate attention required
                      </span>
                    )}
                    {priorityData.priority_level === 'HIGH' && (
                      <span className="text-sm opacity-75">
                        Urgent response needed
                      </span>
                    )}
                    {priorityData.priority_level === 'MEDIUM' && (
                      <span className="text-sm opacity-75">
                        Standard priority
                      </span>
                    )}
                    {priorityData.priority_level === 'LOW' && (
                      <span className="text-sm opacity-75">
                        Routine handling
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submitted Information */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Your Submitted Request
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {description && (
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-2">Description</p>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded text-sm">
                    "{description}"
                  </p>
                </div>
              )}

              {urgency && (
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-2">
                    Selected Urgency
                  </p>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded text-sm capitalize font-medium">
                    {urgency}
                  </p>
                </div>
              )}

              {location && (
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Location
                  </p>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded text-sm">
                    {location}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Classification Reasoning */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Classification Reasoning
            </h3>
            <p className="text-blue-800">{priorityData.reasoning}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition"
            >
              Submit Another Request
            </button>
            <button
              onClick={() => window.print()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              Print Results
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center text-slate-600 text-sm">
            <p>
              ✅ Request has been submitted and routed to the appropriate department.
            </p>
            <p className="mt-1">
              You will receive updates via SMS and email at the address you provided.
            </p>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
