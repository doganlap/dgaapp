-- Create evidence table for document management
-- Migration: 041_create_evidence_table.sql

-- Create evidence table if not exists
CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    control_id VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ocr_text TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_control_id ON evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_at ON evidence(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_mime_type ON evidence(mime_type);

-- Add foreign key constraint to controls table (if control_id matches code)
-- Note: This assumes control_id in evidence matches the 'code' field in controls table
-- ALTER TABLE evidence ADD CONSTRAINT fk_evidence_control 
-- FOREIGN KEY (control_id) REFERENCES controls(code) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_evidence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_evidence_updated_at
    BEFORE UPDATE ON evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_evidence_updated_at();

-- Insert sample evidence data for testing
INSERT INTO evidence (control_id, filename, file_path, mime_type, file_size, uploaded_by, description)
VALUES 
    ('SAMA-001', 'customer_due_diligence_policy.pdf', '/uploads/evidence/sample1.pdf', 'application/pdf', 1024000, 1, 'Customer Due Diligence Policy Document'),
    ('SAMA-002', 'transaction_monitoring_procedure.docx', '/uploads/evidence/sample2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 512000, 1, 'Transaction Monitoring Procedures'),
    ('CMA-001', 'market_surveillance_report.pdf', '/uploads/evidence/sample3.pdf', 'application/pdf', 2048000, 1, 'Market Surveillance Monthly Report')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE evidence TO shahin_admin;
GRANT ALL PRIVILEGES ON SEQUENCE evidence_id_seq TO shahin_admin;

-- Output success message
SELECT 'Evidence table created successfully' as status;
