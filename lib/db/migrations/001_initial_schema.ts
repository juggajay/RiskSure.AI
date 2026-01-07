import { Migration } from './index'

/**
 * Initial schema migration
 * Creates all tables from the existing schema in lib/db/index.ts
 * Note: Uses IF NOT EXISTS to be idempotent with existing databases
 */
export const migration: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db) => {
    // Companies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        abn TEXT NOT NULL UNIQUE,
        acn TEXT,
        logo_url TEXT,
        address TEXT,
        primary_contact_name TEXT,
        primary_contact_email TEXT,
        primary_contact_phone TEXT,
        forwarding_email TEXT UNIQUE,
        settings TEXT DEFAULT '{}',
        subscription_tier TEXT DEFAULT 'trial',
        subscription_status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        company_id TEXT REFERENCES companies(id),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'project_administrator' CHECK(role IN ('admin', 'risk_manager', 'project_manager', 'project_administrator', 'read_only', 'subcontractor', 'broker')),
        avatar_url TEXT,
        notification_preferences TEXT DEFAULT '{}',
        invitation_status TEXT DEFAULT 'accepted' CHECK(invitation_status IN ('pending', 'accepted')),
        invitation_token TEXT,
        invitation_expires_at TEXT,
        last_login_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Sessions table for authentication
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Projects table
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        name TEXT NOT NULL,
        address TEXT,
        state TEXT CHECK(state IN ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT')),
        start_date TEXT,
        end_date TEXT,
        estimated_value REAL,
        project_manager_id TEXT REFERENCES users(id),
        forwarding_email TEXT UNIQUE,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'on_hold')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Insurance requirements table
    db.exec(`
      CREATE TABLE IF NOT EXISTS insurance_requirements (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        coverage_type TEXT NOT NULL CHECK(coverage_type IN ('public_liability', 'products_liability', 'workers_comp', 'professional_indemnity', 'motor_vehicle', 'contract_works')),
        minimum_limit REAL,
        limit_type TEXT DEFAULT 'per_occurrence' CHECK(limit_type IN ('per_occurrence', 'aggregate')),
        maximum_excess REAL,
        principal_indemnity_required INTEGER DEFAULT 0,
        cross_liability_required INTEGER DEFAULT 0,
        waiver_of_subrogation_required INTEGER DEFAULT 0,
        principal_naming_required TEXT DEFAULT NULL CHECK(principal_naming_required IN ('principal_named', 'interested_party', NULL)),
        other_requirements TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Subcontractors table
    db.exec(`
      CREATE TABLE IF NOT EXISTS subcontractors (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        name TEXT NOT NULL,
        abn TEXT NOT NULL,
        acn TEXT,
        trading_name TEXT,
        address TEXT,
        trade TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        broker_name TEXT,
        broker_email TEXT,
        broker_phone TEXT,
        workers_comp_state TEXT,
        portal_access INTEGER DEFAULT 0,
        portal_user_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Project-Subcontractor junction table
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_subcontractors (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        subcontractor_id TEXT NOT NULL REFERENCES subcontractors(id),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'compliant', 'non_compliant', 'exception')),
        on_site_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(project_id, subcontractor_id)
      )
    `)

    // COC Documents table
    db.exec(`
      CREATE TABLE IF NOT EXISTS coc_documents (
        id TEXT PRIMARY KEY,
        subcontractor_id TEXT NOT NULL REFERENCES subcontractors(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        file_url TEXT NOT NULL,
        file_name TEXT,
        file_size INTEGER,
        source TEXT DEFAULT 'upload' CHECK(source IN ('email', 'upload', 'portal', 'api')),
        source_email TEXT,
        received_at TEXT,
        processed_at TEXT,
        processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Verifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS verifications (
        id TEXT PRIMARY KEY,
        coc_document_id TEXT NOT NULL REFERENCES coc_documents(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        status TEXT DEFAULT 'review' CHECK(status IN ('pass', 'fail', 'review')),
        confidence_score REAL,
        extracted_data TEXT DEFAULT '{}',
        checks TEXT DEFAULT '[]',
        deficiencies TEXT DEFAULT '[]',
        verified_by_user_id TEXT REFERENCES users(id),
        verified_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Communications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS communications (
        id TEXT PRIMARY KEY,
        subcontractor_id TEXT NOT NULL REFERENCES subcontractors(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        verification_id TEXT REFERENCES verifications(id),
        type TEXT NOT NULL CHECK(type IN ('deficiency', 'follow_up', 'confirmation', 'expiration_reminder', 'critical_alert')),
        channel TEXT DEFAULT 'email' CHECK(channel IN ('email', 'sms')),
        recipient_email TEXT,
        cc_emails TEXT,
        subject TEXT,
        body TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'delivered', 'opened', 'failed')),
        sent_at TEXT,
        delivered_at TEXT,
        opened_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Exceptions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS exceptions (
        id TEXT PRIMARY KEY,
        project_subcontractor_id TEXT NOT NULL REFERENCES project_subcontractors(id),
        verification_id TEXT REFERENCES verifications(id),
        issue_summary TEXT NOT NULL,
        reason TEXT NOT NULL,
        risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low', 'medium', 'high')),
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        approved_by_user_id TEXT REFERENCES users(id),
        approved_at TEXT,
        expires_at TEXT,
        expiration_type TEXT DEFAULT 'until_resolved' CHECK(expiration_type IN ('until_resolved', 'fixed_duration', 'specific_date', 'permanent')),
        status TEXT DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'active', 'expired', 'resolved', 'closed')),
        resolved_at TEXT,
        resolution_type TEXT CHECK(resolution_type IN ('coc_updated', 'extended', 'closed', 'converted_permanent')),
        resolution_notes TEXT,
        supporting_document_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Audit logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        company_id TEXT REFERENCES companies(id),
        user_id TEXT REFERENCES users(id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Compliance snapshots table for trend tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS compliance_snapshots (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        snapshot_date TEXT NOT NULL,
        total_subcontractors INTEGER DEFAULT 0,
        compliant INTEGER DEFAULT 0,
        non_compliant INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0,
        exception INTEGER DEFAULT 0,
        compliance_rate REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(company_id, snapshot_date)
      )
    `)

    // Password reset tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Magic link tokens table (for portal users)
    db.exec(`
      CREATE TABLE IF NOT EXISTS magic_link_tokens (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Email templates table
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        company_id TEXT REFERENCES companies(id),
        type TEXT NOT NULL CHECK(type IN ('deficiency', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'confirmation', 'expiration_reminder')),
        name TEXT,
        subject TEXT,
        body TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Requirement templates table
    db.exec(`
      CREATE TABLE IF NOT EXISTS requirement_templates (
        id TEXT PRIMARY KEY,
        company_id TEXT REFERENCES companies(id),
        name TEXT NOT NULL,
        type TEXT DEFAULT 'custom' CHECK(type IN ('commercial', 'residential', 'civil', 'fitout', 'custom')),
        requirements TEXT DEFAULT '[]',
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        company_id TEXT NOT NULL REFERENCES companies(id),
        type TEXT NOT NULL CHECK(type IN ('coc_received', 'coc_verified', 'coc_failed', 'exception_created', 'exception_approved', 'exception_expired', 'expiration_warning', 'communication_sent', 'stop_work_risk', 'system')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        entity_type TEXT,
        entity_id TEXT,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // OAuth states table (for CSRF protection during OAuth flow)
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        company_id TEXT NOT NULL REFERENCES companies(id),
        provider TEXT NOT NULL CHECK(provider IN ('microsoft', 'google')),
        state TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )
    `)

    // OAuth connections table (stores OAuth tokens for connected accounts)
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_connections (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        provider TEXT NOT NULL CHECK(provider IN ('microsoft', 'google')),
        email TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TEXT,
        last_sync_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(company_id, provider)
      )
    `)
  },
  down: (db) => {
    // Drop tables in reverse order of dependencies
    // Note: This will destroy all data - use with caution!
    db.exec('DROP TABLE IF EXISTS oauth_connections')
    db.exec('DROP TABLE IF EXISTS oauth_states')
    db.exec('DROP TABLE IF EXISTS notifications')
    db.exec('DROP TABLE IF EXISTS requirement_templates')
    db.exec('DROP TABLE IF EXISTS email_templates')
    db.exec('DROP TABLE IF EXISTS magic_link_tokens')
    db.exec('DROP TABLE IF EXISTS password_reset_tokens')
    db.exec('DROP TABLE IF EXISTS compliance_snapshots')
    db.exec('DROP TABLE IF EXISTS audit_logs')
    db.exec('DROP TABLE IF EXISTS exceptions')
    db.exec('DROP TABLE IF EXISTS communications')
    db.exec('DROP TABLE IF EXISTS verifications')
    db.exec('DROP TABLE IF EXISTS coc_documents')
    db.exec('DROP TABLE IF EXISTS project_subcontractors')
    db.exec('DROP TABLE IF EXISTS subcontractors')
    db.exec('DROP TABLE IF EXISTS insurance_requirements')
    db.exec('DROP TABLE IF EXISTS projects')
    db.exec('DROP TABLE IF EXISTS sessions')
    db.exec('DROP TABLE IF EXISTS users')
    db.exec('DROP TABLE IF EXISTS companies')
  }
}
