-- Migration: Add missing columns to work_orders table for automation engine
-- Date: 2025-10-14
-- Description: Adds sla_breached, escalation_level, organization_id, and deleted_at columns

-- Add missing columns to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_sla_breached ON work_orders(sla_breached) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_escalation_level ON work_orders(escalation_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON work_orders(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_deleted_at ON work_orders(deleted_at) WHERE deleted_at IS NULL;

-- Update existing records to have a default organization_id if they don't have one
-- This assumes organization with id=1 exists as a default
UPDATE work_orders 
SET organization_id = 1 
WHERE organization_id IS NULL 
AND EXISTS (SELECT 1 FROM organizations WHERE id = 1);

-- Add comments to document the new columns
COMMENT ON COLUMN work_orders.sla_breached IS 'Indicates if the work order has breached its SLA';
COMMENT ON COLUMN work_orders.escalation_level IS 'Number of times this work order has been escalated';
COMMENT ON COLUMN work_orders.organization_id IS 'Organization that owns this work order';
COMMENT ON COLUMN work_orders.deleted_at IS 'Soft delete timestamp - when the work order was deleted';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_work_orders_updated_at();