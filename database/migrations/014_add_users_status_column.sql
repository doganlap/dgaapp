-- Migration: Add missing 'status' column to users table
-- This fixes dashboard statistics and user management features

-- Add status column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Set default values for existing records
UPDATE users SET status = CASE 
    WHEN is_active = true AND account_locked = false THEN 'active'
    WHEN is_active = false THEN 'inactive'
    WHEN account_locked = true THEN 'locked'
    ELSE 'pending'
END
WHERE status IS NULL;

-- Add check constraint for valid status values
ALTER TABLE users ADD CONSTRAINT chk_users_status 
CHECK (status IN ('active', 'inactive', 'pending', 'suspended', 'locked', 'archived'));

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_users_status_created ON users(status, created_at DESC);

-- Add comment
COMMENT ON COLUMN users.status IS 'User account status: active, inactive, pending, suspended, locked, or archived';

-- Create a function to automatically sync status with other flags
CREATE OR REPLACE FUNCTION sync_user_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically update status based on other flags
    IF NEW.account_locked = true THEN
        NEW.status = 'locked';
    ELSIF NEW.is_active = false THEN
        NEW.status = 'inactive';
    ELSIF NEW.is_active = true AND NEW.account_locked = false THEN
        IF NEW.status NOT IN ('active', 'pending', 'suspended') THEN
            NEW.status = 'active';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain status consistency
DROP TRIGGER IF EXISTS trg_sync_user_status ON users;
CREATE TRIGGER trg_sync_user_status
    BEFORE UPDATE OF is_active, account_locked ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_status();

-- Verify the migration
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
    COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked_users,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_users
FROM users;