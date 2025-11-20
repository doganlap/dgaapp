-- Migration: Add Domain Authentication Fields to Users Table
-- Date: 2024
-- Description: Adds fields to support Microsoft domain authentication

-- Add domain authentication fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_domain_user BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS azure_object_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_domain_sync TIMESTAMP WITH TIME ZONE;

-- Make password nullable for domain users (they don't need local passwords)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Add index for domain lookups
CREATE INDEX IF NOT EXISTS idx_users_domain ON users(domain);
CREATE INDEX IF NOT EXISTS idx_users_is_domain_user ON users(is_domain_user);
CREATE INDEX IF NOT EXISTS idx_users_azure_object_id ON users(azure_object_id);

-- Add constraint to ensure domain users have domain field
ALTER TABLE users ADD CONSTRAINT check_domain_user_has_domain 
CHECK (
    (is_domain_user = false) OR 
    (is_domain_user = true AND domain IS NOT NULL)
);

-- Add constraint to ensure local users have password
ALTER TABLE users ADD CONSTRAINT check_local_user_has_password 
CHECK (
    (is_domain_user = true) OR 
    (is_domain_user = false AND password IS NOT NULL)
);

-- Update existing users to be local users by default
UPDATE users SET is_domain_user = false WHERE is_domain_user IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.is_domain_user IS 'True if user authenticates via domain/Azure AD';
COMMENT ON COLUMN users.domain IS 'Domain name for domain users (e.g., company.com)';
COMMENT ON COLUMN users.azure_object_id IS 'Azure AD object ID for Azure AD users';
COMMENT ON COLUMN users.last_domain_sync IS 'Last time user info was synced from domain';