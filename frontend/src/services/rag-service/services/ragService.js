const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAI } = require('openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const db = require('../config/database');

/**
 * Enterprise RAG (Retrieval Augmented Generation) Service
 * Provides intelligent document processing and Q&A capabilities
 */
class RAGService {
  constructor() {
    // Vector database client
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
    
    // OpenAI client for embeddings and completions
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Text splitter for chunking documents
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', '']
    });
    
    // Collection name for vector storage
    this.collectionName = 'grc_documents';
    
    this.initializeVectorDB();
  }
  
  /**
   * Initialize vector database collection
   */
  async initializeVectorDB() {
    try {
      // Check if collection exists
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        // Create collection with 1536-dimensional vectors (OpenAI ada-002)
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine'
          },
          optimizers_config: {
            default_segment_number: 2
          },
          replication_factor: 1
        });
        
        console.log(`✅ Created vector collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize vector DB:', error);
    }
  }
  
  /**
   * Process document and extract content
   */
  async processDocument(documentId, filePath, metadata = {}) {
    try {
      console.log(`📄 Processing document: ${documentId}`);
      
      // Extract text based on file type
      const text = await this.extractText(filePath, metadata.mimeType);
      
      if (!text || text.length < 50) {
        throw new Error('Document contains insufficient text content');
      }
      
      // Chunk the document
      const chunks = await this.chunkDocument(text);
      console.log(`📝 Created ${chunks.length} chunks from document`);
      
      // Generate embeddings for each chunk
      const embeddings = await this.generateEmbeddings(chunks);
      
      // Store vectors in Qdrant
      await this.storeVectors(documentId, chunks, embeddings, metadata);
      
      // Extract compliance insights
      const insights = await this.extractComplianceInsights(text, metadata);
      
      // Store document metadata in database
      await this.storeDocumentMetadata(documentId, {
        ...metadata,
        chunkCount: chunks.length,
        textLength: text.length,
        insights,
        processedAt: new Date().toISOString()
      });
      
      console.log(`✅ Successfully processed document: ${documentId}`);
      
      return {
        success: true,
        documentId,
        chunkCount: chunks.length,
        textLength: text.length,
        insights
      };
      
    } catch (error) {
      console.error(`❌ Error processing document ${documentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract text from various file formats
   */
  async extractText(filePath, mimeType) {
    const fs = require('fs');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    try {
      switch (mimeType) {
        case 'application/pdf':
          const pdfBuffer = fs.readFileSync(filePath);
          const pdfData = await pdf(pdfBuffer);
          return pdfData.text;
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          const docxBuffer = fs.readFileSync(filePath);
          const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
          return docxResult.value;
          
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          const workbook = xlsx.readFile(filePath);
          let excelText = '';
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            excelText += xlsx.utils.sheet_to_txt(sheet) + '\n';
          });
          return excelText;
          
        case 'text/plain':
        case 'text/csv':
          return fs.readFileSync(filePath, 'utf8');
          
        default:
          // Try to read as text
          return fs.readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      console.error(`Error extracting text from ${filePath}:`, error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }
  
  /**
   * Chunk document into smaller segments
   */
  async chunkDocument(text) {
    try {
      const chunks = await this.textSplitter.splitText(text);
      
      // Filter out very short chunks
      return chunks.filter(chunk => chunk.trim().length > 50);
    } catch (error) {
      console.error('Error chunking document:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for text chunks
   */
  async generateEmbeddings(chunks) {
    try {
      const embeddings = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: batch
        });
        
        embeddings.push(...response.data.map(item => item.embedding));
        
        // Small delay to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
  
  /**
   * Store vectors in Qdrant
   */
  async storeVectors(documentId, chunks, embeddings, metadata) {
    try {
      const points = chunks.map((chunk, index) => ({
        id: `${documentId}_chunk_${index}`,
        vector: embeddings[index],
        payload: {
          documentId,
          chunkIndex: index,
          text: chunk,
          metadata: {
            ...metadata,
            chunkLength: chunk.length,
            createdAt: new Date().toISOString()
          }
        }
      }));
      
      await this.qdrant.upsert(this.collectionName, {
        wait: true,
        points
      });
      
      console.log(`📊 Stored ${points.length} vectors for document ${documentId}`);
    } catch (error) {
      console.error('Error storing vectors:', error);
      throw error;
    }
  }
  
  /**
   * Extract compliance insights from document
   */
  async extractComplianceInsights(text, metadata) {
    try {
      const prompt = `
Analyze the following document and extract compliance-related insights:

Document Type: ${metadata.documentType || 'Unknown'}
Sector: ${metadata.sector || 'Unknown'}

Document Content:
${text.substring(0, 4000)}...

Please identify:
1. Regulatory frameworks mentioned
2. Compliance requirements
3. Controls or safeguards described
4. Risk factors identified
5. Implementation recommendations

Provide a structured JSON response with these insights.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a GRC (Governance, Risk, and Compliance) expert. Analyze documents and extract compliance insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });
      
      const insightsText = response.choices[0].message.content;
      
      try {
        return JSON.parse(insightsText);
      } catch (parseError) {
        // If JSON parsing fails, return structured text
        return {
          rawInsights: insightsText,
          extractedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error extracting compliance insights:', error);
      return {
        error: 'Failed to extract insights',
        message: error.message
      };
    }
  }
  
  /**
   * Answer questions using RAG
   */
  async answerQuestion(question, tenantId, options = {}) {
    try {
      console.log(`❓ Answering question for tenant ${tenantId}: ${question}`);
      
      // Generate embedding for the question
      const questionEmbedding = await this.generateEmbedding(question);
      
      // Search for similar documents
      const searchResults = await this.vectorSearch(questionEmbedding, tenantId, options);
      
      if (searchResults.length === 0) {
        return {
          answer: 'I could not find relevant information in your documents to answer this question.',
          sources: [],
          confidence: 0
        };
      }
      
      // Generate contextual answer
      const answer = await this.generateAnswer(question, searchResults);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(answer, searchResults);
      
      return {
        answer: answer.content,
        sources: searchResults.map(result => ({
          documentId: result.payload.documentId,
          chunkIndex: result.payload.chunkIndex,
          score: result.score,
          text: result.payload.text.substring(0, 200) + '...'
        })),
        confidence,
        usage: answer.usage
      };
      
    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  }
  
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
  
  /**
   * Search vectors for similar content
   */
  async vectorSearch(queryEmbedding, tenantId, options = {}) {
    try {
      const searchParams = {
        vector: queryEmbedding,
        limit: options.limit || 5,
        score_threshold: options.scoreThreshold || 0.7
      };
      
      // Add tenant filter if specified
      if (tenantId) {
        searchParams.filter = {
          must: [
            {
              key: 'metadata.tenantId',
              match: { value: tenantId }
            }
          ]
        };
      }
      
      const searchResult = await this.qdrant.search(this.collectionName, searchParams);
      
      return searchResult;
    } catch (error) {
      console.error('Error in vector search:', error);
      throw error;
    }
  }
  
  /**
   * Generate answer using retrieved context
   */
  async generateAnswer(question, searchResults) {
    try {
      const context = searchResults
        .map(result => result.payload.text)
        .join('\n\n');
      
      const prompt = `
Based on the following context from compliance documents, please answer the question.

Context:
${context}

Question: ${question}

Please provide a comprehensive answer based on the context. If the context doesn't contain enough information, please indicate that clearly.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a GRC (Governance, Risk, and Compliance) expert. Provide accurate, helpful answers based on the provided context from compliance documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });
      
      return {
        content: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      console.error('Error generating answer:', error);
      throw error;
    }
  }
  
  /**
   * Calculate confidence score for the answer
   */
  calculateConfidence(answer, searchResults) {
    if (!searchResults || searchResults.length === 0) {
      return 0;
    }
    
    // Base confidence on search result scores
    const avgScore = searchResults.reduce((sum, result) => sum + result.score, 0) / searchResults.length;
    
    // Adjust based on number of results
    const resultCountFactor = Math.min(searchResults.length / 3, 1);
    
    // Adjust based on answer length (longer answers might be more comprehensive)
    const answerLengthFactor = Math.min(answer.content.length / 500, 1);
    
    return Math.round((avgScore * 0.6 + resultCountFactor * 0.2 + answerLengthFactor * 0.2) * 100);
  }
  
  /**
   * Store document metadata in database
   */
  async storeDocumentMetadata(documentId, metadata) {
    try {
      const query = `
        INSERT INTO rag_documents (document_id, metadata, processed_at, tenant_id)
        VALUES (?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
        metadata = VALUES(metadata),
        processed_at = VALUES(processed_at)
      `;
      
      await db.execute(query, [
        documentId,
        JSON.stringify(metadata),
        metadata.tenantId || null
      ]);
    } catch (error) {
      console.error('Error storing document metadata:', error);
      // Don't throw - this is not critical for the main process
    }
  }
  
  /**
   * Delete document from vector database and metadata
   */
  async deleteDocument(documentId) {
    try {
      // Delete vectors from Qdrant
      await this.qdrant.delete(this.collectionName, {
        filter: {
          must: [
            {
              key: 'documentId',
              match: { value: documentId }
            }
          ]
        }
      });
      
      // Delete metadata from database
      const query = 'DELETE FROM rag_documents WHERE document_id = ?';
      await db.execute(query, [documentId]);
      
      console.log(`🗑️ Deleted document ${documentId} from RAG system`);
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting document ${documentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get document statistics
   */
  async getDocumentStats(tenantId) {
    try {
      const [dbStats] = await db.execute(
        'SELECT COUNT(*) as document_count, AVG(JSON_LENGTH(metadata)) as avg_metadata_size FROM rag_documents WHERE tenant_id = ? OR tenant_id IS NULL',
        [tenantId]
      );
      
      const collectionInfo = await this.qdrant.getCollection(this.collectionName);
      
      return {
        documentCount: dbStats[0].document_count,
        vectorCount: collectionInfo.points_count,
        avgMetadataSize: dbStats[0].avg_metadata_size,
        collectionSize: collectionInfo.vectors_count
      };
    } catch (error) {
      console.error('Error getting document stats:', error);
      throw error;
    }
  }
}

module.exports = RAGService;
