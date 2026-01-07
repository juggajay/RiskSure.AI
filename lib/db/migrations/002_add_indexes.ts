import { Migration } from './index'

/**
 * Add indexes for performance optimization
 * Based on existing indexes in lib/db/index.ts
 */
export const migration: Migration = {
  version: 2,
  name: 'add_indexes',
  up: (db) => {
    // User indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id)')

    // Session indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)')

    // Project indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)')

    // Subcontractor indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_subcontractors_company ON subcontractors(company_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_subcontractors_abn ON subcontractors(abn)')

    // COC Documents indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_coc_documents_subcontractor ON coc_documents(subcontractor_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_coc_documents_project ON coc_documents(project_id)')

    // Verifications indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_verifications_coc ON verifications(coc_document_id)')

    // Audit logs indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)')

    // Password reset tokens indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)')

    // Magic link tokens indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token ON magic_link_tokens(token)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON magic_link_tokens(email)')

    // Notifications indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read)')

    // OAuth indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_connections_company ON oauth_connections(company_id)')
  },
  down: (db) => {
    // Drop all indexes
    db.exec('DROP INDEX IF EXISTS idx_users_email')
    db.exec('DROP INDEX IF EXISTS idx_users_company')
    db.exec('DROP INDEX IF EXISTS idx_sessions_token')
    db.exec('DROP INDEX IF EXISTS idx_sessions_user')
    db.exec('DROP INDEX IF EXISTS idx_projects_company')
    db.exec('DROP INDEX IF EXISTS idx_projects_status')
    db.exec('DROP INDEX IF EXISTS idx_subcontractors_company')
    db.exec('DROP INDEX IF EXISTS idx_subcontractors_abn')
    db.exec('DROP INDEX IF EXISTS idx_coc_documents_subcontractor')
    db.exec('DROP INDEX IF EXISTS idx_coc_documents_project')
    db.exec('DROP INDEX IF EXISTS idx_verifications_coc')
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_company')
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_user')
    db.exec('DROP INDEX IF EXISTS idx_password_reset_tokens_token')
    db.exec('DROP INDEX IF EXISTS idx_password_reset_tokens_user')
    db.exec('DROP INDEX IF EXISTS idx_magic_link_tokens_token')
    db.exec('DROP INDEX IF EXISTS idx_magic_link_tokens_email')
    db.exec('DROP INDEX IF EXISTS idx_notifications_user')
    db.exec('DROP INDEX IF EXISTS idx_notifications_company')
    db.exec('DROP INDEX IF EXISTS idx_notifications_read')
    db.exec('DROP INDEX IF EXISTS idx_oauth_states_state')
    db.exec('DROP INDEX IF EXISTS idx_oauth_connections_company')
  }
}
