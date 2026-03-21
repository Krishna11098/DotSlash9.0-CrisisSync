import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    // Fetch all events
    let eventsQuery = supabaseAdmin
      .from('events')
      .select('*')
      .order('start_date', { ascending: false })

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    // Fetch all leads or leads for specific event
    let leadsQuery = supabaseAdmin
      .from('leads')
      .select('*')

    if (eventId) {
      leadsQuery = leadsQuery.eq('event_id', eventId)
    }

    const { data: allLeads, error: leadsError } = await leadsQuery

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 })
    }

    const leads = allLeads || []

    // Calculate analytics
    const analytics = {
      // Event Overview
      eventOverview: {
        totalEvents: events?.length || 0,
        activeEvents: events?.filter((e: any) => e.status === 'active').length || 0,
        upcomingEvents: events?.filter((e: any) => e.status === 'upcoming').length || 0,
        completedEvents: events?.filter((e: any) => e.status === 'completed').length || 0,
      },

      // Contact Status Breakdown
      contactStatus: {
        met: leads.filter((l: any) => l.stage === 'met').length,
        followUp: leads.filter((l: any) => l.stage === 'follow_up').length,
        engaged: leads.filter((l: any) => l.stage === 'engaged').length,
        meetingScheduled: leads.filter((l: any) => l.stage === 'meeting_scheduled').length,
        meetingCompleted: leads.filter((l: any) => l.stage === 'meeting_completed').length,
        converted: leads.filter((l: any) => l.stage === 'converted').length,
        lost: leads.filter((l: any) => l.stage === 'lost').length,
        total: leads.length,
      },

      // Lead Quality
      leadQuality: {
        highIntent: leads.filter((l: any) => (l.priority || 0) >= 8).length,
        mediumIntent: leads.filter((l: any) => (l.priority || 0) >= 5 && (l.priority || 0) < 8).length,
        lowIntent: leads.filter((l: any) => (l.priority || 0) < 5).length,
        withAudioNotes: leads.filter((l: any) => l.audio_file_url || l.audio_file_text).length,
        completeDetails: leads.filter((l: any) => l.name && l.email && l.phone && l.company).length,
        incompleteDetails: leads.filter((l: any) => !l.name || !l.email || !l.phone).length,
      },

      // Capture Mode Split
      captureMode: {
        stall: leads.filter((l: any) => l.capture_mode === 'stall').length,
        field: leads.filter((l: any) => l.capture_mode === 'field').length,
      },

      // Entry Type Distribution
      entryType: {
        manual: leads.filter((l: any) => l.entry_type === 'manual').length,
        scanned: leads.filter((l: any) => l.entry_type === 'card_scan').length,
      },

      // Team Performance (based on captured_by field if it exists)
      teamPerformance: calculateTeamPerformance(leads),

      // Event-wise breakdown
      eventWiseBreakdown: calculateEventWiseBreakdown(events || [], leads),

      // Time-based trends
      timeBasedTrends: calculateTimeBasedTrends(leads),

      // Peak capture hours
      peakCaptureHours: calculatePeakCaptureHours(leads),

      // Conversion funnel
      conversionFunnel: {
        met: leads.filter((l: any) => l.stage === 'met').length,
        followUp: leads.filter((l: any) => ['follow_up', 'engaged', 'meeting_scheduled', 'meeting_completed', 'converted'].includes(l.stage || '')).length,
        engaged: leads.filter((l: any) => ['engaged', 'meeting_scheduled', 'meeting_completed', 'converted'].includes(l.stage || '')).length,
        meetingScheduled: leads.filter((l: any) => ['meeting_scheduled', 'meeting_completed', 'converted'].includes(l.stage || '')).length,
        converted: leads.filter((l: any) => l.stage === 'converted').length,
      },
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateTeamPerformance(leads: any[]) {
  const teamStats: Record<string, any> = {}

  leads.forEach((lead: any) => {
    const member = lead.captured_by || lead.assigned_to || 'Unassigned'
    
    if (!teamStats[member]) {
      teamStats[member] = {
        totalCaptures: 0,
        meetingsBooked: 0,
        followUpsCompleted: 0,
        conversions: 0,
      }
    }

    teamStats[member].totalCaptures++

    if (['meeting_scheduled', 'meeting_completed'].includes(lead.stage || '')) {
      teamStats[member].meetingsBooked++
    }

    if (lead.follow_up_date && lead.follow_up_notes) {
      teamStats[member].followUpsCompleted++
    }

    if (lead.stage === 'converted') {
      teamStats[member].conversions++
    }
  })

  return Object.entries(teamStats).map(([name, stats]) => ({
    name,
    ...stats,
    followUpRate: stats.followUpsCompleted > 0 
      ? (stats.followUpsCompleted / stats.totalCaptures * 100).toFixed(1)
      : '0',
  }))
}

function calculateEventWiseBreakdown(events: any[], leads: any[]) {
  return events.map((event: any) => {
    const eventLeads = leads.filter((l: any) => l.event_id === event.id)
    
    return {
      eventId: event.id,
      eventName: event.name,
      eventCode: event.event_code,
      totalContacts: eventLeads.length,
      stallCaptures: eventLeads.filter((l: any) => l.capture_mode === 'stall').length,
      fieldCaptures: eventLeads.filter((l: any) => l.capture_mode === 'field').length,
      conversions: eventLeads.filter((l: any) => l.stage === 'converted').length,
      meetings: eventLeads.filter((l: any) => ['meeting_scheduled', 'meeting_completed'].includes(l.stage || '')).length,
      conversionRate: eventLeads.length > 0 
        ? ((eventLeads.filter((l: any) => l.stage === 'converted').length / eventLeads.length) * 100).toFixed(1)
        : '0',
      startDate: event.start_date,
      endDate: event.end_date,
      status: event.status,
    }
  }).sort((a, b) => b.totalContacts - a.totalContacts)
}

function calculateTimeBasedTrends(leads: any[]) {
  const dailyCaptures: Record<string, number> = {}
  const dailyConversions: Record<string, number> = {}

  leads.forEach((lead: any) => {
    if (lead.created_at) {
      const date = new Date(lead.created_at).toISOString().split('T')[0]
      dailyCaptures[date] = (dailyCaptures[date] || 0) + 1

      if (lead.stage === 'converted') {
        dailyConversions[date] = (dailyConversions[date] || 0) + 1
      }
    }
  })

  // Get last 30 days
  const days = Object.keys(dailyCaptures).sort().slice(-30)

  return days.map(date => ({
    date,
    captures: dailyCaptures[date] || 0,
    conversions: dailyConversions[date] || 0,
  }))
}

function calculatePeakCaptureHours(leads: any[]) {
  const hourlyCaptures: Record<number, number> = {}

  leads.forEach((lead: any) => {
    if (lead.created_at) {
      const hour = new Date(lead.created_at).getHours()
      hourlyCaptures[hour] = (hourlyCaptures[hour] || 0) + 1
    }
  })

  return Object.entries(hourlyCaptures)
    .map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
      label: `${hour}:00`,
    }))
    .sort((a, b) => a.hour - b.hour)
}
