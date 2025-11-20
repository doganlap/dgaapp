// Backend Integration Service for Demo/POC Bookings and Sandbox Access

const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3005/api')
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

/**
 * Submit booking request to Azure Functions
 * @param {Object} bookingData - Booking form data
 * @returns {Promise<Object>} Response from Azure
 */
export const submitBooking = async (bookingData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/landing/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: bookingData.name,
        company: bookingData.company,
        email: bookingData.email,
        phone: bookingData.phone,
        date: bookingData.preferredDate,
        time: bookingData.preferredTime,
        type: bookingData.requestType, // 'demo' or 'poc'
        package: bookingData.companySize,
        features: bookingData.sector,
        message: bookingData.message || '',
        lead_score: calculateLeadScore(bookingData),
        timestamp: new Date().toISOString(),
        source: 'landing-page',
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Track successful submission
    trackBookingEvent('booking_submitted', bookingData.requestType, data.bookingId)

    return {
      success: true,
      bookingId: data.bookingId,
      message: data.message,
      confirmationEmail: data.confirmationEmail
    }
  } catch (error) {
    console.error('Booking submission error:', error)

    // Track error
    trackBookingEvent('booking_error', bookingData.requestType, error.message)

    // Fallback: Store locally and retry
    await storeBookingLocally(bookingData)

    throw new Error('Failed to submit booking. We have saved your request and will contact you shortly.')
  }
}

/**
 * Calculate lead score based on booking data
 * @param {Object} bookingData - Booking form data
 * @returns {number} Lead score (0-100)
 */
export const calculateLeadScore = (bookingData) => {
  let score = 0

  // Company size scoring
  const sizeScores = {
    'small': 10,
    'medium': 25,
    'large': 40,
    'enterprise': 50
  }
  score += sizeScores[bookingData.companySize] || 0

  // Sector scoring (high-value sectors)
  const sectorScores = {
    'financial': 20,
    'healthcare': 15,
    'government': 25,
    'technology': 15,
    'energy': 20,
    'manufacturing': 10,
    'other': 5
  }
  score += sectorScores[bookingData.sector] || 0

  // Request type scoring
  score += bookingData.requestType === 'poc' ? 20 : 10

  // Message provided (shows engagement)
  if (bookingData.message && bookingData.message.length > 20) {
    score += 10
  }

  // Email domain check (corporate email)
  if (bookingData.email && !bookingData.email.includes('@gmail.com') &&
      !bookingData.email.includes('@yahoo.com') && !bookingData.email.includes('@outlook.com')) {
    score += 5
  }

  return Math.min(score, 100)
}

/**
 * Store booking locally if Azure fails (for retry)
 * @param {Object} bookingData - Booking form data
 */
const storeBookingLocally = async (bookingData) => {
  try {
    const localBookings = JSON.parse(localStorage.getItem('pending_bookings') || '[]')
    localBookings.push({
      ...bookingData,
      storedAt: new Date().toISOString(),
      retryCount: 0
    })
    localStorage.setItem('pending_bookings', JSON.stringify(localBookings))
  } catch (error) {
    console.error('Failed to store booking locally:', error)
  }
}

/**
 * Retry failed bookings from local storage
 */
export const retryPendingBookings = async () => {
  try {
    const localBookings = JSON.parse(localStorage.getItem('pending_bookings') || '[]')

    if (localBookings.length === 0) return

    const successfulRetries = []

    for (const booking of localBookings) {
      if (booking.retryCount < 3) {
        try {
          await submitBooking(booking)
          successfulRetries.push(booking)
        } catch (error) {
          booking.retryCount++
        }
      }
    }

    // Remove successful retries
    const remainingBookings = localBookings.filter(
      b => !successfulRetries.includes(b)
    )
    localStorage.setItem('pending_bookings', JSON.stringify(remainingBookings))

  } catch (error) {
    console.error('Retry failed:', error)
  }
}

