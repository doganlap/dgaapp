const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireTenantAccess, requirePermission } = require('../middleware/rbac');
const documentProcessor = require('../services/documentProcessor');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads', req.user.tenant_id);
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types based on aa.ini specification
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/bmp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Security services for file uploads
const avScanner = require('../services/avScanner');
const secureStorage = require('../services/secureStorage');

/**
 * POST /api/documents/upload
 * Upload and process documents
 */
router.post('/upload', authenticateToken, requireTenantAccess, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }

    const { source = 'upload', metadata = '{}' } = req.body;
    let parsedMetadata = {};
    
    try {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    } catch (e) {
      console.warn('Invalid metadata JSON, using empty object');
    }

    const uploadResults = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Step 1: AV Scan the uploaded file
        console.log(`Starting AV scan for file: ${file.originalname}`);
        const scanResult = await avScanner.scanFile(file.path);
        
        // Log security event
        await query(`
          SELECT log_security_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          req.user.tenant_id,
          null, // document_id not yet created
          req.user.id,
          'av_scan',
          scanResult.clean ? 'success' : 'blocked',
          JSON.stringify({
            filename: file.originalname,
            scanResult,
            fileSize: file.size,
            mimeType: file.mimetype
          }),
          req.ip,
          req.get('User-Agent'),
          req.sessionID,
          scanResult.clean ? 'low' : 'high',
          JSON.stringify(scanResult.clean ? [] : [scanResult.threat])
        ]);
        
        if (!scanResult.clean) {
          console.warn(`File blocked by AV scan: ${file.originalname} - ${scanResult.threat}`);
          uploadResults.push({
            filename: file.originalname,
            error: `Security threat detected: ${scanResult.threat}`,
            status: 'blocked'
          });
          continue;
        }

        // Step 2: Store file securely
        console.log(`Storing file securely: ${file.originalname}`);
        const storageResult = await secureStorage.storeFile(file.path, req.user.tenant_id, {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedBy: req.user.id
        });

        // Step 3: Create document record with secure storage path
        const documentId = uuidv4();
        const documentResult = await query(`
          INSERT INTO documents (
            id, tenant_id, source, original_filename, mime_type, 
            file_size, raw_file_path, metadata, uploaded_by, status,
            security_scan_result, secure_storage_path, security_scan_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id, original_filename, status
        `, [
          documentId,
          req.user.tenant_id,
          source,
          file.originalname,
          file.mimetype,
          file.size,
          storageResult.securePath,
          JSON.stringify({
            ...parsedMetadata,
            scanResult,
            storageMetadata: storageResult.metadata
          }),
          req.user.id,
          'uploaded',
          JSON.stringify(scanResult),
          storageResult.securePath,
          new Date()
        ]);

        // Log successful storage event
        await query(`
          SELECT log_security_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          req.user.tenant_id,
          documentId,
          req.user.id,
          'secure_storage',
          'success',
          JSON.stringify({
            filename: file.originalname,
            securePath: storageResult.securePath,
            encrypted: true
          }),
          req.ip,
          req.get('User-Agent'),
          req.sessionID,
          'low',
          JSON.stringify([])
        ]);

        const document = documentResult.rows[0];

        // Start async processing
        setImmediate(async () => {
          try {
            await documentProcessor.processDocument(document.id, file.path);
          } catch (error) {
            console.error(`Background processing failed for ${document.id}:`, error);
          }
        });

        uploadResults.push({
          documentId: document.id,
          filename: document.original_filename,
          status: document.status,
          size: file.size,
          type: file.mimetype
        });

      } catch (error) {
        console.error(`Failed to process file ${file.originalname}:`, error);
        uploadResults.push({
          filename: file.originalname,
          error: error.message,
          status: 'failed'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${uploadResults.length} file(s) uploaded successfully`,
      data: {
        uploads: uploadResults,
        totalFiles: req.files.length,
        successCount: uploadResults.filter(r => !r.error).length,
        failureCount: uploadResults.filter(r => r.error).length
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

/**
 * GET /api/documents
 * Get documents for tenant with filtering and pagination
 */
router.get('/', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE tenant_id = $1';
    let params = [req.user.tenant_id];
    let paramCount = 1;

    // Add filters
    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (source) {
      paramCount++;
      whereClause += ` AND source = $${paramCount}`;
      params.push(source);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (original_filename ILIKE $${paramCount} OR extracted_text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get documents
    const documentsResult = await query(`
      SELECT 
        id, original_filename, mime_type, file_size, pages,
        language, status, source, metadata, created_at, processed_at,
        CASE 
          WHEN extracted_text IS NOT NULL THEN LEFT(extracted_text, 200) || '...'
          ELSE NULL 
        END as text_preview
      FROM documents
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM documents ${whereClause}
    `, params);

    // Get processing statistics
    const statsResult = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM documents 
      WHERE tenant_id = $1
      GROUP BY status
    `, [req.user.tenant_id]);

    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        documents: documentsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        },
        statistics: stats
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/:id
 * Get specific document details
 */
router.get('/:id', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name,
        (
          SELECT COUNT(*) 
          FROM document_chunks dc 
          WHERE dc.document_id = d.id
        ) as chunks_count,
        (
          SELECT COUNT(*) 
          FROM document_chunks dc 
          WHERE dc.document_id = d.id AND dc.embedding_vector_id IS NOT NULL
        ) as indexed_chunks_count
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1 AND d.tenant_id = $2
    `, [id, req.user.tenant_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const document = result.rows[0];

    // Get chunks if requested
    if (req.query.include_chunks === 'true') {
      const chunksResult = await query(`
        SELECT id, chunk_index, LEFT(text, 200) || '...' as text_preview, 
               token_count, embedding_model, embedding_created_at
        FROM document_chunks 
        WHERE document_id = $1 
        ORDER BY chunk_index
      `, [id]);

      document.chunks = chunksResult.rows;
    }

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document',
      message: error.message
    });
  }
});

/**
 * POST /api/documents/:id/reprocess
 * Reprocess a document
 */
router.post('/:id/reprocess', authenticateToken, requireTenantAccess, requirePermission('documents:update'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if document exists and belongs to tenant
    const documentResult = await query(`
      SELECT id, raw_file_path, original_filename 
      FROM documents 
      WHERE id = $1 AND tenant_id = $2
    `, [id, req.user.tenant_id]);

    if (documentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const document = documentResult.rows[0];

    // Delete existing chunks
    await query('DELETE FROM document_chunks WHERE document_id = $1', [id]);

    // Reset document status
    await query(`
      UPDATE documents 
      SET status = 'uploaded', processed_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Start reprocessing
    setImmediate(async () => {
      try {
        await documentProcessor.processDocument(id, document.raw_file_path);
      } catch (error) {
        console.error(`Reprocessing failed for ${id}:`, error);
      }
    });

    res.json({
      success: true,
      message: 'Document reprocessing started',
      data: {
        documentId: id,
        filename: document.original_filename,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('Reprocess document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reprocess document',
      message: error.message
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document and its chunks
 */
router.delete('/:id', authenticateToken, requireTenantAccess, requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Get document info
      const docResult = await client.query(`
        SELECT raw_file_path, processed_file_path 
        FROM documents 
        WHERE id = $1 AND tenant_id = $2
      `, [id, req.user.tenant_id]);

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const document = docResult.rows[0];

      // Delete chunks first (due to foreign key)
      await client.query('DELETE FROM document_chunks WHERE document_id = $1', [id]);

      // Delete document record
      await client.query('DELETE FROM documents WHERE id = $1', [id]);

      return document;
    });

    // Delete physical files (async, don't wait)
    setImmediate(async () => {
      try {
        if (result.raw_file_path) {
          await fs.unlink(result.raw_file_path).catch(() => {});
        }
        if (result.processed_file_path) {
          await fs.unlink(result.processed_file_path).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to delete physical files:', error);
      }
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/stats/processing
 * Get processing statistics for tenant
 */
router.get('/stats/processing', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const stats = await documentProcessor.getProcessingStats(req.user.tenant_id);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get processing stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch processing statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/secure/:token
 * Access file via signed URL
 */
router.get('/secure/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify signed URL
    const payload = secureStorage.verifySignedUrl(token);
    
    // Get document ID for logging
    const docResult = await query(`
      SELECT id FROM documents 
      WHERE secure_storage_path = $1 AND tenant_id = $2
    `, [payload.path, payload.tenant]);
    
    const documentId = docResult.rows[0]?.id;
    
    // Log file access attempt
    await query(`
      SELECT log_security_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      payload.tenant,
      documentId,
      null, // No authenticated user for signed URL access
      'file_access',
      'success',
      JSON.stringify({
        accessMethod: 'signed_url',
        path: payload.path,
        tokenExpiry: payload.exp
      }),
      req.ip,
      req.get('User-Agent'),
      null, // No session for signed URL
      'low',
      JSON.stringify([])
    ]);
    
    // Retrieve file from secure storage
    const fileResult = await secureStorage.retrieveFile(payload.path, payload.tenant);
    
    // Set appropriate headers
    res.setHeader('Content-Type', fileResult.metadata.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileResult.metadata.originalName}"`);
    res.setHeader('Cache-Control', 'private, no-cache');
    
    res.send(fileResult.data);
    
  } catch (error) {
    console.error('Secure file access error:', error);
    
    // Log failed access attempt
    try {
      const payload = secureStorage.verifySignedUrl(req.params.token);
      await query(`
        SELECT log_security_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        payload.tenant,
        null,
        null,
        'file_access',
        'failure',
        JSON.stringify({
          error: error.message,
          token: req.params.token.substring(0, 20) + '...'
        }),
        req.ip,
        req.get('User-Agent'),
        null,
        'medium',
        JSON.stringify(['unauthorized_access'])
      ]);
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }
    
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: error.message
    });
  }
});

/**
 * POST /api/documents/:id/generate-access-url
 * Generate signed URL for secure file access
 */
router.post('/:id/generate-access-url', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresIn = 3600 } = req.body; // Default 1 hour
    
    // Get document info
    const documentResult = await query(`
      SELECT secure_storage_path, original_filename 
      FROM documents 
      WHERE id = $1 AND tenant_id = $2
    `, [id, req.user.tenant_id]);
    
    if (documentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const document = documentResult.rows[0];
    
    if (!document.secure_storage_path) {
      return res.status(400).json({
        success: false,
        error: 'Document not stored in secure storage'
      });
    }
    
    // Generate signed URL
    const signedUrl = secureStorage.generateSignedUrl(
      document.secure_storage_path,
      req.user.tenant_id,
      expiresIn
    );
    
    res.json({
      success: true,
      data: {
        signedUrl,
        expiresIn,
        filename: document.original_filename
      }
    });
    
  } catch (error) {
    console.error('Generate access URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate access URL',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/security/dashboard
 * Get security dashboard data
 */
router.get('/security/dashboard', authenticateToken, requireTenantAccess, requirePermission('documents:read'), async (req, res) => {
  try {
    // Get security statistics
    const statsResult = await query(`
      SELECT * FROM get_security_stats($1)
    `, [req.user.tenant_id]);

    // Get recent security events
    const eventsResult = await query(`
      SELECT 
        event_type, event_status, event_details, risk_level,
        threat_indicators, created_at, ip_address
      FROM security_audit_log 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.tenant_id]);

    // Get security dashboard view
    const dashboardResult = await query(`
      SELECT * FROM security_dashboard WHERE tenant_id = $1
    `, [req.user.tenant_id]);

    // Get AV scanner stats
    const avStats = await avScanner.getScanStats();

    // Get secure storage stats
    const storageStats = await secureStorage.getStorageStats(req.user.tenant_id);

    res.json({
      success: true,
      data: {
        statistics: statsResult.rows[0] || {},
        dashboard: dashboardResult.rows[0] || {},
        recentEvents: eventsResult.rows,
        avScanner: avStats,
        secureStorage: storageStats
      }
    });

  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security dashboard',
      message: error.message
    });
  }
});

/**
 * POST /api/documents/search
 * Search documents by text content
 */
router.post('/search', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { query: searchQuery, limit = 10 } = req.body;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Use the database function for text search
    const result = await query(`
      SELECT * FROM search_documents_by_text($1, $2, $3)
    `, [req.user.tenant_id, searchQuery.trim(), limit]);

    res.json({
      success: true,
      data: {
        query: searchQuery,
        results: result.rows,
        count: result.rows.length
      }
    });

  } catch (error) {
    console.error('Document search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

module.exports = router;
