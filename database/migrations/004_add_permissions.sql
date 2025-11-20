-- Migration: Add permissions table
-- Description: Create permissions table for system access control

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_permissions_updated_at
    BEFORE UPDATE ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_permissions_updated_at();

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('users_create', 'Create new users', 'users', 'create'),
('users_read', 'View user information', 'users', 'read'),
('users_update', 'Update user information', 'users', 'update'),
('users_delete', 'Delete users', 'users', 'delete'),
('users_manage', 'Full user management', 'users', 'manage'),
('organizations_create', 'Create new organizations', 'organizations', 'create'),
('organizations_read', 'View organization information', 'organizations', 'read'),
('organizations_update', 'Update organization information', 'organizations', 'update'),
('organizations_delete', 'Delete organizations', 'organizations', 'delete'),
('organizations_manage', 'Full organization management', 'organizations', 'manage'),
('sessions_read', 'View session information', 'sessions', 'read'),
('sessions_delete', 'Delete sessions', 'sessions', 'delete'),
('sessions_manage', 'Full session management', 'sessions', 'manage'),
('security_events_read', 'View security events', 'security_events', 'read'),
('security_events_manage', 'Manage security events', 'security_events', 'manage'),
('password_history_read', 'View password history', 'password_history', 'read')
ON CONFLICT (name) DO NOTHING;