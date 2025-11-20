-- Migration: Add missing 'details' column to audit_logs table
-- This fixes the error: column "details" of relation "audit_logs" does not exist

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;

-- Add index for better performance on details column
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING gin(to_tsvector('english', details));

-- Update comment
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the audit event as text';