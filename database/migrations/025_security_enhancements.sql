-- Migration: Security Enhancements
-- Date: 2024-12-20
-- Description: Add tables and columns for comprehensive security features
-- Features: JWT blacklisting, security events, password history, MFA support

-- ============================================================================
-- STEP 1: CREATE JWT BLACKLIST TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS jwt_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_jti ON jwt_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires ON jwt_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_user ON jwt_blacklist(user_id);

-- ============================================================================
-- STEP 2: CREATE SECURITY EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security event queries
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- ============================================================================
-- STEP 3: ENSURE PASSWORD HISTORY TABLE EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for password history
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created ON password_history(created_at DESC);

-- ============================================================================
-- STEP 4: ADD MFA AND SECURITY COLUMNS TO USERS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- MFA columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'mfa_enabled') THEN
        ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'mfa_secret') THEN
        ALTER TABLE users ADD COLUMN mfa_secret TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'backup_codes') THEN
        ALTER TABLE users ADD COLUMN backup_codes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'mfa_recovery_codes_generated_at') THEN
        ALTER TABLE users ADD COLUMN mfa_recovery_codes_generated_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Account lockout columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'account_locked_until') THEN
        ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'account_status') THEN
        ALTER TABLE users ADD COLUMN account_status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE users ADD CONSTRAINT chk_account_status 
            CHECK (account_status IN ('active', 'locked', 'disabled', 'pending', 'suspended'));
    END IF;

    -- Password policy columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_expires_at') THEN
        ALTER TABLE users ADD COLUMN password_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'must_change_password') THEN
        ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
    END IF;

    -- Token management columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'refresh_token') THEN
        ALTER TABLE users ADD COLUMN refresh_token TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'refresh_token_expires_at') THEN
        ALTER TABLE users ADD COLUMN refresh_token_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Session management columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'concurrent_sessions') THEN
        ALTER TABLE users ADD COLUMN concurrent_sessions INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'max_concurrent_sessions') THEN
        ALTER TABLE users ADD COLUMN max_concurrent_sessions INTEGER DEFAULT 5;
    END IF;

    -- Security metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'security_metadata') THEN
        ALTER TABLE users ADD COLUMN security_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: CREATE ACTIVE SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    jwt_jti VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for session management
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STEP 6: CREATE FUNCTIONS FOR SECURITY OPERATIONS
-- ============================================================================

