import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Create audit log entry
export const create = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    userId: v.optional(v.id("users")),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("auditLogs", {
      companyId: args.companyId,
      userId: args.userId,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      details: args.details || {},
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    })
    return logId
  },
})

// Get audit logs by company
export const getByCompany = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit || 100)

    return logs
  },
})

// Get audit logs by user
export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 100)

    return logs
  },
})

// Get audit logs by entity
export const getByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .take(args.limit || 100)

    return logs
  },
})

// Get recent audit logs
export const getRecent = query({
  args: {
    companyId: v.optional(v.id("companies")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.companyId) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .take(args.limit || 50)
    }

    return await ctx.db
      .query("auditLogs")
      .order("desc")
      .take(args.limit || 50)
  },
})
