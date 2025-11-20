/**
 * Search Routes - Basic implementation
 */

const express = require('express');
const router = express.Router();

// Search endpoint
router.post('/', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        // Forward to BFF for real search
        const response = await fetch('http://localhost:3000/api/rag/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || ''
            },
            body: JSON.stringify({ query, limit })
        });

        if (!response.ok) {
            throw new Error(`BFF request failed: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search service unavailable',
            details: error.message
        });
    }
});

module.exports = router;
