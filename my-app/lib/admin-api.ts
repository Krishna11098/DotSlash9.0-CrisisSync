import { supabase } from './supabase';
import { generateLeadSummary, type LeadData } from './gemini-ai';

export interface Lead {
  id?: string;
  local_id?: number;
  lead_number?: number;
  name?: string | null;
  email: string;
  phone: string;
  company?: string | null;
  designation?: string | null;
  stage?: string | null;
  priority?: number | null;
  query_type?: string | null;
  entry_type?: string | null;
  capture_mode?: string | null;
  remark?: string | null;
  audio_file_url?: string | null;
  audio_file_text?: string | null;
  transcribed_text?: string | null;
  ai_summary?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  meeting_date?: string | null;
  meeting_link?: string | null;
  meeting_type?: string | null;
  meeting_notes?: string | null;
  outcome_notes?: string | null;
  event_id?: string | null;
}

export interface Event {
  id: string;
  event_code: string;
  name: string;
  description?: string | null;
  venue: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  budget?: number | null;
  expected_leads?: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all leads directly from Supabase
 * @returns Array of leads with all fields including follow-up and meeting data
 */
export async function fetchAllLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    return [];
  }
}

/**
 * Fetch a single lead by ID directly from Supabase
 * @param leadId - The lead ID to fetch
 * @returns Lead object or null
 */
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) {
      console.error('Error fetching lead:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch lead:', error);
    return null;
  }
}

/**
 * Update a lead directly in Supabase
 * @param leadId - The lead ID to update
 * @param updates - Partial lead object with fields to update
 * @returns Updated lead object or null
 */
export async function updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update lead:', error);
    return null;
  }
}

/**
 * Fetch all events directly from Supabase
 * @returns Array of events
 */
export async function fetchAllEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

/**
 * Fetch a single event by ID directly from Supabase
 * @param eventId - The event ID to fetch
 * @returns Event object or null
 */
export async function fetchEventById(eventId: string): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return null;
  }
}

/**
 * Fetch leads for a specific event directly from Supabase
 * @param eventId - The event ID
 * @returns Array of leads for the event
 */
export async function fetchLeadsByEvent(eventId: string): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads by event:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch leads by event:', error);
    return [];
  }
}

/**
 * Delete a lead directly from Supabase
 * @param leadId - The lead ID to delete
 * @returns True if successful, false otherwise
 */
export async function deleteLead(leadId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete lead:', error);
    return false;
  }
}

/**
 * Create a new event directly in Supabase
 * @param event - Partial event object with required fields
 * @returns Created event object or null
 */
export async function createEvent(event: Partial<Event>): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to create event:', error);
    return null;
  }
}

/**
 * Update an event directly in Supabase
 * @param eventId - The event ID to update
 * @param updates - Partial event object with fields to update
 * @returns Updated event object or null
 */
export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update event:', error);
    return null;
  }
}

/**
 * Delete an event directly from Supabase
 * @param eventId - The event ID to delete
 * @returns True if successful, false otherwise
 */
export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete event:', error);
    return false;
  }
}

/**
 * Generate AI summary for a lead using Gemini
 * @param lead - Lead object to generate summary for
 * @returns Generated AI summary text
 */
export async function generateAISummaryForLead(lead: Lead): Promise<string> {
  try {
    const leadData: LeadData = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      designation: lead.designation,
      query_type: lead.query_type,
      priority: lead.priority,
      remark: (lead as any).remark || null,
      capture_mode: lead.capture_mode,
      created_at: lead.created_at,
    };

    const summary = await generateLeadSummary(leadData);
    return summary;
  } catch (error) {
    console.error('Failed to generate AI summary:', error);
    return '';
  }
}

/**
 * Update lead with AI-generated summary
 * @param leadId - Lead ID to update
 * @param lead - Lead data to use for summary generation
 * @returns Updated lead with AI summary
 */
export async function updateLeadWithAISummary(leadId: string, lead: Lead): Promise<Lead | null> {
  try {
    // Generate AI summary
    const aiSummary = await generateAISummaryForLead(lead);

    if (!aiSummary) {
      console.warn('No AI summary generated');
      return null;
    }

    // Update lead with AI summary
    const { data, error } = await supabase
      .from('leads')
      .update({ ai_summary: aiSummary })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead with AI summary:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update lead with AI summary:', error);
    return null;
  }
}
