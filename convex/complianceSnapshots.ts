import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Get compliance history for a company
export const getHistory = query({
  args: {
    companyId: v.id("companies"),
    startDate: v.number(),
  },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("complianceSnapshots")
      .withIndex("by_company_date", (q) =>
        q.eq("companyId", args.companyId).gte("snapshotDate", args.startDate)
      )
      .collect()

    return snapshots.map((s) => ({
      date: new Date(s.snapshotDate).toISOString().split("T")[0],
      total: s.totalSubcontractors,
      compliant: s.compliant,
      nonCompliant: s.nonCompliant,
      pending: s.pending,
      exception: s.exception,
      complianceRate: s.complianceRate,
    }))
  },
})

// Check if today's snapshot exists
export const getTodaySnapshot = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    const snapshot = await ctx.db
      .query("complianceSnapshots")
      .withIndex("by_company_date", (q) =>
        q.eq("companyId", args.companyId).eq("snapshotDate", todayTimestamp)
      )
      .first()

    return snapshot
  },
})

// Calculate and create today's snapshot (OPTIMIZED - parallel queries)
export const createTodaySnapshot = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    // Check if today's snapshot already exists
    const existing = await ctx.db
      .query("complianceSnapshots")
      .withIndex("by_company_date", (q) =>
        q.eq("companyId", args.companyId).eq("snapshotDate", todayTimestamp)
      )
      .first()

    if (existing) {
      return existing._id
    }

    // Get all active projects for the company
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) =>
        q.eq("companyId", args.companyId).eq("status", "active")
      )
      .collect()

    if (projects.length === 0) {
      // No active projects - create empty snapshot
      const snapshotId = await ctx.db.insert("complianceSnapshots", {
        companyId: args.companyId,
        snapshotDate: todayTimestamp,
        totalSubcontractors: 0,
        compliant: 0,
        nonCompliant: 0,
        pending: 0,
        exception: 0,
        complianceRate: 0,
      })
      return snapshotId
    }

    // OPTIMIZED: Fetch all projectSubcontractors in PARALLEL instead of sequential loop
    const projectSubsArrays = await Promise.all(
      projects.map((project) =>
        ctx.db
          .query("projectSubcontractors")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect()
      )
    )

    // Calculate compliance stats from all results
    let total = 0
    let compliant = 0
    let nonCompliant = 0
    let pending = 0
    let exception = 0

    for (const projectSubs of projectSubsArrays) {
      for (const ps of projectSubs) {
        total++
        switch (ps.status) {
          case "compliant":
            compliant++
            break
          case "non_compliant":
            nonCompliant++
            break
          case "pending":
            pending++
            break
          case "exception":
            exception++
            break
        }
      }
    }

    const complianceRate =
      total > 0 ? Math.round(((compliant + exception) / total) * 100) : 0

    // Create the snapshot
    const snapshotId = await ctx.db.insert("complianceSnapshots", {
      companyId: args.companyId,
      snapshotDate: todayTimestamp,
      totalSubcontractors: total,
      compliant,
      nonCompliant,
      pending,
      exception,
      complianceRate,
    })

    return snapshotId
  },
})

// Generate historical snapshots (for demo/initial data) - OPTIMIZED
export const generateHistoricalSnapshots = mutation({
  args: {
    companyId: v.id("companies"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current compliance stats
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) =>
        q.eq("companyId", args.companyId).eq("status", "active")
      )
      .collect()

    // OPTIMIZED: Fetch all projectSubcontractors in PARALLEL
    const projectSubsArrays = await Promise.all(
      projects.map((project) =>
        ctx.db
          .query("projectSubcontractors")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect()
      )
    )

    let currentTotal = 0
    let currentCompliant = 0
    let currentException = 0

    for (const projectSubs of projectSubsArrays) {
      for (const ps of projectSubs) {
        currentTotal++
        if (ps.status === "compliant") currentCompliant++
        if (ps.status === "exception") currentException++
      }
    }

    const total = currentTotal || 1
    const baseCompliance = currentCompliant + currentException

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - args.days)
    startDate.setHours(0, 0, 0, 0)

    // OPTIMIZED: Get ALL existing snapshots in date range in ONE query
    const existingSnapshots = await ctx.db
      .query("complianceSnapshots")
      .withIndex("by_company_date", (q) =>
        q.eq("companyId", args.companyId).gte("snapshotDate", startDate.getTime())
      )
      .collect()

    // Build a set of existing dates for fast lookup
    const existingDates = new Set(existingSnapshots.map((s) => s.snapshotDate))

    // Generate snapshots for missing days only
    const insertPromises: Promise<Id<"complianceSnapshots">>[] = []

    for (let i = args.days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const dateTimestamp = date.getTime()

      // Skip if snapshot already exists
      if (existingDates.has(dateTimestamp)) {
        continue
      }

      // Add variation to simulate historical changes
      const dayFactor = (args.days - i) / args.days
      const variation = Math.sin(i * 0.5) * 0.1

      let compliant = Math.round(
        baseCompliance * (0.7 + dayFactor * 0.3 + variation)
      )
      compliant = Math.max(0, Math.min(total, compliant))

      const remaining = total - compliant
      const nonCompliant = Math.round(remaining * (1 - dayFactor * 0.5))
      const pending = remaining - nonCompliant

      const complianceRate = Math.round(
        ((compliant + currentException) / total) * 100
      )

      // Queue insert (Convex will batch these)
      insertPromises.push(
        ctx.db.insert("complianceSnapshots", {
          companyId: args.companyId,
          snapshotDate: dateTimestamp,
          totalSubcontractors: total,
          compliant,
          nonCompliant: Math.max(0, nonCompliant),
          pending: Math.max(0, pending),
          exception: currentException,
          complianceRate: Math.min(100, Math.max(0, complianceRate)),
        })
      )
    }

    // Execute all inserts
    await Promise.all(insertPromises)

    return { success: true }
  },
})
