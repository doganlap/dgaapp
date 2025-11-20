-- CLEAN ADMIN SYSTEM DATABASE SCHEMA
-- Fresh database tables for modular admin system

-- Drop existing tables if they exist (clean start)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ==========================================
-- 🏢 ORGANIZATIONS TABLE
-- ==========================================

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'corporation',
    industry VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    website VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'SAR',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 👥 USERS TABLE
-- ==========================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 📋 AUDIT LOGS TABLE
-- ==========================================

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 🔍 INDEXES FOR PERFORMANCE
-- ==========================================

-- Organizations indexes
CREATE INDEX idx_organizations_email ON organizations(email);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ==========================================
-- 🎯 SAMPLE DATA FOR TESTING
-- ==========================================

-- Insert default organization
INSERT INTO organizations (
    name, type, industry, country, city, email, 
    timezone, language, currency, status
) VALUES (
    'ShahinKSA Default Org', 
    'corporation', 
    'Technology', 
    'Saudi Arabia', 
    'Riyadh', 
    'admin@shahinksa.com',
    'Asia/Riyadh', 
    'en', 
    'SAR', 
    'active'
);

-- Insert admin user (password: Admin2025!)
INSERT INTO users (
    organization_id, first_name, last_name, email, 
    password_hash, role, status
) VALUES (
    1, 
    'Admin', 
    'User', 
    'admin@shahinksa.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9PS', -- Admin2025!
    'admin', 
    'active'
);

-- Insert sample audit log
INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, details
) VALUES (
    1, 
    'CREATE', 
    'organization', 
    1, 
    '{"message": "Initial organization setup", "system": "clean-admin"}'
);

-- ==========================================
-- 🔧 FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 📊 VIEWS FOR REPORTING
-- ==========================================

-- Organization summary view
CREATE VIEW organization_summary AS
SELECT 
    o.id,
    o.name,
    o.type,
    o.industry,
    o.country,
    o.city,
    o.email,
    o.status,
    o.created_at,
    COUNT(u.id) as user_count,
    COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id
WHERE o.status != 'deleted'
GROUP BY o.id, o.name, o.type, o.industry, o.country, o.city, o.email, o.status, o.created_at;

-- User summary view
CREATE VIEW user_summary AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.status,
    u.last_login,
    u.created_at,
    o.name as organization_name,
    o.id as organization_id
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.status != 'deleted';

-- ==========================================
-- ✅ VERIFICATION QUERIES
-- ==========================================

-- Check table creation
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('organizations', 'users', 'audit_logs')
ORDER BY table_name;

-- Check sample data
SELECT 'Organizations' as table_name, COUNT(*) as record_count FROM organizations
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Audit Logs' as table_name, COUNT(*) as record_count FROM audit_logs;

-- Check admin user
SELECT 
    id, 
    first_name, 
    last_name, 
    email, 
    role, 
    status 
FROM users 
WHERE email = 'admin@shahinksa.com';

COMMIT;
