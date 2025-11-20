const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../data/rag-documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error('Error creating upload directory:', err);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

// Database queries for RAG operations

// Text extraction functions
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

async function extractTextFromDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw error;
  }
}

async function extractTextFromXlsx(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    let text = '';
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      text += xlsx.utils.sheet_to_txt(worksheet) + '\n';
    });
    return text;
  } catch (error) {
    console.error('Error extracting XLSX text:', error);
    throw error;
  }
}

// Utility function to chunk text
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  const words = text.split(' ');

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
  }

  return chunks;
}

// Database similarity search function
async function similaritySearch(query, limit = 5, minRelevance = 0.1) {
  try {
    const results = await query(`
      SELECT 
        rc.id,
        rc.document_id,
        rc.content,
        rc.page,
        rc.section,
        rc.metadata,
        rd.name as document_name,
        0.5 as relevance -- Placeholder relevance score
      FROM rag_chunks rc
      JOIN rag_documents rd ON rc.document_id = rd.id
      WHERE rc.content ILIKE $1
      AND rd.status = 'processed'
      ORDER BY relevance DESC
      LIMIT $2
    `, [`%${query}%`, limit]);

    return results;
  } catch (error) {
    console.error('Error in similarity search:', error);
    return [];
  }
}

// Routes

// Get RAG statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_documents,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_documents,
        SUM(chunks) as total_chunks,
        SUM(embeddings) as total_embeddings,
        COUNT(DISTINCT queries.id) as queries_processed
      FROM rag_documents rd
      LEFT JOIN rag_queries rq ON rd.id = rq.document_id
    `);

    res.json({
      success: true,
      data: stats[0] || {
        total_documents: 0,
        processed_documents: 0,
        processing_documents: 0,
        total_chunks: 0,
        total_embeddings: 0,
        queries_processed: 0
      }
    });
  } catch (error) {
    console.error('Error getting RAG stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get RAG statistics',
      error: error.message
    });
  }
});

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    params.push(limit, offset);

    const documents = await query(`
      SELECT 
        rd.*,
        COUNT(rc.id) as chunk_count,
        COUNT(rq.id) as query_count
      FROM rag_documents rd
      LEFT JOIN rag_chunks rc ON rd.id = rc.document_id
      LEFT JOIN rag_queries rq ON rd.id = rq.document_id
      ${whereClause}
      GROUP BY rd.id
      ORDER BY rd.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM rag_documents rd
      ${whereClause}
    `, params.slice(0, -2));

    res.json({
      success: true,
      data: documents,
      pagination: {
        total: parseInt(countResult[0]?.total || 0),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
      error: error.message
    });
  }
});

// Get document by ID
router.get('/documents/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await query(`
      SELECT 
        rd.*,
        COUNT(rc.id) as chunk_count,
        COUNT(rq.id) as query_count,
        json_agg(
          json_build_object(
            'id', rc.id,
            'content', rc.content,
            'page', rc.page,
            'section', rc.section,
            'metadata', rc.metadata
          ) ORDER BY rc.created_at
        ) FILTER (WHERE rc.id IS NOT NULL) as chunks
      FROM rag_documents rd
      LEFT JOIN rag_chunks rc ON rd.id = rc.document_id
      LEFT JOIN rag_queries rq ON rd.id = rq.document_id
      WHERE rd.id = $1
      GROUP BY rd.id
    `, [documentId]);

    if (!document || document.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document[0]
    });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document',
      error: error.message
    });
  }
});

// Upload and process document
router.post('/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    const ext = path.extname(originalname).toLowerCase();

    // Extract text based on file type
    let extractedText = '';
    try {
      switch (ext) {
        case '.pdf':
          extractedText = await extractTextFromPDF(filePath);
          break;
        case '.docx':
          extractedText = await extractTextFromDocx(filePath);
          break;
        case '.xlsx':
        case '.xls':
          extractedText = await extractTextFromXlsx(filePath);
          break;
        case '.txt':
          extractedText = await fs.readFile(filePath, 'utf8');
          break;
        default:
          throw new Error('Unsupported file type');
      }
    } catch (extractError) {
      console.error('Error extracting text:', extractError);
      // Clean up uploaded file
      await fs.unlink(filePath).catch(console.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to extract text from document',
        error: extractError.message
      });
    }

    // Chunk the text
    const chunks = chunkText(extractedText);

    // Create document record in database
    const documentResult = await query(`
      INSERT INTO rag_documents (name, type, size, status, chunks, embeddings, path, filename, uploaded)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `, [originalname, ext.substring(1).toUpperCase(), `${(size / 1024 / 1024).toFixed(1)} MB`, 'processed', chunks.length, chunks.length, filePath, filename]);

    const documentId = documentResult[0].id;

    // Store chunks in database
    for (let i = 0; i < chunks.length; i++) {
      await query(`
        INSERT INTO rag_chunks (document_id, content, chunk_index, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [documentId, chunks[i], i]);
    }

    res.json({
      success: true,
      message: 'Document uploaded and processed successfully',
      data: {
        id: documentId,
        name: originalname,
        type: ext.substring(1).toUpperCase(),
        size: `${(size / 1024 / 1024).toFixed(1)} MB`,
        status: 'processed',
        chunks: chunks.length,
        embeddings: chunks.length,
        path: filePath,
        filename
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// Delete document
router.delete('/documents/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // Get document details from database
    const documentResult = await query(`
      SELECT id, path, status, chunks, embeddings 
      FROM rag_documents 
      WHERE id = $1
    `, [documentId]);

    if (documentResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documentResult[0];

    // Delete file if it exists
    if (document.path && document.path !== '/mock/sama_framework.pdf') {
      try {
        await fs.unlink(document.path);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    // Delete chunks and document from database
    await query('DELETE FROM rag_chunks WHERE document_id = $1', [documentId]);
    await query('DELETE FROM rag_documents WHERE id = $1', [documentId]);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

// Query documents (RAG search)
router.post('/query', async (req, res) => {
  try {
    const { query, maxResults = 5, minRelevance = 0.1 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    // Perform similarity search
    const results = await similaritySearch(query, maxResults, minRelevance);

    // Format results
    const formattedResults = results.map(result => ({
      id: result.id,
      document: result.document_name,
      relevance: result.relevance,
      chunk: result.content,
      page: result.page,
      section: result.section,
      context: result.metadata?.context || 'General'
    }));

    // Log the query for analytics
    await query(`
      INSERT INTO rag_queries (query, response, relevance_score, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [query, JSON.stringify(formattedResults), formattedResults.length > 0 ? Math.max(...formattedResults.map(r => r.relevance)) : 0]);

    res.json({
      success: true,
      data: formattedResults,
      metadata: {
        query,
        totalResults: formattedResults.length,
        maxResults,
        minRelevance
      }
    });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process query',
      error: error.message
    });
  }
});

// Search endpoint (alias for query)
router.post('/search', (req, res) => {
  // Use the same logic as query endpoint
  const queryReq = { ...req, body: { query: req.body.query, ...req.body.filters } };
  return router.handle(queryReq, res);
});

// Get document chunks
router.get('/documents/:id/chunks', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const chunks = await query(`
      SELECT 
        rc.id,
        rc.content,
        rc.page,
        rc.section,
        rc.metadata,
        rc.created_at
      FROM rag_chunks rc
      WHERE rc.document_id = $1
      ORDER BY rc.created_at
    `, [documentId]);

    res.json({
      success: true,
      data: chunks
    });
  } catch (error) {
    console.error('Error getting document chunks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document chunks',
      error: error.message
    });
  }
});

// Get RAG settings from database
router.get('/settings', async (req, res) => {
  try {
    const settings = await query(`
      SELECT 
        model,
        max_results as "maxResults",
        min_relevance as "minRelevance",
        chunk_size as "chunkSize",
        chunk_overlap as "chunkOverlap",
        embedding_model as "embeddingModel",
        temperature
      FROM rag_settings
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const defaultSettings = {
      model: 'gpt-4',
      maxResults: 5,
      minRelevance: 0.7,
      chunkSize: 500,
      chunkOverlap: 50,
      embeddingModel: 'text-embedding-ada-002',
      temperature: 0.1
    };

    res.json({
      success: true,
      data: settings[0] || defaultSettings
    });
  } catch (error) {
    console.error('Error getting RAG settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get RAG settings',
      error: error.message
    });
  }
});

// Update RAG settings
router.put('/settings', async (req, res) => {
  try {
    const { model, maxResults, minRelevance, chunkSize, chunkOverlap, embeddingModel, temperature } = req.body;

    await query(`
      INSERT INTO rag_settings (
        model, max_results, min_relevance, chunk_size, 
        chunk_overlap, embedding_model, temperature, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
    `, [model, maxResults, minRelevance, chunkSize, chunkOverlap, embeddingModel, temperature]);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Error updating RAG settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update RAG settings',
      error: error.message
    });
  }
});

module.exports = router;
