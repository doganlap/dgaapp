const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT Utility Functions
 */

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organization_id,
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'grc-system',
    audience: 'grc-users'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate refresh token
 */
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

/**
 * Decode JWT token without verification (for debugging)
 */
const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

/**
 * Generate password reset token
 */
const generatePasswordResetToken = (userId) => {
  const payload = {
    userId,
    type: 'password_reset',
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {
    expiresIn: '1h', // Password reset tokens expire in 1 hour
    issuer: 'grc-system',
    audience: 'password-reset'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate email verification token
 */
const generateEmailVerificationToken = (userId, email) => {
  const payload = {
    userId,
    email,
    type: 'email_verification',
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {
    expiresIn: '24h', // Email verification tokens expire in 24 hours
    issuer: 'grc-system',
    audience: 'email-verification'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate API key token (long-lived)
 */
const generateApiKeyToken = (user, keyName) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organization_id,
    type: 'api_key',
    keyName,
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {
    expiresIn: '1y', // API keys expire in 1 year
    issuer: 'grc-system',
    audience: 'api-access'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Refresh token if it's close to expiry
 */
const refreshTokenIfNeeded = (token, user, thresholdMinutes = 30) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return null;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;
    const thresholdSeconds = thresholdMinutes * 60;
    
    // If token expires within threshold, generate new token
    if (timeUntilExpiry < thresholdSeconds) {
      return generateToken(user);
    }
    
    return null; // No refresh needed
  } catch (error) {
    return null;
  }
};

/**
 * Validate token format
 */
const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generateApiKeyToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration,
  refreshTokenIfNeeded,
  isValidTokenFormat
};