/**
 * Vector Store Service - Basic implementation for RAG Service
 * Handles vector storage and similarity search operations
 */

class VectorStore {
    constructor() {
        this.vectors = new Map(); // In-memory storage for development
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('[RAG Service] Initializing Vector Store...');
            // In production, this would connect to a vector database like Qdrant, Pinecone, etc.
            this.initialized = true;
            console.log('[RAG Service] Vector Store initialized successfully');
            return true;
        } catch (error) {
            console.error('[RAG Service] Vector Store initialization failed:', error.message);
            return false;
        }
    }

    async addVector(id, vector, metadata = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            this.vectors.set(id, {
                vector,
                metadata,
                timestamp: new Date()
            });
            return true;
        } catch (error) {
            console.error('[RAG Service] Error adding vector:', error.message);
            return false;
        }
    }

    async searchSimilar(queryVector, limit = 10) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Basic similarity search (cosine similarity)
            const results = [];
            
            for (const [id, data] of this.vectors.entries()) {
                const similarity = this.cosineSimilarity(queryVector, data.vector);
                results.push({
                    id,
                    similarity,
                    metadata: data.metadata
                });
            }

            // Sort by similarity and return top results
            return results
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        } catch (error) {
            console.error('[RAG Service] Error searching vectors:', error.message);
            return [];
        }
    }

    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async deleteVector(id) {
        if (!this.initialized) {
            await this.initialize();
        }

        return this.vectors.delete(id);
    }

    async getStats() {
        return {
            totalVectors: this.vectors.size,
            initialized: this.initialized,
            type: 'in-memory'
        };
    }
}

module.exports = VectorStore;