/**
 * Track booking events for analytics
 * @param {string} eventName - Event name
 * @param {string} bookingType - demo or poc
 * @param {string} value - Additional value
 */
const trackBookingEvent = (eventName, bookingType, value) => {
  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', eventName, {
      booking_type: bookingType,
      value: value,
      timestamp: new Date().toISOString()
    })
  }

  // Azure Application Insights
  if (window.appInsights) {
    window.appInsights.trackEvent({
      name: eventName,
      properties: {
        bookingType: bookingType,
        value: value
      }
    })
  }

  // Facebook Pixel
  if (window.fbq) {
    window.fbq('track', 'Lead', {
      content_name: bookingType,
      value: value
    })
  }

  // LinkedIn Insight Tag
  if (window.lintrk) {
    window.lintrk('track', { conversion_id: '12345678' })
  }
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} Is valid
 */
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * Validate phone format (Saudi Arabia)
 * @param {string} phone - Phone number
 * @returns {boolean} Is valid
 */
export const validatePhone = (phone) => {
  // Saudi phone: +966 XX XXX XXXX or similar formats
  const re = /^(\+966|966|0)?5[0-9]{8}$/
  return re.test(phone.replace(/[\s-]/g, ''))
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

/**
 * Get available time slots (exclude booked slots)
 * @param {string} date - Selected date
 * @param {string} type - Booking type ('demo' or 'poc')
 * @returns {Promise<Object>} Availability data with available and booked slots
 */
export const getAvailableTimeSlots = async (date, type = 'demo') => {
  try {
    const response = await fetch(`${API_BASE_URL}/landing/availability?date=${date}&type=${type}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch availability')
    }

    const data = await response.json()
    return {
      availableSlots: data.availableSlots || [],
      bookedSlots: data.bookedSlots || [],
      totalSlots: data.totalSlots || 8,
      availableCount: data.availableCount || 0
    }
  } catch (error) {
    console.error('Availability check error:', error)
    // Return all slots if API fails
    const allSlots = [
      '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
    ]
    return {
      availableSlots: allSlots,
      bookedSlots: [],
      totalSlots: allSlots.length,
      availableCount: allSlots.length
    }
  }
}

/**
 * Get available dates in a range
 * @param {string} type - Booking type ('demo' or 'poc')
 * @param {string} startDate - Start date (optional, defaults to today)
 * @returns {Promise<Array>} Available dates with availability info
 */
export const getAvailableDates = async (type = 'demo', startDate = null) => {
  try {
    const url = `${API_BASE_URL}/landing/available-dates?type=${type}${startDate ? `&startDate=${startDate}` : ''}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch available dates')
    }

    const data = await response.json()
    return data.availableDates || []
  } catch (error) {
    console.error('Available dates check error:', error)
    return []
  }
}

/**
 * Send confirmation email
 * @param {string} email - Recipient email
 * @param {Object} bookingDetails - Booking details
 */
export const sendConfirmationEmail = async (email, bookingDetails) => {
  try {
    await fetch(`${API_BASE_URL}/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'dummy-key'
      },
      body: JSON.stringify({
        to: email,
        template: 'booking_confirmation',
        data: bookingDetails
      })
    })
  } catch (error) {
    console.error('Email notification error:', error)
  }
}

/**
 * Check if booking window is open (business hours)
 * @returns {boolean} Is booking available now
 */
export const isBookingWindowOpen = () => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
  const hour = now.getHours()

  // Saudi Arabia business hours: Sunday-Thursday, 8 AM - 5 PM
  const isBusinessDay = dayOfWeek >= 0 && dayOfWeek <= 4
  const isBusinessHour = hour >= 8 && hour < 17

  return isBusinessDay && isBusinessHour
}

export default {
  submitBooking,
  calculateLeadScore,
  retryPendingBookings,
  validateEmail,
  validatePhone,
  formatDate,
  getAvailableTimeSlots,
  getAvailableDates,
  sendConfirmationEmail,
  isBookingWindowOpen
}


