const express = require('express');
const axios = require('axios');

const router = express.Router();

const AI_BASE_URL = process.env.AI_BASE_URL || 'http://localhost:11434';

const forward = async (req, res, targetPath, method = 'GET') => {
  try {
    const url = `${AI_BASE_URL}${targetPath}`;
    const config = {
      method,
      url,
      headers: { 'Content-Type': 'application/json' },
      data: ['POST','PUT','PATCH'].includes(method) ? req.body : undefined,
      params: ['GET','DELETE'].includes(method) ? req.query : undefined,
      timeout: 30000
    };
    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 502;
    res.status(status).json({
      success: false,
      error: 'AI proxy error',
      message: error.response?.data?.message || error.message,
    });
  }
};

const tryForward = async (req, res, targets, method = 'GET') => {
  for (const targetPath of targets) {
    try {
      await forward(req, res, targetPath, method);
      return;
    } catch (e) {
      continue;
    }
  }
  res.status(502).json({ success: false, error: 'AI proxy error', message: 'All targets failed' });
};

router.get('/health', (req, res) => tryForward(req, res, ['/api/health','/health','/status'], 'GET'));
router.get('/status', (req, res) => tryForward(req, res, ['/api/status','/status'], 'GET'));

router.post('/chat', (req, res) => forward(req, res, '/api/ai/chat', 'POST'));
router.post('/analyze-image', (req, res) => forward(req, res, '/api/ai/analyze-image', 'POST'));
router.post('/process-voice', (req, res) => forward(req, res, '/api/ai/process-voice', 'POST'));
router.post('/analyze-document', (req, res) => forward(req, res, '/api/ai/analyze-document', 'POST'));

router.post('/generate', (req, res) => forward(req, res, '/api/generate', 'POST'));
router.get('/agents', (req, res) => forward(req, res, '/api/agents', 'GET'));
router.get('/models', (req, res) => forward(req, res, '/api/models', 'GET'));
router.get('/modules', (req, res) => forward(req, res, '/api/modules', 'GET'));

router.post('/commands', (req, res) => tryForward(req, res, ['/api/commands','/commands','/api/agent/command'], 'POST'));

module.exports = router;