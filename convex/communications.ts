import { v } from "convex/values"
import { mutation, query, internalQuery, internalMutation } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Communication type validator
const communicationType = v.union(
  v.literal("deficiency"),
  v.literal("follow_up"),
  v.literal("confirmation"),
  v.literal("expiration_reminder"),
  v.literal("critical_alert")
)

// Communication channel validator
const communicationChannel = v.union(
  v.literal("email"),
  v.literal("sms")
)

// Communication status validator
const communicationStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("opened"),
  v.literal("failed")
)

// Get communication by ID
export const getById = query({
  args: { id: v.id("communications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Get communications by subcontractor
export const getBySubcontractor = query({
  args: { subcontractorId: v.id("subcontractors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("communications")
      .withIndex("by_subcontractor", (q) => q.eq("subcontractorId", args.subcontractorId))
      .order("desc")
      .collect()
  },
})

// Get communications by project
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("communications")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect()
  },
})

// Get communications by status
export const getByStatus = query({
  args: { status: communicationStatus },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("communications")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect()
  },
})

// Create communication
export const create = mutation({
  args: {
    subcontractorId: v.id("subcontractors"),
    projectId: v.id("projects"),
    verificationId: v.optional(v.id("verifications")),
    type: communicationType,
    channel: communicationChannel,
    recipientEmail: v.optional(v.string()),
    ccEmails: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    status: communicationStatus,
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const communicationId = await ctx.db.insert("communications", {
      subcontractorId: args.subcontractorId,
      projectId: args.projectId,
      verificationId: args.verificationId,
      type: args.type,
      channel: args.channel,
      recipientEmail: args.recipientEmail?.toLowerCase(),
      ccEmails: args.ccEmails,
      subject: args.subject,
      body: args.body,
      status: args.status,
      sentAt: args.sentAt,
      deliveredAt: undefined,
      openedAt: undefined,
      updatedAt: Date.now(),
    })
    return communicationId
  },
})

// Update communication status
export const updateStatus = mutation({
  args: {
    id: v.id("communications"),
    status: communicationStatus,
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

// Delete communication
export const remove = mutation({
  args: { id: v.id("communications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

// Get communications by subcontractor with project details - OPTIMIZED
export const getBySubcontractorWithDetails = query({
  args: { subcontractorId: v.id("subcontractors") },
  handler: async (ctx, args) => {
    // BATCH QUERY 1: Get communications
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_subcontractor", (q) => q.eq("subcontractorId", args.subcontractorId))
      .order("desc")
      .collect()

    if (communications.length === 0) return []

    // BATCH QUERY 2: Get all unique projects in parallel
    const projectIds = Array.from(new Set(communications.map((c) => c.projectId)))
    const projectPromises = projectIds.map((id) => ctx.db.get(id))
    const projectsArray = await Promise.all(projectPromises)
    const projectMap = new Map(
      projectsArray
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p._id.toString(), p])
    )

    // Process in memory
    return communications.map((comm) => {
      const project = projectMap.get(comm.projectId.toString())
      return {
        ...comm,
        projectName: project?.name || null,
      }
    })
  },
})

// List communications by company with subcontractor and project details - OPTIMIZED
export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // BATCH QUERY 1: Get all projects for this company
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect()

    if (projects.length === 0) return []

    const projectIds = Array.from(new Set(projects.map((p) => p._id)))
    const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]))

    // BATCH QUERY 2: Get communications for all projects in parallel
    const commsPromises = projectIds.map((projectId) =>
      ctx.db
        .query("communications")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .order("desc")
        .collect()
    )
    const commsArrays = await Promise.all(commsPromises)
    const allComms = commsArrays.flat()

    // Sort by creation time descending and limit
    allComms.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0))
    const limited = args.limit ? allComms.slice(0, args.limit) : allComms.slice(0, 100)

    if (limited.length === 0) return []

    // BATCH QUERY 3: Get all unique subcontractors in parallel
    const subIds = Array.from(new Set(limited.map((c) => c.subcontractorId)))
    const subPromises = subIds.map((id) => ctx.db.get(id))
    const subsArray = await Promise.all(subPromises)
    const subMap = new Map(
      subsArray
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) => [s._id.toString(), s])
    )

    // Process in memory
    return limited.map((comm) => {
      const subcontractor = subMap.get(comm.subcontractorId.toString())
      return {
        ...comm,
        subcontractor_name: subcontractor?.name || null,
        project_name: projectMap.get(comm.projectId.toString()) || null,
      }
    })
  },
})

// Find recent communications by recipient email
export const getRecentByRecipientEmail = query({
  args: {
    recipientEmail: v.string(),
    statuses: v.array(v.string()),
    daysBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000

    // Query all communications and filter by email and time
    // Since we don't have an index on recipientEmail, we need to scan
    const allComms = await ctx.db.query("communications").collect()

    const filtered = allComms.filter((comm) => {
      if (comm.recipientEmail?.toLowerCase() !== args.recipientEmail.toLowerCase()) return false
      if (!args.statuses.includes(comm.status)) return false
      if (!comm.sentAt || comm.sentAt < cutoffTime) return false
      return true
    })

    // Sort by sentAt descending
    filtered.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0))

    return filtered.slice(0, args.limit || 5)
  },
})

