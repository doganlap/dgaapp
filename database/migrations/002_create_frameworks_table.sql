-- Create Frameworks Table Migration
-- This creates the frameworks table for compliance framework management

-- 1) Create the frameworks table
CREATE TABLE IF NOT EXISTS frameworks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40)  NOT NULL UNIQUE,   -- e.g., NCA, SAMA, PDPL, ISO27001, NIST
  name          VARCHAR(255) NOT NULL,
  name_arabic   VARCHAR(255),
  version       VARCHAR(40),
  description   TEXT,
  description_arabic TEXT,
  authority     VARCHAR(160),                   -- NCA, Saudi Central Bank, ISO, NIST...
  authority_arabic VARCHAR(160),
  is_saudi      BOOLEAN DEFAULT FALSE,
  is_mandatory  BOOLEAN DEFAULT FALSE,
  effective_date TIMESTAMP WITH TIME ZONE,
  url           VARCHAR(512),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT TRUE
);

-- 2) Create indexes for performance
CREATE INDEX IF NOT EXISTS ix_fw_code            ON frameworks (code);
CREATE INDEX IF NOT EXISTS ix_fw_saudi_mandatory ON frameworks (is_saudi, is_mandatory);
CREATE INDEX IF NOT EXISTS ix_fw_authority       ON frameworks (authority);
CREATE INDEX IF NOT EXISTS ix_fw_created_at      ON frameworks (created_at);
CREATE INDEX IF NOT EXISTS ix_fw_active          ON frameworks (is_active);

-- 3) Create updated_at trigger
CREATE OR REPLACE FUNCTION fw_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fw_updated_at ON frameworks;
CREATE TRIGGER trg_fw_updated_at
BEFORE UPDATE ON frameworks
FOR EACH ROW EXECUTE FUNCTION fw_set_updated_at();

-- 4) Insert initial Saudi frameworks data
INSERT INTO frameworks (code, name, name_arabic, authority, authority_arabic, is_saudi, is_mandatory, version, description, description_arabic)
VALUES
  ('NCA-ECC', 'NCA Essential Cybersecurity Controls', 'ضوابط الأمن السيبراني الأساسية', 'National Cybersecurity Authority', 'الهيئة الوطنية للأمن السيبراني', TRUE, TRUE, '1-2018', 
   'Essential cybersecurity controls for national critical infrastructure', 'ضوابط الأمن السيبراني الأساسية للبنية التحتية الحرجة الوطنية'),
  
  ('NCA-CCC', 'NCA Critical Cybersecurity Controls', 'ضوابط الأمن السيبراني الحرجة', 'National Cybersecurity Authority', 'الهيئة الوطنية للأمن السيبراني', TRUE, TRUE, '1-2020',
   'Critical cybersecurity controls for high-risk sectors', 'ضوابط الأمن السيبراني الحرجة للقطاعات عالية المخاطر'),
  
  ('NCA-DCC', 'NCA Data Cybersecurity Controls', 'ضوابط الأمن السيبراني للبيانات', 'National Cybersecurity Authority', 'الهيئة الوطنية للأمن السيبراني', TRUE, TRUE, '1-2022',
   'Data protection and privacy controls', 'ضوابط حماية البيانات والخصوصية'),
  
  ('NCA-CSCC', 'NCA Cloud Security Controls', 'ضوابط الأمن السيبراني للحوسبة السحابية', 'National Cybersecurity Authority', 'الهيئة الوطنية للأمن السيبراني', TRUE, TRUE, '1-2020',
   'Cloud computing security controls', 'ضوابط أمن الحوسبة السحابية'),
  
  ('NCA-ICS', 'NCA Industrial Control Systems', 'ضوابط أنظمة التحكم الصناعية', 'National Cybersecurity Authority', 'الهيئة الوطنية للأمن السيبراني', TRUE, FALSE, '1-2021',
   'Security controls for industrial control systems', 'ضوابط الأمن لأنظمة التحكم الصناعية'),
  
  ('SAMA-CSF', 'SAMA Cyber Security Framework', 'إطار الأمن السيبراني للبنك المركزي', 'Saudi Central Bank', 'البنك المركزي السعودي', TRUE, TRUE, '2024',
   'Cybersecurity framework for financial institutions', 'إطار الأمن السيبراني للمؤسسات المالية'),
  
  ('PDPL', 'Personal Data Protection Law', 'نظام حماية البيانات الشخصية', 'NDMO', 'الهيئة الوطنية للبيانات', TRUE, TRUE, '2024',
   'Saudi Personal Data Protection Law', 'نظام حماية البيانات الشخصية السعودي'),
  
  ('ISO27001', 'ISO 27001:2022', NULL, 'ISO', NULL, FALSE, FALSE, '2022',
   'Information Security Management System', NULL),
  
  ('NIST-CSF', 'NIST Cybersecurity Framework', NULL, 'NIST', NULL, FALSE, FALSE, '2.0',
   'Framework for Improving Critical Infrastructure Cybersecurity', NULL),
  
  ('PCI-DSS', 'Payment Card Industry Data Security Standard', NULL, 'PCI Security Standards Council', NULL, FALSE, FALSE, '4.0',
   'Security standard for payment card data', NULL)
ON CONFLICT (code) DO NOTHING;

-- Verification query
-- SELECT code, name, name_arabic, authority, is_saudi, is_mandatory, version FROM frameworks ORDER BY is_mandatory DESC, is_saudi DESC, code;