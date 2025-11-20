/**
 * RAG Routes - Basic implementation
 */

const express = require('express');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'rag-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Basic RAG query endpoint
router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        // Forward to BFF for real RAG processing
        const response = await fetch('http://localhost:3000/api/rag/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || ''
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`BFF request failed: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('RAG query error:', error);
        res.status(500).json({
            success: false,
            error: 'RAG service unavailable',
            details: error.message
        });
    }
});

module.exports = router;
