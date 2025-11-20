/**
 * Embedding Service - Basic implementation for RAG Service
 * Handles text to vector embeddings
 */

class EmbeddingService {
    constructor() {
        this.initialized = false;
        this.model = 'text-embedding-ada-002'; // Default model
    }

    async initialize() {
        try {
            console.log('[RAG Service] Initializing Embedding Service...');
            // In production, this would initialize OpenAI, Hugging Face, or other embedding services
            this.initialized = true;
            console.log('[RAG Service] Embedding Service initialized successfully');
            return true;
        } catch (error) {
            console.error('[RAG Service] Embedding Service initialization failed:', error.message);
            return false;
        }
    }

    async generateEmbedding(text) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Forward to BFF for real embedding generation
            const response = await fetch('http://localhost:3000/api/rag/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error(`BFF embedding request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.embedding;
        } catch (error) {
            console.error('[RAG Service] Error generating embedding:', error.message);
            return null;
        }
    }

    // Removed mock embedding generation - now forwards to BFF

    async generateBatchEmbeddings(texts) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const embeddings = [];
            for (const text of texts) {
                const embedding = await this.generateEmbedding(text);
                embeddings.push(embedding);
            }
            return embeddings;
        } catch (error) {
            console.error('[RAG Service] Error generating batch embeddings:', error.message);
            return [];
        }
    }

    getModelInfo() {
        return {
            model: this.model,
            dimension: 1536,
            initialized: this.initialized,
            type: 'bff-proxy' // Now forwards to BFF for real embeddings
        };
    }
}

module.exports = EmbeddingService;
