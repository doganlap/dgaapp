const Joi = require('joi');
const { USER_ROLES, USER_STATUSES } = require('../constants/access');

/**
 * Request Validation Middleware
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Request data is invalid',
        errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Query Parameters Validation
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        message: 'Query parameters are invalid',
        errors
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Path Parameters Validation
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Parameter validation failed',
        message: 'URL parameters are invalid',
        errors
      });
    }

    req.params = value;
    next();
  };
};

// ==========================================
// COMMON VALIDATION SCHEMAS
// ==========================================

/**
 * UUID Validation Schema
 */
const uuidSchema = Joi.string().uuid().required();

/**
 * Common ID parameter schema
 */
const idParamSchema = Joi.object({
  id: uuidSchema
});

/**
 * Pagination Schema
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().max(255).optional(),
  sortBy: Joi.string().max(50).optional(),
  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('ASC')
});

/**
 * User Registration Schema
 */
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  organization_id: Joi.string().uuid().optional(),
  role: Joi.string().valid(...USER_ROLES).default('viewer')
});

/**
 * User listing filters
 */
const userFiltersSchema = Joi.object({
  organization_id: Joi.string().uuid().optional(),
  role: Joi.string().valid(...USER_ROLES).optional(),
  is_active: Joi.boolean().default(true),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

/**
 * User update schema
 */
const userUpdateSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100),
  department: Joi.string().max(150).allow(null, ''),
  job_title: Joi.string().max(150).allow(null, ''),
  role: Joi.string().valid(...USER_ROLES),
  permissions: Joi.array().items(Joi.string().max(100)),
  status: Joi.string().valid(...USER_STATUSES)
}).min(1);

/**
 * User role update schema
 */
const userRoleUpdateSchema = Joi.object({
  role: Joi.string().valid(...USER_ROLES).required()
});

/**
 * User Login Schema
 */
const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * Organization Schema
 */
const organizationSchema = Joi.object({
  name: Joi.string().max(255).required(),
  name_ar: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  industry: Joi.string().max(100).optional(),
  sector: Joi.string().max(100).optional(),
  sub_sector: Joi.string().max(100).optional(),
  country: Joi.string().max(100).default('Saudi Arabia'),
  city: Joi.string().max(100).optional(),
  employee_count: Joi.number().integer().min(1).optional(),
  annual_revenue: Joi.number().min(0).optional(),
  processes_personal_data: Joi.boolean().default(false),
  data_sensitivity_level: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  primary_email: Joi.string().email().optional(),
  primary_phone: Joi.string().max(20).optional(),
  website: Joi.string().uri().optional(),
  ciso_name: Joi.string().max(200).optional(),
  ciso_email: Joi.string().email().optional(),
  dpo_name: Joi.string().max(200).optional(),
  dpo_email: Joi.string().email().optional(),
  is_active: Joi.boolean().default(true)
});

/**
 * Assessment Schema
 */
const assessmentSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(1000).optional(),
  organization_id: Joi.string().uuid().required(),
  template_id: Joi.string().uuid().optional(),
  framework_id: Joi.string().uuid().optional(),
  lead_assessor_id: Joi.string().uuid().optional(),
  start_date: Joi.date().optional(),
  target_completion_date: Joi.date().optional(),
  status: Joi.string().valid('draft', 'in_progress', 'under_review', 'completed', 'approved').default('draft'),
  assessment_type: Joi.string().valid('self', 'internal', 'external', 'regulatory').default('self'),
  scope: Joi.string().max(1000).optional(),
  methodology: Joi.string().max(500).optional()
});

/**
 * Framework Schema
 */
const frameworkSchema = Joi.object({
  name: Joi.string().max(255).required(),
  name_ar: Joi.string().max(255).optional(),
  framework_code: Joi.string().max(50).required(),
  version: Joi.string().max(20).optional(),
  description: Joi.string().max(1000).optional(),
  regulator_id: Joi.string().uuid().required(),
  is_mandatory: Joi.boolean().default(false),
  effective_date: Joi.date().optional(),
  framework_type: Joi.string().valid('regulatory', 'standard', 'best_practice').default('regulatory'),
  document_url: Joi.string().uri().optional(),
  is_active: Joi.boolean().default(true)
});

