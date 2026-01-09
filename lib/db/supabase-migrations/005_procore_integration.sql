-- Migration: Procore Integration for Supabase
-- Run this in Supabase SQL Editor to add Procore support

-- Step 1: Drop existing CHECK constraints on oauth_states
ALTER TABLE oauth_states DROP CONSTRAINT IF EXISTS oauth_states_provider_check;

-- Step 2: Add new CHECK constraint that includes 'procore'
ALTER TABLE oauth_states ADD CONSTRAINT oauth_states_provider_check
  CHECK (provider IN ('microsoft', 'google', 'procore'));

-- Step 3: Drop existing CHECK constraints on oauth_connections
ALTER TABLE oauth_connections DROP CONSTRAINT IF EXISTS oauth_connections_provider_check;

-- Step 4: Add new CHECK constraint that includes 'procore'
ALTER TABLE oauth_connections ADD CONSTRAINT oauth_connections_provider_check
  CHECK (provider IN ('microsoft', 'google', 'procore'));

-- Step 5: Add Procore-specific columns to oauth_connections
ALTER TABLE oauth_connections ADD COLUMN IF NOT EXISTS procore_company_id INTEGER;
ALTER TABLE oauth_connections ADD COLUMN IF NOT EXISTS procore_company_name TEXT;
ALTER TABLE oauth_connections ADD COLUMN IF NOT EXISTS pending_company_selection BOOLEAN DEFAULT false;

-- Step 6: Create procore_mappings table
CREATE TABLE IF NOT EXISTS procore_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  procore_company_id INTEGER NOT NULL,
  procore_entity_type TEXT NOT NULL CHECK(procore_entity_type IN ('project', 'vendor')),
  procore_entity_id INTEGER NOT NULL,
  shield_entity_type TEXT NOT NULL CHECK(shield_entity_type IN ('project', 'subcontractor')),
  shield_entity_id UUID NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_direction TEXT NOT NULL DEFAULT 'procore_to_shield' CHECK(sync_direction IN ('procore_to_shield', 'shield_to_procore', 'bidirectional')),
  sync_status TEXT NOT NULL DEFAULT 'active' CHECK(sync_status IN ('active', 'paused', 'error')),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, procore_company_id, procore_entity_type, procore_entity_id)
);

-- Step 7: Create indexes for procore_mappings
CREATE INDEX IF NOT EXISTS idx_procore_mappings_company ON procore_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_procore_mappings_procore ON procore_mappings(procore_company_id, procore_entity_type, procore_entity_id);
CREATE INDEX IF NOT EXISTS idx_procore_mappings_shield ON procore_mappings(shield_entity_type, shield_entity_id);

-- Step 8: Create procore_sync_log table
CREATE TABLE IF NOT EXISTS procore_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  procore_company_id INTEGER NOT NULL,
  sync_type TEXT NOT NULL CHECK(sync_type IN ('projects', 'vendors', 'compliance_push')),
  status TEXT NOT NULL CHECK(status IN ('started', 'completed', 'failed')),
  total_items INTEGER,
  created_count INTEGER,
  updated_count INTEGER,
  skipped_count INTEGER,
  error_count INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_procore_sync_log_company ON procore_sync_log(company_id, started_at DESC);
