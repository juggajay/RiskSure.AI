import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Exception risk level validator
const riskLevel = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
)

// Exception expiration type validator
const expirationType = v.union(
  v.literal("until_resolved"),
  v.literal("fixed_duration"),
  v.literal("specific_date"),
  v.literal("permanent")
)

// Exception status validator
const exceptionStatus = v.union(
  v.literal("pending_approval"),
  v.literal("active"),
  v.literal("expired"),
  v.literal("resolved"),
  v.literal("closed")
)

// Get exception by ID
export const getById = query({
  args: { id: v.id("exceptions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Get exceptions by project subcontractor
export const getByProjectSubcontractor = query({
  args: { projectSubcontractorId: v.id("projectSubcontractors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exceptions")
      .withIndex("by_project_subcontractor", (q) => q.eq("projectSubcontractorId", args.projectSubcontractorId))
      .order("desc")
      .collect()
  },
})

// Get exceptions by status
export const getByStatus = query({
  args: { status: exceptionStatus },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exceptions")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect()
  },
})

// Create exception
export const create = mutation({
  args: {
    projectSubcontractorId: v.id("projectSubcontractors"),
    verificationId: v.optional(v.id("verifications")),
    issueSummary: v.string(),
    reason: v.string(),
    riskLevel: riskLevel,
    createdByUserId: v.id("users"),
    expiresAt: v.optional(v.number()),
    expirationType: expirationType,
    supportingDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const exceptionId = await ctx.db.insert("exceptions", {
      projectSubcontractorId: args.projectSubcontractorId,
      verificationId: args.verificationId,
      issueSummary: args.issueSummary,
      reason: args.reason,
      riskLevel: args.riskLevel,
      createdByUserId: args.createdByUserId,
      approvedByUserId: undefined,
      approvedAt: undefined,
      expiresAt: args.expiresAt,
      expirationType: args.expirationType,
      status: "pending_approval",
      resolvedAt: undefined,
      resolutionType: undefined,
      resolutionNotes: undefined,
      supportingDocumentUrl: args.supportingDocumentUrl,
      updatedAt: Date.now(),
    })
    return exceptionId
  },
})

// Approve exception
export const approve = mutation({
  args: {
    id: v.id("exceptions"),
    approvedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "active",
      approvedByUserId: args.approvedByUserId,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Resolve exception
export const resolve = mutation({
  args: {
    id: v.id("exceptions"),
    resolutionType: v.string(),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "resolved",
      resolvedAt: Date.now(),
      resolutionType: args.resolutionType,
      resolutionNotes: args.resolutionNotes,
      updatedAt: Date.now(),
    })
  },
})

// Close exception
export const close = mutation({
  args: { id: v.id("exceptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "closed",
      updatedAt: Date.now(),
    })
  },
})

// Expire exceptions
export const expireOld = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const activeExceptions = await ctx.db
      .query("exceptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    let expiredCount = 0
    for (const exception of activeExceptions) {
      if (exception.expiresAt && exception.expiresAt < now) {
        await ctx.db.patch(exception._id, {
          status: "expired",
          updatedAt: now,
        })
        expiredCount++
      }
    }

    return expiredCount
  },
})

// Delete exception
export const remove = mutation({
  args: { id: v.id("exceptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

// Get exceptions by subcontractor (joins through projectSubcontractors)
export const getBySubcontractor = query({
  args: { subcontractorId: v.id("subcontractors") },
  handler: async (ctx, args) => {
    // Get all project_subcontractor records for this subcontractor
    const projectSubcontractors = await ctx.db
      .query("projectSubcontractors")
      .withIndex("by_subcontractor", (q) => q.eq("subcontractorId", args.subcontractorId))
      .collect()

    // Get exceptions for all those records
    const exceptions = []
    for (const ps of projectSubcontractors) {
      const psExceptions = await ctx.db
        .query("exceptions")
        .withIndex("by_project_subcontractor", (q) => q.eq("projectSubcontractorId", ps._id))
        .collect()

      // Get project details for each exception
      const project = await ctx.db.get(ps.projectId)
      for (const exc of psExceptions) {
        // Get created by user
        const createdBy = await ctx.db.get(exc.createdByUserId)
        // Get approved by user if exists
        const approvedBy = exc.approvedByUserId
          ? await ctx.db.get(exc.approvedByUserId)
          : null

        exceptions.push({
          ...exc,
          projectId: project?._id || null,
          projectName: project?.name || null,
          createdByName: createdBy?.name || null,
          approvedByName: approvedBy?.name || null,
        })
      }
    }

    // Sort by created date descending
    exceptions.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0))

    return exceptions
  },
})