/**
 * Control Schema
 */
const controlSchema = Joi.object({
  framework_id: Joi.string().uuid().required(),
  control_code: Joi.string().max(50).required(),
  title: Joi.string().max(500).required(),
  title_ar: Joi.string().max(500).optional(),
  description: Joi.string().max(2000).optional(),
  description_ar: Joi.string().max(2000).optional(),
  control_type: Joi.string().valid('preventive', 'detective', 'corrective', 'directive').default('preventive'),
  criticality_level: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  is_mandatory: Joi.boolean().default(false),
  control_category: Joi.string().max(100).optional(),
  control_subcategory: Joi.string().max(100).optional(),
  assessment_frequency: Joi.string().valid('monthly', 'quarterly', 'semi_annual', 'annual', 'ad_hoc').default('annual'),
  assessment_method: Joi.string().valid('document_review', 'interview', 'observation', 'testing', 'automated').default('document_review'),
  implementation_guidance: Joi.string().max(2000).optional(),
  evidence_requirements: Joi.array().items(Joi.string()).optional(),
  is_active: Joi.boolean().default(true)
});

/**
 * Regulator Schema
 */
const regulatorSchema = Joi.object({
  name: Joi.string().max(255).required(),
  name_ar: Joi.string().max(255).optional(),
  code: Joi.string().max(20).required(),
  description: Joi.string().max(1000).optional(),
  sector: Joi.string().max(100).optional(),
  jurisdiction: Joi.string().max(100).default('Saudi Arabia'),
  website: Joi.string().uri().optional(),
  contact_email: Joi.string().email().optional(),
  contact_phone: Joi.string().max(20).optional(),
  authority_type: Joi.string().valid('regulatory', 'supervisory', 'enforcement', 'advisory').default('regulatory'),
  is_active: Joi.boolean().default(true)
});

/**
 * Assessment Response Schema
 */
const assessmentResponseSchema = Joi.object({
  assessment_id: Joi.string().uuid().required(),
  control_id: Joi.string().uuid().required(),
  response_value: Joi.string().valid('compliant', 'partially_compliant', 'non_compliant', 'not_applicable').required(),
  maturity_level: Joi.number().integer().min(0).max(5).optional(),
  implementation_status: Joi.string().valid('not_started', 'planned', 'in_progress', 'implemented', 'optimized').optional(),
  comments: Joi.string().max(2000).optional(),
  assessor_id: Joi.string().uuid().optional(),
  assessment_date: Joi.date().optional(),
  next_review_date: Joi.date().optional(),
  risk_rating: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  remediation_plan: Joi.string().max(1000).optional(),
  remediation_due_date: Joi.date().optional()
});

/**
 * Assessment Evidence Schema
 */
const assessmentEvidenceSchema = Joi.object({
  response_id: Joi.string().uuid().required(),
  evidence_type: Joi.string().valid('document', 'screenshot', 'video', 'link', 'other').required(),
  title: Joi.string().max(255).required(),
  description: Joi.string().max(1000).optional(),
  file_path: Joi.string().max(500).optional(),
  file_size: Joi.number().integer().min(0).optional(),
  file_type: Joi.string().max(100).optional(),
  external_url: Joi.string().uri().optional(),
  uploaded_by: Joi.string().uuid().optional(),
  upload_date: Joi.date().default('now'),
  is_confidential: Joi.boolean().default(false),
  retention_period: Joi.number().integer().min(0).optional()
});

/**
 * Password Change Schema
 */
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

/**
 * Password Reset Schema
 */
const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

/**
 * Admin password reset schema
 */
const passwordAdminResetSchema = Joi.object({
  newPassword: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

/**
 * Sanitize HTML content
 */
const sanitizeHtml = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  sanitizeInput,
  
  // Schemas
  uuidSchema,
  idParamSchema,
  paginationSchema,
  userRegistrationSchema,
  userFiltersSchema,
  userUpdateSchema,
  userRoleUpdateSchema,
  userLoginSchema,
  organizationSchema,
  assessmentSchema,
  frameworkSchema,
  controlSchema,
  regulatorSchema,
  assessmentResponseSchema,
  assessmentEvidenceSchema,
  passwordChangeSchema,
  passwordResetSchema,
  passwordAdminResetSchema
};