// Update communication from webhook event
export const updateFromWebhook = mutation({
  args: {
    id: v.id("communications"),
    status: communicationStatus,
    deliveredAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const comm = await ctx.db.get(args.id)
    if (!comm) throw new Error("Communication not found")

    // Status priority - only update if new status is higher or it's a failure
    const statusPriority: Record<string, number> = {
      pending: 0,
      sent: 1,
      delivered: 2,
      opened: 3,
      failed: -1, // Special case
    }

    const currentPriority = statusPriority[comm.status] ?? 0
    const newPriority = statusPriority[args.status] ?? 0

    // Only update if new status is higher priority or if it's a failure
    if (args.status === "failed" || newPriority > currentPriority) {
      await ctx.db.patch(args.id, {
        status: args.status,
        deliveredAt: args.deliveredAt || comm.deliveredAt,
        openedAt: args.openedAt || comm.openedAt,
        updatedAt: Date.now(),
      })
      return { updated: true, previousStatus: comm.status, newStatus: args.status }
    }

    return { updated: false, previousStatus: comm.status, newStatus: args.status }
  },
})

// ============================================================================
// Internal functions for cron jobs
// ============================================================================

// Internal query: Check if we already sent a communication of this type today
export const checkIfSentToday = internalQuery({
  args: {
    subcontractorId: v.id("subcontractors"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const startOfTodayMs = startOfToday.getTime()

    const communications = await ctx.db
      .query("communications")
      .withIndex("by_subcontractor", (q) => q.eq("subcontractorId", args.subcontractorId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .collect()

    // Check if any were sent today
    return communications.some(
      (c) => c.sentAt && c.sentAt >= startOfTodayMs
    )
  },
})

// Internal query: Get the follow-up count for a verification
export const getFollowUpCount = internalQuery({
  args: {
    verificationId: v.id("verifications"),
  },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_verification", (q) => q.eq("verificationId", args.verificationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("type"), "deficiency"),
          q.eq(q.field("type"), "follow_up")
        )
      )
      .collect()

    // Count follow-ups specifically
    return communications.filter((c) => c.type === "follow_up").length
  },
})

// Internal mutation: Mark communications for a verification as escalated
export const escalate = internalMutation({
  args: {
    verificationId: v.id("verifications"),
  },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_verification", (q) => q.eq("verificationId", args.verificationId))
      .collect()

    const now = Date.now()
    for (const comm of communications) {
      if (!comm.escalated) {
        await ctx.db.patch(comm._id, {
          escalated: true,
          escalatedAt: now,
          updatedAt: now,
        })
      }
    }

    return { escalatedCount: communications.length }
  },
})

// Internal mutation: Create a communication (for cron jobs)
export const createInternal = internalMutation({
  args: {
    subcontractorId: v.id("subcontractors"),
    projectId: v.id("projects"),
    verificationId: v.optional(v.id("verifications")),
    type: v.string(),
    channel: v.string(),
    recipientEmail: v.optional(v.string()),
    ccEmails: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.string(),
    sentAt: v.optional(v.number()),
    followUpCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const communicationId = await ctx.db.insert("communications", {
      subcontractorId: args.subcontractorId,
      projectId: args.projectId,
      verificationId: args.verificationId,
      type: args.type as "deficiency" | "follow_up" | "confirmation" | "expiration_reminder" | "critical_alert",
      channel: args.channel as "email" | "sms",
      recipientEmail: args.recipientEmail?.toLowerCase(),
      ccEmails: args.ccEmails,
      subject: args.subject,
      body: args.body,
      status: args.status as "pending" | "sent" | "delivered" | "opened" | "failed",
      sentAt: args.sentAt,
      deliveredAt: undefined,
      openedAt: undefined,
      followUpCount: args.followUpCount,
      escalated: false,
      escalatedAt: undefined,
      updatedAt: Date.now(),
    })
    return communicationId
  },
})

// Internal query: Check if we already sent a stop-work alert today for this project subcontractor
export const checkStopWorkAlertSentToday = internalQuery({
  args: {
    projectSubcontractorId: v.id("projectSubcontractors"),
  },
  handler: async (ctx, args) => {
    // Get the project subcontractor to find project and subcontractor IDs
    const ps = await ctx.db.get(args.projectSubcontractorId)
    if (!ps) return false

    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const startOfTodayMs = startOfToday.getTime()

    // Check for critical_alert type sent today
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_subcontractor", (q) => q.eq("subcontractorId", ps.subcontractorId))
      .filter((q) =>
        q.and(
          q.eq(q.field("projectId"), ps.projectId),
          q.eq(q.field("type"), "critical_alert")
        )
      )
      .collect()

    return communications.some(
      (c) => c.sentAt && c.sentAt >= startOfTodayMs
    )
  },
})
