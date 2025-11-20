/**
 * Security Configuration
 * Centralized security settings and validation rules
 */

const crypto = require('crypto');

// Security constants
const SECURITY_CONFIG = {
  // File upload security
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_REQUEST: 10,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp'
  ],
  
  // Rate limiting
  RATE_LIMITS: {
    GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10
    },
    UPLOAD: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20
    },
    SEARCH: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50
    }
  },
  
  // Password requirements
  PASSWORD_POLICY: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    preventReuse: 5 // Last 5 passwords
  },
  
  // Session security
  SESSION: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },
  
  // JWT security
  JWT: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256',
    issuer: 'grc-assessment-app',
    audience: 'grc-users'
  },
  
  // Encryption settings
  ENCRYPTION: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  },
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

/**
 * Validate file upload security
 */
function validateFileUpload(file) {
  const errors = [];
  
  // Check file size
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed size of ${SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  // Check MIME type
  if (!SECURITY_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }
  
  // Check filename for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|app|deb|rpm)$/i,  // Executable extensions
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Reserved Windows names
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
    errors.push('Filename contains suspicious patterns');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  const errors = [];
  const policy = SECURITY_CONFIG.PASSWORD_POLICY;
  
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }
  
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
}

/**
 * Calculate password strength score
 */
function calculatePasswordStrength(password) {
  let score = 0;
  
  // Length bonus
  score += Math.min(password.length * 2, 20);
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/\d/.test(password)) score += 5;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
  
  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential patterns
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Generate secure random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data
 */
function hashData(data, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  
  const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify hashed data
 */
function verifyHash(data, hash, salt) {
  const { hash: computedHash } = hashData(data, salt);
  return computedHash === hash;
}

/**
 * Check if IP is in allowed range
 */
function isAllowedIP(ip, allowedRanges = []) {
  if (allowedRanges.length === 0) return true;
  
  // Simple IP range checking (can be enhanced with proper CIDR support)
  return allowedRanges.some(range => {
    if (range.includes('/')) {
      // CIDR notation - simplified check
      const [network, prefix] = range.split('/');
      return ip.startsWith(network.split('.').slice(0, Math.floor(prefix / 8)).join('.'));
    } else {
      // Exact match or wildcard
      return ip === range || range === '*';
    }
  });
}

/**
 * Security audit logger
 */
function logSecurityEvent(event) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: event.level || 'INFO',
    type: event.type,
    message: event.message,
    ip: event.ip,
    userAgent: event.userAgent,
    userId: event.userId,
    tenantId: event.tenantId,
    metadata: event.metadata || {}
  };
  
  // In production, this should write to a secure audit log
  console.log(`[SECURITY AUDIT] ${JSON.stringify(logEntry)}`);
  
  return logEntry;
}

module.exports = {
  SECURITY_CONFIG,
  validateFileUpload,
  validatePassword,
  calculatePasswordStrength,
  sanitizeInput,
  generateSecureToken,
  hashData,
  verifyHash,
  isAllowedIP,
  logSecurityEvent
};