-- Function to check if user is locked
CREATE OR REPLACE FUNCTION is_user_locked(p_email VARCHAR)
RETURNS TABLE(
    locked BOOLEAN,
    reason VARCHAR,
    locked_until TIMESTAMP WITH TIME ZONE,
    attempts INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN u.account_status IN ('locked', 'disabled', 'suspended') THEN TRUE
            WHEN u.account_locked_until IS NOT NULL AND u.account_locked_until > CURRENT_TIMESTAMP THEN TRUE
            ELSE FALSE
        END AS locked,
        CASE 
            WHEN u.account_status IN ('disabled', 'suspended') THEN u.account_status
            WHEN u.account_locked_until IS NOT NULL AND u.account_locked_until > CURRENT_TIMESTAMP THEN 'too_many_attempts'
            ELSE NULL
        END AS reason,
        u.account_locked_until AS locked_until,
        u.failed_login_attempts AS attempts
    FROM users u
    WHERE u.email = p_email OR u.username = p_email;
END;
$$ LANGUAGE plpgsql;

-- Function to track failed login attempt
CREATE OR REPLACE FUNCTION track_failed_login(
    p_identifier VARCHAR,
    p_ip_address INET,
    p_max_attempts INTEGER DEFAULT 5,
    p_lockout_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(
    user_locked BOOLEAN,
    remaining_attempts INTEGER,
    locked_until TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_user_id UUID;
    v_current_attempts INTEGER;
    v_lock_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user info
    SELECT id, failed_login_attempts 
    INTO v_user_id, v_current_attempts
    FROM users 
    WHERE email = p_identifier OR username = p_identifier;

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, p_max_attempts, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Increment attempts
    v_current_attempts := COALESCE(v_current_attempts, 0) + 1;

    -- Check if should lock
    IF v_current_attempts >= p_max_attempts THEN
        v_lock_until := CURRENT_TIMESTAMP + (p_lockout_minutes || ' minutes')::INTERVAL;
        
        UPDATE users 
        SET failed_login_attempts = v_current_attempts,
            account_locked_until = v_lock_until,
            account_status = 'locked'
        WHERE id = v_user_id;

        -- Log security event
        INSERT INTO security_events (user_id, event_type, severity, details, ip_address)
        VALUES (v_user_id, 'account_locked', 'warning', 
                jsonb_build_object('attempts', v_current_attempts, 'locked_until', v_lock_until),
                p_ip_address);

        RETURN QUERY SELECT TRUE, 0, v_lock_until;
    ELSE
        UPDATE users 
        SET failed_login_attempts = v_current_attempts
        WHERE id = v_user_id;

        RETURN QUERY SELECT FALSE, p_max_attempts - v_current_attempts, NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to clear failed attempts after successful login
CREATE OR REPLACE FUNCTION clear_failed_login_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET failed_login_attempts = 0,
        account_locked_until = NULL,
        account_status = CASE 
            WHEN account_status = 'locked' THEN 'active'
            ELSE account_status
        END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_active = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update concurrent session counts
    UPDATE users u
    SET concurrent_sessions = (
        SELECT COUNT(*) 
        FROM active_sessions 
        WHERE user_id = u.id AND is_active = TRUE
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: CREATE TRIGGERS
-- ============================================================================

-- Trigger to log password changes
CREATE OR REPLACE FUNCTION log_password_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.password IS DISTINCT FROM NEW.password THEN
        -- Add to password history
        INSERT INTO password_history (user_id, password_hash, change_reason)
        VALUES (NEW.id, NEW.password, 'password_change');
        
        -- Update password metadata
        NEW.password_changed_at := CURRENT_TIMESTAMP;
        
        -- Set password expiration if configured
        IF EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.password_expires_days') THEN
            NEW.password_expires_at := CURRENT_TIMESTAMP + 
                (current_setting('app.password_expires_days')::INTEGER || ' days')::INTERVAL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_password_change ON users;
CREATE TRIGGER trg_log_password_change
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_password_change();

-- ============================================================================
-- STEP 8: CREATE VIEWS FOR SECURITY MONITORING
-- ============================================================================

-- View for active security threats
CREATE OR REPLACE VIEW security_threats AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.failed_login_attempts,
    u.account_locked_until,
    u.account_status,
    COUNT(DISTINCT se.ip_address) as unique_ips_24h,
    COUNT(se.id) FILTER (WHERE se.event_type = 'failed_login') as failed_logins_24h,
    MAX(se.created_at) as last_security_event
FROM users u
LEFT JOIN security_events se ON u.id = se.user_id 
    AND se.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
WHERE u.failed_login_attempts > 3 
    OR u.account_status != 'active'
    OR se.severity IN ('warning', 'error', 'critical')
GROUP BY u.id, u.email, u.username, u.failed_login_attempts, u.account_locked_until, u.account_status;

-- View for session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    u.id as user_id,
    u.email,
    u.concurrent_sessions,
    u.max_concurrent_sessions,
    COUNT(s.id) as active_sessions,
    COUNT(DISTINCT s.ip_address) as unique_ips,
    MIN(s.created_at) as oldest_session,
    MAX(s.last_activity) as latest_activity
FROM users u
LEFT JOIN active_sessions s ON u.id = s.user_id AND s.is_active = TRUE
GROUP BY u.id, u.email, u.concurrent_sessions, u.max_concurrent_sessions;

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to application user
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON jwt_blacklist TO app_user;
        GRANT SELECT, INSERT ON security_events TO app_user;
        GRANT SELECT, INSERT ON password_history TO app_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON active_sessions TO app_user;
        GRANT SELECT ON security_threats TO app_user;
        GRANT SELECT ON session_analytics TO app_user;
    END IF;
END $$;

-- ============================================================================
-- STEP 10: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE jwt_blacklist IS 'Stores blacklisted JWT tokens for logout and security';
COMMENT ON TABLE security_events IS 'Audit log for all security-related events';
COMMENT ON TABLE password_history IS 'Password change history for preventing reuse';
COMMENT ON TABLE active_sessions IS 'Currently active user sessions for management';
COMMENT ON VIEW security_threats IS 'Real-time view of potential security threats';
COMMENT ON VIEW session_analytics IS 'Analytics view for user session monitoring';

-- Migration complete
DO $$ 
BEGIN
    RAISE NOTICE 'Security enhancements migration completed successfully';
    RAISE NOTICE 'Tables created: jwt_blacklist, security_events, password_history, active_sessions';
    RAISE NOTICE 'Views created: security_threats, session_analytics';
    RAISE NOTICE 'Security columns added to users table';
END $$;