/**
 * Documents Routes - Basic implementation
 */

const express = require('express');
const router = express.Router();

// Get documents
router.get('/', async (req, res) => {
    try {
        // Forward to BFF for real document data
        const response = await fetch('http://localhost:3000/api/rag/documents', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || ''
            }
        });

        if (!response.ok) {
            throw new Error(`BFF request failed: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Documents fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Documents service unavailable',
            details: error.message
        });
    }
});

// Add document
router.post('/', async (req, res) => {
    try {
        const { title, content, type } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                error: 'Title and content are required'
            });
        }

        // Forward to BFF for real document creation
        const response = await fetch('http://localhost:3000/api/rag/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || ''
            },
            body: JSON.stringify({ title, content, type })
        });

        if (!response.ok) {
            throw new Error(`BFF request failed: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Document creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Document creation failed',
            details: error.message
        });
    }
});

module.exports = router;
