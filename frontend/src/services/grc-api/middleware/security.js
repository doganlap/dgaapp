/**
 * Security Middleware
 * Implements various security checks and protections
 */

const { 
  sanitizeInput, 
  isAllowedIP, 
  logSecurityEvent,
  SECURITY_CONFIG 
} = require('../config/security');

/**
 * Input sanitization middleware
 */
function sanitizeInputs(req, res, next) {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeInput(obj);
    }
    if (typeof obj === 'object' && obj !== null && !Buffer.isBuffer(obj)) {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logSecurityEvent({
      type: 'INPUT_SANITIZATION_ERROR',
      level: 'ERROR',
      message: 'Failed to sanitize input',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { error: error.message }
    });
    
    res.status(400).json({
      success: false,
      error: 'Invalid input format'
    });
  }
}

/**
 * IP whitelist middleware
 */
function ipWhitelist(allowedIPs = []) {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!isAllowedIP(clientIP, allowedIPs)) {
      logSecurityEvent({
        type: 'IP_BLOCKED',
        level: 'WARN',
        message: `Access denied for IP: ${clientIP}`,
        ip: clientIP,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    next();
  };
}

/**
 * Request size limiter
 */
function requestSizeLimiter(maxSize = 10 * 1024 * 1024) { // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      logSecurityEvent({
        type: 'REQUEST_TOO_LARGE',
        level: 'WARN',
        message: `Request size ${contentLength} exceeds limit ${maxSize}`,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(413).json({
        success: false,
        error: 'Request entity too large'
      });
    }
    
    next();
  };
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Apply security headers
  Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
}

/**
 * SQL injection detection middleware
 */
function sqlInjectionDetection(req, res, next) {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(--|\/\*|\*\/|;)/,
    /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\()/i,
    /(\b(WAITFOR|DELAY)\s+)/i
  ];
  
  const checkForSQLInjection = (obj, path = '') => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForSQLInjection(obj[key], `${path}.${key}`)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  const suspicious = 
    checkForSQLInjection(req.body, 'body') ||
    checkForSQLInjection(req.query, 'query') ||
    checkForSQLInjection(req.params, 'params');
  
  if (suspicious) {
    logSecurityEvent({
      type: 'SQL_INJECTION_ATTEMPT',
      level: 'HIGH',
      message: 'Potential SQL injection detected',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      tenantId: req.user?.tenant_id,
      metadata: {
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
      }
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid request format'
    });
  }
  
  next();
}

/**
 * XSS detection middleware
 */
function xssDetection(req, res, next) {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gis,
    /<iframe[^>]*>.*?<\/iframe>/gis,
    /<object[^>]*>.*?<\/object>/gis,
    /<embed[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src\s*=\s*["']?javascript:/gi
  ];
  
  const checkForXSS = (obj) => {
    if (typeof obj === 'string') {
      return xssPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForXSS(obj[key])) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  const suspicious = 
    checkForXSS(req.body) ||
    checkForXSS(req.query) ||
    checkForXSS(req.params);
  
  if (suspicious) {
    logSecurityEvent({
      type: 'XSS_ATTEMPT',
      level: 'HIGH',
      message: 'Potential XSS attack detected',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      tenantId: req.user?.tenant_id,
      metadata: {
        url: req.originalUrl,
        method: req.method
      }
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid request content'
    });
  }
  
  next();
}

/**
 * Path traversal detection middleware
 */
function pathTraversalDetection(req, res, next) {
  const pathTraversalPatterns = [
    /\.\./,
    /\.\\/,
    /\.\/\./,
    /%2e%2e/i,
    /%252e%252e/i,
    /\.\.\\/,
    /\.\.\//
  ];
  
  const checkForPathTraversal = (obj) => {
    if (typeof obj === 'string') {
      return pathTraversalPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForPathTraversal(obj[key])) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  const suspicious = 
    checkForPathTraversal(req.body) ||
    checkForPathTraversal(req.query) ||
    checkForPathTraversal(req.params) ||
    pathTraversalPatterns.some(pattern => pattern.test(req.originalUrl));
  
  if (suspicious) {
    logSecurityEvent({
      type: 'PATH_TRAVERSAL_ATTEMPT',
      level: 'HIGH',
      message: 'Potential path traversal attack detected',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      tenantId: req.user?.tenant_id,
      metadata: {
        url: req.originalUrl,
        method: req.method
      }
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid request path'
    });
  }
  
  next();
}

/**
 * Suspicious user agent detection
 */
function suspiciousUserAgentDetection(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scanner/i,
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /burp/i,
    /zap/i,
    /^$/  // Empty user agent
  ];
  
  // Allow legitimate bots (optional - can be configured)
  const allowedBots = [
    /googlebot/i,
    /bingbot/i,
    /slackbot/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent)) &&
                      !allowedBots.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    logSecurityEvent({
      type: 'SUSPICIOUS_USER_AGENT',
      level: 'MEDIUM',
      message: `Suspicious user agent detected: ${userAgent}`,
      ip: req.ip,
      userAgent: userAgent,
      metadata: {
        url: req.originalUrl,
        method: req.method
      }
    });
    
    // Don't block, just log for now
    // return res.status(403).json({
    //   success: false,
    //   error: 'Access denied'
    // });
  }
  
  next();
}

/**
 * Comprehensive security middleware stack
 */
function securityStack() {
  return [
    securityHeaders,
    sanitizeInputs,
    requestSizeLimiter(),
    sqlInjectionDetection,
    xssDetection,
    pathTraversalDetection,
    suspiciousUserAgentDetection
  ];
}

module.exports = {
  sanitizeInputs,
  ipWhitelist,
  requestSizeLimiter,
  securityHeaders,
  sqlInjectionDetection,
  xssDetection,
  pathTraversalDetection,
  suspiciousUserAgentDetection,
  securityStack
};