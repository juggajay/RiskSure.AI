import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
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
      sentAt: undefined,
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

// Get communications by subcontractor with project details
export const getBySubcontractorWithDetails = query({
  args: { subcontractorId: v.id("subcontractors") },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_subcontractor", (q) => q.eq("subcontractorId", args.subcontractorId))
      .order("desc")
      .collect()

    // Get project details for each communication
    const results = await Promise.all(
      communications.map(async (comm) => {
        const project = await ctx.db.get(comm.projectId)
        return {
          ...comm,
          projectName: project?.name || null,
        }
      })
    )

    return results
  },
})
