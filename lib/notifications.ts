import { getDb } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export type NotificationType =
  | "coc_received"
  | "coc_verified"
  | "coc_failed"
  | "exception_created"
  | "exception_approved"
  | "exception_expired"
  | "expiration_warning"
  | "communication_sent"
  | "stop_work_risk"
  | "system"

export interface CreateNotificationParams {
  userId: string
  companyId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  entityType?: string
  entityId?: string
}

export function createNotification(params: CreateNotificationParams): string {
  const db = getDb()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO notifications (id, user_id, company_id, type, title, message, link, entity_type, entity_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.userId,
    params.companyId,
    params.type,
    params.title,
    params.message,
    params.link || null,
    params.entityType || null,
    params.entityId || null
  )

  return id
}

export function createNotificationForCompanyAdmins(
  companyId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  entityType?: string,
  entityId?: string
): string[] {
  const db = getDb()

  // Get all admins and risk managers for the company
  const users = db.prepare(`
    SELECT id FROM users
    WHERE company_id = ? AND role IN ('admin', 'risk_manager')
  `).all(companyId) as { id: string }[]

  const notificationIds: string[] = []

  for (const user of users) {
    const id = createNotification({
      userId: user.id,
      companyId,
      type,
      title,
      message,
      link,
      entityType,
      entityId
    })
    notificationIds.push(id)
  }

  return notificationIds
}

export function createNotificationForProjectTeam(
  projectId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  entityType?: string,
  entityId?: string
): string[] {
  const db = getDb()

  // Get project details and team members
  const project = db.prepare(`
    SELECT company_id, project_manager_id FROM projects WHERE id = ?
  `).get(projectId) as { company_id: string, project_manager_id: string | null } | undefined

  if (!project) {
    return []
  }

  // Get all relevant users (admins, risk managers, and project manager)
  const users = db.prepare(`
    SELECT id FROM users
    WHERE company_id = ? AND (
      role IN ('admin', 'risk_manager')
      OR id = ?
    )
  `).all(project.company_id, project.project_manager_id || '') as { id: string }[]

  const notificationIds: string[] = []
  const notifiedUserIds = new Set<string>()

  for (const user of users) {
    if (!notifiedUserIds.has(user.id)) {
      notifiedUserIds.add(user.id)
      const id = createNotification({
        userId: user.id,
        companyId: project.company_id,
        type,
        title,
        message,
        link,
        entityType,
        entityId
      })
      notificationIds.push(id)
    }
  }

  return notificationIds
}
