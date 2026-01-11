import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create invitation
export const create = mutation({
  args: {
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    projectId: v.id("projects"),
    subcontractorId: v.id("subcontractors"),
    projectSubcontractorId: v.id("projectSubcontractors"),
  },
  handler: async (ctx, args) => {
    // Invalidate any existing invitations for this project-subcontractor
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_project_subcontractor", (q) =>
        q.eq("projectSubcontractorId", args.projectSubcontractorId)
      )
      .collect()

    for (const inv of existing) {
      if (!inv.used) {
        await ctx.db.patch(inv._id, { used: true })
      }
    }

    // Create new invitation
    const invitationId = await ctx.db.insert("invitations", {
      email: args.email.toLowerCase(),
      token: args.token,
      expiresAt: args.expiresAt,
      projectId: args.projectId,
      subcontractorId: args.subcontractorId,
      projectSubcontractorId: args.projectSubcontractorId,
      used: false,
    })

    return invitationId
  },
})

// Get invitation by token
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first()
  },
})

// Mark invitation as used
export const markUsed = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first()

    if (invitation) {
      await ctx.db.patch(invitation._id, { used: true })
    }
  },
})

// Get invitation by project-subcontractor
export const getByProjectSubcontractor = query({
  args: { projectSubcontractorId: v.id("projectSubcontractors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_project_subcontractor", (q) =>
        q.eq("projectSubcontractorId", args.projectSubcontractorId)
      )
      .filter((q) => q.eq(q.field("used"), false))
      .first()
  },
})
