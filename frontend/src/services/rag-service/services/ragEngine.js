const axios = require('axios');
const _ = require('lodash');
const { query } = require('../config/database');

/**
 * Advanced RAG (Retrieval Augmented Generation) Engine
 * Combines vector search, hybrid retrieval, and LLM generation
 * for intelligent document analysis and question answering
 */
class RAGEngine {
  constructor(vectorStore, embeddingService, queryProcessor) {
    this.vectorStore = vectorStore;
    this.embeddingService = embeddingService;
    this.queryProcessor = queryProcessor;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      maxContextLength: 8000,
      topK: 10,
      hybridAlpha: 0.7, // Weight for vector search vs lexical search
      rerankerThreshold: 0.5,
      cacheEnabled: true,
      cacheTTL: 3600 // 1 hour
    };
    
    // LLM providers
    this.llmProviders = {
      openai: null,
      cohere: null,
      huggingface: null
    };
    
    // Response cache
    this.responseCache = new Map();
  }

  /**
   * Initialize the RAG engine
   */
  async initialize() {
    try {
      console.log('🧠 Initializing RAG Engine...');
      
      // Initialize LLM providers
      await this.initializeLLMProviders();
      
      // Load system prompts
      await this.loadSystemPrompts();
      
      // Initialize query cache
      this.initializeCache();
      
      this.isInitialized = true;
      console.log('✅ RAG Engine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RAG Engine:', error);
      throw error;
    }
  }

  /**
   * Initialize LLM providers based on available API keys
   */
  async initializeLLMProviders() {
    try {
      // OpenAI
      if (process.env.OPENAI_API_KEY) {
        const { OpenAI } = require('openai');
        this.llmProviders.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI provider initialized');
      }

      // Cohere
      if (process.env.COHERE_API_KEY) {
        const { CohereClient } = require('cohere-ai');
        this.llmProviders.cohere = new CohereClient({
          token: process.env.COHERE_API_KEY
        });
        console.log('✅ Cohere provider initialized');
      }

      // Hugging Face
      if (process.env.HUGGINGFACE_API_KEY) {
        const { HfInference } = require('@huggingface/inference');
        this.llmProviders.huggingface = new HfInference(process.env.HUGGINGFACE_API_KEY);
        console.log('✅ Hugging Face provider initialized');
      }

      if (!this.llmProviders.openai && !this.llmProviders.cohere && !this.llmProviders.huggingface) {
        console.warn('⚠️ No LLM providers configured. RAG will work in retrieval-only mode.');
      }
    } catch (error) {
      console.error('❌ Error initializing LLM providers:', error);
    }
  }

  /**
   * Load system prompts for different use cases
   */
  async loadSystemPrompts() {
    this.systemPrompts = {
      grcAnalysis: `You are an expert GRC (Governance, Risk & Compliance) analyst. 
        Analyze the provided documents and answer questions with precise, actionable insights.
        Focus on compliance requirements, risk assessments, and regulatory frameworks.
        Always cite specific sections from the documents when making recommendations.`,
      
      assessmentGeneration: `You are a compliance assessment specialist.
        Generate comprehensive assessment questions and controls based on the provided frameworks and documents.
        Ensure questions are specific, measurable, and aligned with regulatory requirements.`,
      
      riskAnalysis: `You are a risk management expert.
        Analyze documents for potential risks, vulnerabilities, and compliance gaps.
        Provide risk ratings, impact assessments, and mitigation strategies.`,
      
      documentSummary: `You are a document analysis expert.
        Summarize key compliance-related information from documents.
        Extract important dates, requirements, controls, and action items.`,
      
      regulatoryMapping: `You are a regulatory compliance expert.
        Map document content to relevant regulatory frameworks and standards.
        Identify applicable regulations, compliance requirements, and implementation guidelines.`
    };
  }

  /**
   * Initialize response cache
   */
  initializeCache() {
    if (this.config.cacheEnabled) {
      // Clear expired cache entries every hour
      setInterval(() => {
        this.cleanupCache();
      }, 3600000);
    }
  }

  /**
   * Main RAG query method - combines retrieval and generation
   */
  async query(question, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('RAG Engine not initialized');
      }

      const tenantId = options.tenantId;
      if (!tenantId) {
        throw new Error('Tenant ID required for RAG queries');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(question, options);
      if (this.config.cacheEnabled && this.responseCache.has(cacheKey)) {
        const cached = this.responseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cacheTTL * 1000) {
          console.log('📋 Returning cached response');
          return cached.response;
        }
      }

      // Process and expand the query
      const processedQuery = await this.queryProcessor.processQuery(question, options);

      // Perform hybrid retrieval
      const retrievalResults = await this.hybridRetrieval(processedQuery, tenantId, options);

      // Generate response using LLM
      const response = await this.generateResponse(question, retrievalResults, options);

      // Cache the response
      if (this.config.cacheEnabled) {
        this.responseCache.set(cacheKey, {
          response,
          timestamp: Date.now()
        });
      }

      // Log the query for analytics
      await this.logQuery(question, response, tenantId, options);

      return response;
    } catch (error) {
      console.error('❌ Error in RAG query:', error);
      throw error;
    }
  }

  /**
   * Hybrid retrieval combining vector search and lexical search
   */
  async hybridRetrieval(processedQuery, tenantId, options = {}) {
    try {
      const topK = options.topK || this.config.topK;
      
      // Vector search
      const vectorResults = await this.vectorStore.search(
        processedQuery.embedding,
        tenantId,
        { topK: Math.ceil(topK * 1.5) }
      );

      // Lexical search (if available)
      let lexicalResults = [];
      try {
        lexicalResults = await this.lexicalSearch(processedQuery.text, tenantId, {
          topK: Math.ceil(topK * 1.5)
        });
      } catch (error) {
        console.warn('⚠️ Lexical search not available, using vector search only');
      }

      // Combine and rerank results
      const combinedResults = await this.combineAndRerank(
        vectorResults,
        lexicalResults,
        processedQuery,
        options
      );

      // Filter by relevance threshold
      const filteredResults = combinedResults.filter(
        result => result.score >= (options.threshold || this.config.rerankerThreshold)
      );

      return filteredResults.slice(0, topK);
    } catch (error) {
      console.error('❌ Error in hybrid retrieval:', error);
      throw error;
    }
  }

  /**
   * Lexical search using Elasticsearch or database full-text search
   */
  async lexicalSearch(queryText, tenantId, options = {}) {
    try {
      // Use PostgreSQL full-text search as fallback
      const result = await query(`
        SELECT 
          dc.id,
          dc.document_id,
          dc.chunk_text,
          dc.page_start,
          dc.page_end,
          dc.metadata,
          d.original_filename,
          d.mime_type,
          ts_rank(dc.search_vector, plainto_tsquery($1)) as rank
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.tenant_id = $2
          AND dc.search_vector @@ plainto_tsquery($3)
        ORDER BY rank DESC
        LIMIT $4
      `, [queryText, tenantId, queryText, options.topK || 10]);

      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        text: row.chunk_text,
        score: parseFloat(row.rank),
        metadata: {
          ...row.metadata,
          filename: row.original_filename,
          mimeType: row.mime_type,
          pageStart: row.page_start,
          pageEnd: row.page_end
        },
        source: 'lexical'
      }));
    } catch (error) {
      console.error('❌ Error in lexical search:', error);
      return [];
    }
  }

  /**
   * Combine vector and lexical results and rerank them
   */
  async combineAndRerank(vectorResults, lexicalResults, processedQuery, options = {}) {
    try {
      // Normalize scores to 0-1 range
      const normalizedVector = this.normalizeScores(vectorResults, 'vector');
      const normalizedLexical = this.normalizeScores(lexicalResults, 'lexical');

      // Combine results
      const combinedMap = new Map();

      // Add vector results
      normalizedVector.forEach(result => {
        combinedMap.set(result.id, {
          ...result,
          vectorScore: result.score,
          lexicalScore: 0,
          combinedScore: result.score * this.config.hybridAlpha
        });
      });

      // Add lexical results
      normalizedLexical.forEach(result => {
        if (combinedMap.has(result.id)) {
          const existing = combinedMap.get(result.id);
          existing.lexicalScore = result.score;
          existing.combinedScore = 
            existing.vectorScore * this.config.hybridAlpha + 
            result.score * (1 - this.config.hybridAlpha);
        } else {
          combinedMap.set(result.id, {
            ...result,
            vectorScore: 0,
            lexicalScore: result.score,
            combinedScore: result.score * (1 - this.config.hybridAlpha)
          });
        }
      });

      // Convert to array and sort by combined score
      const combined = Array.from(combinedMap.values())
        .sort((a, b) => b.combinedScore - a.combinedScore);

      // Apply cross-encoder reranking if available
      if (options.useReranker !== false) {
        return await this.crossEncoderRerank(combined, processedQuery.text);
      }

      return combined;
    } catch (error) {
      console.error('❌ Error combining and reranking results:', error);
      return vectorResults; // Fallback to vector results only
    }
  }

  /**
   * Normalize scores to 0-1 range
   */
  normalizeScores(results, source) {
    if (results.length === 0) return results;

    const scores = results.map(r => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore;

    if (range === 0) {
      return results.map(r => ({ ...r, score: 1.0, source }));
    }

    return results.map(r => ({
      ...r,
      score: (r.score - minScore) / range,
      source
    }));
  }

  /**
   * Cross-encoder reranking for better relevance
   */
  async crossEncoderRerank(results, query) {
    try {
      // For now, use a simple heuristic reranking
      // In production, you would use a cross-encoder model
      return results.map(result => {
        let rerankScore = result.combinedScore;

        // Boost results with query terms in title/filename
        const filename = result.metadata?.filename?.toLowerCase() || '';
        const queryTerms = query.toLowerCase().split(' ');
        const termMatches = queryTerms.filter(term => 
          filename.includes(term) || result.text.toLowerCase().includes(term)
        ).length;
        
        rerankScore += (termMatches / queryTerms.length) * 0.1;

        // Boost recent documents
        if (result.metadata?.created_at) {
          const daysSinceCreation = (Date.now() - new Date(result.metadata.created_at)) / (1000 * 60 * 60 * 24);
          if (daysSinceCreation < 30) {
            rerankScore += 0.05; // Boost recent documents
          }
        }

        return {
          ...result,
          score: Math.min(1.0, rerankScore)
        };
      }).sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('❌ Error in cross-encoder reranking:', error);
      return results;
    }
  }

  /**
   * Generate response using LLM
   */
  async generateResponse(question, retrievalResults, options = {}) {
    try {
      if (retrievalResults.length === 0) {
        return {
          answer: "I couldn't find relevant information in the documents to answer your question. Please try rephrasing your question or ensure the relevant documents are uploaded.",
          confidence: 0,
          sources: [],
          metadata: {
            retrievalCount: 0,
            model: 'none'
          }
        };
      }

      // Prepare context from retrieval results
      const context = this.prepareContext(retrievalResults);
      
      // Select appropriate system prompt
      const systemPrompt = this.selectSystemPrompt(options.taskType || 'grcAnalysis');
      
      // Generate response using available LLM
      const llmResponse = await this.callLLM(question, context, systemPrompt, options);
      
      return {
        answer: llmResponse.text,
        confidence: this.calculateConfidence(llmResponse, retrievalResults),
        sources: this.extractSources(retrievalResults),
        metadata: {
          retrievalCount: retrievalResults.length,
          model: llmResponse.model,
          tokens: llmResponse.tokens,
          processingTime: llmResponse.processingTime
        }
      };
    } catch (error) {
      console.error('❌ Error generating response:', error);
      
      // Fallback: return summarized retrieval results
      return {
        answer: this.generateFallbackResponse(retrievalResults, question),
        confidence: 0.3,
        sources: this.extractSources(retrievalResults),
        metadata: {
          retrievalCount: retrievalResults.length,
          model: 'fallback',
          error: error.message
        }
      };
    }
  }

  /**
   * Prepare context from retrieval results
   */
  prepareContext(retrievalResults) {
    let context = '';
    let currentLength = 0;
    const maxLength = this.config.maxContextLength;

    for (const result of retrievalResults) {
      const chunk = `Document: ${result.metadata?.filename || 'Unknown'}\n` +
                   `Content: ${result.text}\n` +
                   `Page: ${result.metadata?.pageStart || 'N/A'}\n\n`;
      
      if (currentLength + chunk.length > maxLength) {
        break;
      }
      
      context += chunk;
      currentLength += chunk.length;
    }

    return context;
  }

  /**
   * Select appropriate system prompt based on task type
   */
  selectSystemPrompt(taskType) {
    return this.systemPrompts[taskType] || this.systemPrompts.grcAnalysis;
  }

  /**
   * Call LLM with context and question
   */
  async callLLM(question, context, systemPrompt, options = {}) {
    const startTime = Date.now();
    
    try {
      // Try OpenAI first
      if (this.llmProviders.openai) {
        const response = await this.llmProviders.openai.chat.completions.create({
          model: options.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
          ],
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.3
        });

        return {
          text: response.choices[0].message.content,
          model: response.model,
          tokens: response.usage.total_tokens,
          processingTime: Date.now() - startTime
        };
      }

      // Try Cohere
      if (this.llmProviders.cohere) {
        const response = await this.llmProviders.cohere.generate({
          prompt: `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.3
        });

        return {
          text: response.generations[0].text,
          model: 'cohere',
          tokens: response.meta?.billed_units?.output_tokens || 0,
          processingTime: Date.now() - startTime
        };
      }

      // Try Hugging Face
      if (this.llmProviders.huggingface) {
        const response = await this.llmProviders.huggingface.textGeneration({
          model: options.model || 'microsoft/DialoGPT-medium',
          inputs: `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`,
          parameters: {
            max_new_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.3
          }
        });

        return {
          text: response.generated_text,
          model: 'huggingface',
          tokens: 0,
          processingTime: Date.now() - startTime
        };
      }

      throw new Error('No LLM providers available');
    } catch (error) {
      console.error('❌ Error calling LLM:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for the response
   */
  calculateConfidence(llmResponse, retrievalResults) {
    let confidence = 0.5; // Base confidence

    // Factor in retrieval quality
    if (retrievalResults.length > 0) {
      const avgRetrievalScore = _.mean(retrievalResults.map(r => r.score));
      confidence += avgRetrievalScore * 0.3;
    }

    // Factor in response length (longer responses often more comprehensive)
    const responseLength = llmResponse.text.length;
    if (responseLength > 100) {
      confidence += Math.min(0.2, responseLength / 1000);
    }

    // Factor in specific domain terms
    const grcTerms = ['compliance', 'risk', 'control', 'audit', 'regulation', 'framework'];
    const termCount = grcTerms.filter(term => 
      llmResponse.text.toLowerCase().includes(term)
    ).length;
    confidence += (termCount / grcTerms.length) * 0.1;

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Extract source information from retrieval results
   */
  extractSources(retrievalResults) {
    return retrievalResults.map(result => ({
      documentId: result.documentId,
      filename: result.metadata?.filename,
      page: result.metadata?.pageStart,
      score: result.score,
      excerpt: result.text.substring(0, 200) + '...'
    }));
  }

  /**
   * Generate fallback response when LLM is not available
   */
  generateFallbackResponse(retrievalResults, question) {
    if (retrievalResults.length === 0) {
      return "No relevant documents found for your question.";
    }

    const topResult = retrievalResults[0];
    return `Based on the document "${topResult.metadata?.filename}", here's relevant information:\n\n` +
           `${topResult.text.substring(0, 500)}...\n\n` +
           `This information was found on page ${topResult.metadata?.pageStart || 'N/A'}.`;
  }

  /**
   * Generate cache key for responses
   */
  generateCacheKey(question, options) {
    const keyData = {
      question: question.toLowerCase().trim(),
      tenantId: options.tenantId,
      taskType: options.taskType || 'grcAnalysis'
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const ttlMs = this.config.cacheTTL * 1000;
    
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > ttlMs) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Log query for analytics
   */
  async logQuery(question, response, tenantId, options) {
    try {
      await query(`
        INSERT INTO rag_query_log (
          id, tenant_id, question, response_preview, confidence, 
          source_count, model_used, processing_time, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `, [
        require('uuid').v4(),
        tenantId,
        question,
        response.answer.substring(0, 500),
        response.confidence,
        response.sources.length,
        response.metadata.model,
        response.metadata.processingTime
      ]);
    } catch (error) {
      console.error('❌ Error logging query:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Batch process documents for embedding
   */
  async batchProcessDocuments(documentIds, tenantId) {
    try {
      console.log(`📚 Starting batch processing of ${documentIds.length} documents...`);
      
      const results = [];
      for (const docId of documentIds) {
        try {
          const result = await this.processDocumentForRAG(docId, tenantId);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error processing document ${docId}:`, error);
          results.push({ documentId: docId, success: false, error: error.message });
        }
      }
      
      console.log(`✅ Batch processing completed: ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;
    } catch (error) {
      console.error('❌ Error in batch processing:', error);
      throw error;
    }
  }

  /**
   * Process single document for RAG
   */
  async processDocumentForRAG(documentId, tenantId) {
    try {
      // Get document chunks
      const chunksResult = await query(`
        SELECT id, chunk_text, page_start, page_end, metadata
        FROM document_chunks
        WHERE document_id = $1
        ORDER BY chunk_index
      `, [documentId]);

      if (chunksResult.rows.length === 0) {
        throw new Error('No chunks found for document');
      }

      // Generate embeddings for chunks
      const embeddings = await this.embeddingService.generateEmbeddings(
        chunksResult.rows.map(chunk => chunk.chunk_text)
      );

      // Store in vector database
      await this.vectorStore.upsertChunks(
        chunksResult.rows.map((chunk, index) => ({
          id: chunk.id,
          documentId: documentId,
          text: chunk.chunk_text,
          embedding: embeddings[index],
          metadata: {
            ...chunk.metadata,
            pageStart: chunk.page_start,
            pageEnd: chunk.page_end,
            tenantId: tenantId
          }
        }))
      );

      return {
        documentId,
        success: true,
        chunksProcessed: chunksResult.rows.length
      };
    } catch (error) {
      console.error(`❌ Error processing document ${documentId} for RAG:`, error);
      throw error;
    }
  }
}

module.exports = RAGEngine;
