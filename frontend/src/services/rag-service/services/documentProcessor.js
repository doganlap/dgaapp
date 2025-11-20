/**
 * Document Processor Service - Basic implementation for RAG Service
 * Handles document processing and chunking
 */

class DocumentProcessor {
    constructor() {
        this.initialized = false;
        this.chunkSize = 1000; // Default chunk size
        this.chunkOverlap = 200; // Default overlap
    }

    async initialize() {
        try {
            console.log('[RAG Service] Initializing Document Processor...');
            this.initialized = true;
            console.log('[RAG Service] Document Processor initialized successfully');
            return true;
        } catch (error) {
            console.error('[RAG Service] Document Processor initialization failed:', error.message);
            return false;
        }
    }

    async processDocument(document) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const chunks = this.chunkText(document.content);
            return {
                id: document.id,
                title: document.title || 'Untitled',
                chunks: chunks.map((chunk, index) => ({
                    id: `${document.id}_chunk_${index}`,
                    content: chunk,
                    metadata: {
                        documentId: document.id,
                        chunkIndex: index,
                        title: document.title,
                        type: document.type || 'text'
                    }
                }))
            };
        } catch (error) {
            console.error('[RAG Service] Error processing document:', error.message);
            return null;
        }
    }

    chunkText(text, chunkSize = this.chunkSize, overlap = this.chunkOverlap) {
        if (!text || text.length === 0) {
            return [];
        }

        const chunks = [];
        let start = 0;

        while (start < text.length) {
            let end = start + chunkSize;
            
            // If we're not at the end, try to break at a sentence or word boundary
            if (end < text.length) {
                const sentenceEnd = text.lastIndexOf('.', end);
                const wordEnd = text.lastIndexOf(' ', end);
                
                if (sentenceEnd > start + chunkSize * 0.5) {
                    end = sentenceEnd + 1;
                } else if (wordEnd > start + chunkSize * 0.5) {
                    end = wordEnd;
                }
            }

            chunks.push(text.slice(start, end).trim());
            start = end - overlap;
        }

        return chunks.filter(chunk => chunk.length > 0);
    }

    async processBatch(documents) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const processedDocuments = [];
            for (const document of documents) {
                const processed = await this.processDocument(document);
                if (processed) {
                    processedDocuments.push(processed);
                }
            }
            return processedDocuments;
        } catch (error) {
            console.error('[RAG Service] Error processing document batch:', error.message);
            return [];
        }
    }

    extractMetadata(document) {
        return {
            id: document.id,
            title: document.title || 'Untitled',
            type: document.type || 'text',
            length: document.content ? document.content.length : 0,
            processedAt: new Date().toISOString()
        };
    }

    getProcessorInfo() {
        return {
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
            initialized: this.initialized,
            type: 'basic-text-processor'
        };
    }
}

module.exports = DocumentProcessor;
