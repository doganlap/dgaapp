/**
 * Urgency Classifier
 * Classifies regulatory changes by urgency level
 */

const URGENCY_KEYWORDS = {
  critical: ['critical', 'urgent', 'immediate', 'emergency', 'breach', 'violation', 'penalty', 'suspension'],
  high: ['mandatory', 'required', 'must', 'shall', 'essential', 'compliance', 'deadline'],
  medium: ['should', 'recommended', 'guideline', 'best practice', 'update'],
  low: ['voluntary', 'optional', 'advisory', 'informational', 'notice']
};

function classifyUrgency(regulatoryChange) {
  const text = `${regulatoryChange.title} ${regulatoryChange.description || ''}`.toLowerCase();
  
  // Check for critical keywords first
  for (const keyword of URGENCY_KEYWORDS.critical) {
    if (text.includes(keyword)) {
      return 'critical';
    }
  }
  
  // Check for high urgency
  for (const keyword of URGENCY_KEYWORDS.high) {
    if (text.includes(keyword)) {
      return 'high';
    }
  }
  
  // Check for low urgency
  for (const keyword of URGENCY_KEYWORDS.low) {
    if (text.includes(keyword)) {
      return 'low';
    }
  }
  
  // Default to medium
  return 'medium';
}

function getUrgencyColor(urgencyLevel) {
  const colors = {
    critical: '#DC2626', // Red
    high: '#EA580C', // Orange
    medium: '#CA8A04', // Yellow
    low: '#16A34A' // Green
  };
  return colors[urgencyLevel] || colors.medium;
}

module.exports = {
  classifyUrgency,
  getUrgencyColor,
  URGENCY_KEYWORDS
};

