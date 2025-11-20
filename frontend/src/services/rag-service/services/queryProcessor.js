/**
 * Query Processor Service - Basic implementation for RAG Service
 * Handles query processing and optimization
 */

class QueryProcessor {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('[RAG Service] Initializing Query Processor...');
            this.initialized = true;
            console.log('[RAG Service] Query Processor initialized successfully');
            return true;
        } catch (error) {
            console.error('[RAG Service] Query Processor initialization failed:', error.message);
            return false;
        }
    }

    async processQuery(query) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            return {
                original: query,
                processed: this.cleanQuery(query),
                keywords: this.extractKeywords(query),
                intent: this.detectIntent(query),
                metadata: {
                    length: query.length,
                    processedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('[RAG Service] Error processing query:', error.message);
            return null;
        }
    }

    cleanQuery(query) {
        if (!query) return '';
        
        return query
            .trim()
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    extractKeywords(query) {
        if (!query) return [];

        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        ]);

        return query
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    }

    detectIntent(query) {
        if (!query) return 'unknown';

        const lowerQuery = query.toLowerCase();

        // Simple intent detection based on keywords
        if (lowerQuery.includes('what') || lowerQuery.includes('define') || lowerQuery.includes('meaning')) {
            return 'definition';
        }
        if (lowerQuery.includes('how') || lowerQuery.includes('steps') || lowerQuery.includes('process')) {
            return 'procedure';
        }
        if (lowerQuery.includes('why') || lowerQuery.includes('reason') || lowerQuery.includes('cause')) {
            return 'explanation';
        }
        if (lowerQuery.includes('when') || lowerQuery.includes('time') || lowerQuery.includes('date')) {
            return 'temporal';
        }
        if (lowerQuery.includes('where') || lowerQuery.includes('location') || lowerQuery.includes('place')) {
            return 'location';
        }
        if (lowerQuery.includes('compliance') || lowerQuery.includes('regulation') || lowerQuery.includes('standard')) {
            return 'compliance';
        }
        if (lowerQuery.includes('risk') || lowerQuery.includes('threat') || lowerQuery.includes('vulnerability')) {
            return 'risk';
        }

        return 'general';
    }

    async expandQuery(query) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const processed = await this.processQuery(query);
            
            // Simple query expansion with synonyms
            const synonyms = {
                'compliance': ['regulatory', 'standard', 'requirement', 'guideline'],
                'risk': ['threat', 'vulnerability', 'danger', 'hazard'],
                'security': ['protection', 'safety', 'defense', 'safeguard'],
                'assessment': ['evaluation', 'review', 'analysis', 'audit'],
                'framework': ['standard', 'guideline', 'methodology', 'approach']
            };

            let expandedQuery = processed.processed;
            
            for (const [term, syns] of Object.entries(synonyms)) {
                if (expandedQuery.includes(term)) {
                    expandedQuery += ' ' + syns.join(' ');
                }
            }

            return {
                ...processed,
                expanded: expandedQuery,
                synonymsAdded: true
            };
        } catch (error) {
            console.error('[RAG Service] Error expanding query:', error.message);
            return null;
        }
    }

    getProcessorInfo() {
        return {
            initialized: this.initialized,
            type: 'basic-query-processor',
            features: ['cleaning', 'keyword-extraction', 'intent-detection', 'query-expansion']
        };
    }
}

module.exports = QueryProcessor;
