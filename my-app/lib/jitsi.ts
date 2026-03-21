/**
 * Jitsi Meet Integration
 * Generate automatic meeting links using Jitsi
 */

export interface JitsiMeetingConfig {
  leadName?: string;
  leadPhone?: string;
  meetingDate?: string;
  roomPrefix?: string;
}

/**
 * Generate a unique Jitsi meeting room name
 */
export function generateJitsiRoomName(config?: JitsiMeetingConfig): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  if (config?.leadPhone) {
    // Use phone number (last 4 digits) for easier tracking
    const phoneDigits = config.leadPhone.replace(/\D/g, '').slice(-4);
    return `xspark-${phoneDigits}-${random}`;
  }
  
  return `xspark-meeting-${timestamp}-${random}`;
}

/**
 * Generate a full Jitsi meeting URL
 * @param roomName - Optional custom room name, will generate if not provided
 * @param config - Optional configuration for room naming
 * @returns Full Jitsi meeting URL
 */
export function generateJitsiMeetingLink(
  roomName?: string,
  config?: JitsiMeetingConfig
): string {
  const room = roomName || generateJitsiRoomName(config);
  
  // Use meet.jit.si (free Jitsi server) or your custom domain
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  
  return `https://${jitsiDomain}/${room}`;
}

/**
 * Generate a Jitsi meeting with display name and other configs
 */
export function generateJitsiMeetingLinkWithConfig(config: JitsiMeetingConfig): {
  link: string;
  roomName: string;
  displayName?: string;
} {
  const roomName = generateJitsiRoomName(config);
  const link = generateJitsiMeetingLink(roomName);
  
  return {
    link,
    roomName,
    displayName: config.leadName ? `Meeting with ${config.leadName}` : undefined,
  };
}

/**
 * Create a Jitsi meeting URL with participant configuration
 * @param roomName - Room name
 * @param displayName - Display name for the meeting
 * @param email - Optional email for the participant
 * @returns Configured Jitsi URL with query parameters
 */
export function createJitsiMeetingUrl(
  roomName: string,
  displayName?: string,
  email?: string
): string {
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  const baseUrl = `https://${jitsiDomain}/${roomName}`;
  
  const params = new URLSearchParams();
  
  if (displayName) {
    params.append('displayName', displayName);
  }
  
  if (email) {
    params.append('email', email);
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}#${queryString}` : baseUrl;
}

/**
 * Extract room name from Jitsi URL
 */
export function extractRoomNameFromJitsiUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    return pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
  } catch {
    return null;
  }
}

/**
 * Validate if URL is a valid Jitsi meeting link
 */
export function isValidJitsiUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname === 'meet.jit.si' || 
       urlObj.hostname.includes('jitsi')) &&
      urlObj.pathname.length > 1
    );
  } catch {
    return false;
  }
}

/**
 * Format meeting link for display (shorten if too long)
 */
export function formatMeetingLinkForDisplay(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  
  try {
    const urlObj = new URL(url);
    const roomName = extractRoomNameFromJitsiUrl(url);
    return roomName ? `${urlObj.hostname}/${roomName}` : url.substring(0, maxLength) + '...';
  } catch {
    return url.substring(0, maxLength) + '...';
  }
}
