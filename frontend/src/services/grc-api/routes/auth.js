const express = require('express');
const { dbQueries } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Login a user (sets HTTP-only cookie)
router.post('/login', async (req, res) => {
  const origin = req.headers.origin;
  const allowed = 'https://www.shahin-ai.com';
  if (process.env.NODE_ENV === 'production' && origin !== allowed) {
    return res.status(403).json({ success: false, message: 'Forbidden origin' });
  }
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password.' });
  }

  try {
    const { rows } = await dbQueries.auth.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, tenant_id: user.tenant_id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Remove password from user object before sending
    delete user.password;

    const secure = process.env.NODE_ENV === 'production';
    const sameSite = secure ? 'Lax' : 'Lax';
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 60 * 60 * 1000,
      path: '/',
    });

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Register a new user
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, organizationName } = req.body;

  if (!email || !password || !firstName || !lastName || !organizationName) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
  }

  try {
    // Check if user already exists
    const { rows } = await dbQueries.auth.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new tenant for the organization in the finance database
    const tenantResult = await dbQueries.finance.query('INSERT INTO tenants (name) VALUES ($1) RETURNING id', [organizationName]);
    const tenantId = tenantResult.rows[0].id;

    // Create the new user
    const newUserResult = await dbQueries.auth.query(
      'INSERT INTO users (email, password, first_name, last_name, tenant_id, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role',
      [email, hashedPassword, firstName, lastName, tenantId, 'admin']
    );
    const newUser = newUserResult.rows[0];

    // Generate a JWT
    const token = jwt.sign({ id: newUser.id, role: newUser.role, tenant_id: tenantId }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({ success: true, data: { user: newUser, token } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    console.log('BYPASS_AUTH value:', process.env.BYPASS_AUTH);
    
    // If bypass auth is enabled, return a demo user
    if (process.env.BYPASS_AUTH === 'true') {
      console.log('Returning demo user for bypass auth');
      const demoUser = {
        id: 'demo-user-123',
        email: 'demo@grc-system.com',
        first_name: 'Demo',
        last_name: 'User',
        role: 'admin',
        tenant_id: 'demo-tenant-123',
        created_at: new Date().toISOString()
      };
      return res.status(200).json({ success: true, data: { user: demoUser } });
    }

    // Otherwise, check if user is authenticated via middleware
    if (req.user) {
      // Try to get user from database, but if it fails, return the req.user
      try {
        const { rows } = await dbQueries.auth.query(
          'SELECT id, email, first_name, last_name, role, tenant_id, created_at FROM users WHERE id = $1', 
          [req.user.id]
        );
        
        if (rows.length === 0) {
          // If user not found in database but we have req.user, return req.user
          return res.status(200).json({ success: true, data: { user: req.user } });
        }

        const user = rows[0];
        return res.status(200).json({ success: true, data: { user } });
      } catch (dbError) {
        // If database query fails, return the req.user data
        console.warn('Database query failed for user, returning middleware user:', dbError.message);
        return res.status(200).json({ success: true, data: { user: req.user } });
      }
    }

    // If no user and bypass auth is not enabled, require authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { rows } = await dbQueries.auth.query(
      'SELECT id, email, first_name, last_name, role, tenant_id, created_at FROM users WHERE id = $1', 
      [decoded.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = rows[0];
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving user.' });
  }
});

module.exports = router;
