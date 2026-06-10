/**
 * PostgreSQL Database Schema for Safe Web Checker
 *
 * This schema is designed for:
 * - Multi-tenant architecture (Phase 4)
 * - Scan history and results persistence
 * - User authentication and authorization
 * - API key management
 * - Billing and usage tracking
 * - Audit logging
 *
 * Implementation Notes:
 * - All timestamps use UTC (timestamptz)
 * - Sensitive data (passwords, API keys) are hashed before storage
 * - Row-level security (RLS) policies for multi-tenancy (Phase 4 enhancement)
 * - Foreign keys enforce referential integrity
 */

-- ============================================================================
-- ENUMERATION TYPES
-- ============================================================================

CREATE TYPE threat_level AS ENUM ('safe', 'low_risk', 'medium_risk', 'high_risk', 'critical');
CREATE TYPE scan_type AS ENUM ('url', 'text', 'media');
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer', 'api_only');
CREATE TYPE billing_tier AS ENUM ('free', 'pro', 'enterprise');

-- ============================================================================
-- MULTI-TENANT STRUCTURE (Phase 4)
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  plan_tier billing_tier DEFAULT 'free',
  monthly_scan_limit INT DEFAULT 1000,
  api_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ -- Soft delete for GDPR
);

CREATE INDEX idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);

-- ============================================================================
-- AUTHENTICATION & AUTHORIZATION
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- Argon2 hash (not plaintext!)
  full_name VARCHAR(255),
  role user_role DEFAULT 'viewer',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ -- Soft delete for GDPR
);

CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

-- ============================================================================
-- API KEY MANAGEMENT
-- ============================================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  hashed_key VARCHAR(255) NOT NULL, -- Never store plaintext keys!
  prefix VARCHAR(20), -- For display: first 20 chars of key
  permissions TEXT[] DEFAULT ARRAY['scan:read', 'scan:create'], -- Scoped permissions
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_api_keys_hashed_key ON api_keys(hashed_key);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- ============================================================================
-- SCAN RESULTS & THREAT INTELLIGENCE
-- ============================================================================

CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  scan_type scan_type NOT NULL,

  -- Input (redacted for privacy)
  input_hash VARCHAR(255) NOT NULL, -- SHA-256 of input (for deduplication)
  input_redacted VARCHAR(500), -- First 500 chars of input

  -- Results
  threat_level threat_level,
  risk_score DECIMAL(5, 2) DEFAULT 50.0, -- 0-100
  confidence DECIMAL(5, 2) DEFAULT 0.0, -- 0-100 (how confident is the analysis)

  -- Threat Intelligence Sources (JSON for flexibility in Phase 2)
  intelligence_sources JSONB DEFAULT '{}', -- VirusTotal, Google Safe Browsing, etc.
  analysis_details JSONB, -- Full analysis breakdown (categories, flags, etc.)

  -- Metadata
  ip_address INET, -- Client IP
  user_agent VARCHAR(500),
  correlation_id VARCHAR(255), -- For request tracing

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ttl_expires_at TIMESTAMPTZ -- For automatic deletion (GDPR compliance)
);

CREATE INDEX idx_scans_tenant_id ON scans(tenant_id);
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX idx_scans_threat_level ON scans(threat_level);
CREATE INDEX idx_scans_input_hash ON scans(input_hash); -- For caching/deduplication
CREATE INDEX idx_scans_ttl_expires_at ON scans(ttl_expires_at) WHERE ttl_expires_at IS NOT NULL;

-- ============================================================================
-- BILLING & USAGE TRACKING
-- ============================================================================

CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- 'scan_url', 'scan_text', 'scan_media', 'api_request'
  units_consumed INT DEFAULT 1, -- Number of scans, API calls, etc.
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX idx_billing_events_created_at ON billing_events(created_at DESC);

-- For month usage aggregation (materialized view in Phase 4)
CREATE TABLE monthly_usage_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  total_scans_url INT DEFAULT 0,
  total_scans_text INT DEFAULT 0,
  total_scans_media INT DEFAULT 0,
  total_api_requests INT DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0.00,
  refreshed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_monthly_usage_summary_tenant_month ON monthly_usage_summary(tenant_id, year, month);

-- ============================================================================
-- AUDIT LOGGING (SOC 2 Compliance)
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'user_created', 'api_key_created', 'scan_deleted', etc.
  resource_type VARCHAR(50) NOT NULL, -- 'user', 'api_key', 'scan', etc.
  resource_id UUID,
  changes JSONB, -- What changed (before/after)
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- ERROR LOGGING (Debugging & Monitoring)
-- ============================================================================

CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id VARCHAR(255),
  error_code VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  severity VARCHAR(20) DEFAULT 'error', -- 'info', 'warn', 'error', 'critical'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_error_logs_correlation_id ON error_logs(correlation_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_error_code ON error_logs(error_code);

-- ============================================================================
-- PERFORMANCE INDICES & CONSTRAINTS
-- ============================================================================

-- Add soft-delete index for common queries
CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- INITIAL FUNCTIONS (Phase 4+)
-- ============================================================================

-- Update updated_at timestamp on row change
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_update_timestamp
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_users_update_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_scans_update_timestamp
  BEFORE UPDATE ON scans
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) - Phase 4
-- ============================================================================

-- Enable RLS on all multi-tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their tenant
-- (Will be implemented in Phase 4 with auth context)

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations. Each tenant is an isolated customer.';
COMMENT ON TABLE users IS 'Users belong to a tenant. Passwords are hashed with Argon2, never plaintext.';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access. Keys are hashed, only prefix shown in logs.';
COMMENT ON TABLE scans IS 'Historical scan results. Input is hashed for deduplication. Results stored as JSONB for flexibility.';
COMMENT ON TABLE billing_events IS 'Usage tracking for billing. Each scan or API call creates an event.';
COMMENT ON TABLE audit_logs IS 'SOC 2 compliance: all administrative actions logged with user/IP/timestamp.';
COMMENT ON COLUMN scans.threat_level IS 'Classification: safe, low_risk, medium_risk, high_risk, critical';
COMMENT ON COLUMN scans.risk_score IS 'Numerical score (0-100). Computed from multiple threat intelligence sources.';
COMMENT ON COLUMN scans.intelligence_sources IS 'JSON object with results from VirusTotal, Google Safe Browsing, URLScan, etc.';

