import { v } from "convex/values"
import { mutation, query, internalMutation, internalQuery } from "./_generated/server"

// Job status type for validation
const cronJobStatus = v.union(
  v.literal("running"),
  v.literal("success"),
  v.literal("failed"),
  v.literal("partial")
)

// Start a cron job - creates log entry with status "running"
export const startJob = internalMutation({
  args: {
    jobName: v.string(),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("cronJobLogs", {
      jobName: args.jobName,
      startedAt: Date.now(),
      status: "running",
      recordsProcessed: 0,
    })
    return logId
  },
})

// Complete a cron job - updates log entry with final status
export const completeJob = internalMutation({
  args: {
    logId: v.id("cronJobLogs"),
    status: cronJobStatus,
    recordsProcessed: v.number(),
    errors: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId)
    if (!log) {
      throw new Error(`Cron job log not found: ${args.logId}`)
    }

    const completedAt = Date.now()
    const executionTimeMs = completedAt - log.startedAt

    await ctx.db.patch(args.logId, {
      status: args.status,
      completedAt,
      recordsProcessed: args.recordsProcessed,
      executionTimeMs,
      errors: args.errors,
      metadata: args.metadata,
    })

    return { executionTimeMs }
  },
})

// Get recent logs for a specific job
export const getRecentLogs = internalQuery({
  args: {
    jobName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20

    if (args.jobName) {
      const jobName = args.jobName
      return await ctx.db
        .query("cronJobLogs")
        .withIndex("by_job_name", (q) => q.eq("jobName", jobName))
        .order("desc")
        .take(limit)
    }

    return await ctx.db
      .query("cronJobLogs")
      .withIndex("by_started_at")
      .order("desc")
      .take(limit)
  },
})

// Get last successful run for a job (for idempotency checks)
export const getLastSuccessfulRun = internalQuery({
  args: {
    jobName: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("cronJobLogs")
      .withIndex("by_job_status", (q) =>
        q.eq("jobName", args.jobName).eq("status", "success")
      )
      .order("desc")
      .take(1)

    return logs[0] || null
  },
})

// Get job statistics
export const getJobStats = internalQuery({
  args: {
    jobName: v.string(),
    sinceDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.sinceDays || 7) * 24 * 60 * 60 * 1000

    const logs = await ctx.db
      .query("cronJobLogs")
      .withIndex("by_job_name", (q) => q.eq("jobName", args.jobName))
      .filter((q) => q.gte(q.field("startedAt"), since))
      .collect()

    const stats = {
      totalRuns: logs.length,
      successful: logs.filter((l) => l.status === "success").length,
      failed: logs.filter((l) => l.status === "failed").length,
      partial: logs.filter((l) => l.status === "partial").length,
      avgExecutionTimeMs: 0,
      totalRecordsProcessed: 0,
    }

    if (logs.length > 0) {
      const completedLogs = logs.filter((l) => l.executionTimeMs)
      stats.avgExecutionTimeMs = completedLogs.length > 0
        ? Math.round(
            completedLogs.reduce((sum, l) => sum + (l.executionTimeMs || 0), 0) /
              completedLogs.length
          )
        : 0
      stats.totalRecordsProcessed = logs.reduce(
        (sum, l) => sum + l.recordsProcessed,
        0
      )
    }

    return stats
  },
})

// Public query for dashboard - get all job statuses
export const getAllJobStatuses = query({
  args: {},
  handler: async (ctx) => {
    const jobNames = [
      "daily-expiration-check",
      "exception-expiry-check",
      "morning-brief-email",
      "automated-follow-ups",
      "stop-work-risk-alerts",
    ]

    const statuses = await Promise.all(
      jobNames.map(async (jobName) => {
        const lastRun = await ctx.db
          .query("cronJobLogs")
          .withIndex("by_job_name", (q) => q.eq("jobName", jobName))
          .order("desc")
          .first()

        const lastSuccess = await ctx.db
          .query("cronJobLogs")
          .withIndex("by_job_status", (q) =>
            q.eq("jobName", jobName).eq("status", "success")
          )
          .order("desc")
          .first()

        return {
          jobName,
          lastRun: lastRun
            ? {
                startedAt: lastRun.startedAt,
                completedAt: lastRun.completedAt,
                status: lastRun.status,
                recordsProcessed: lastRun.recordsProcessed,
                executionTimeMs: lastRun.executionTimeMs,
                errors: lastRun.errors,
              }
            : null,
          lastSuccessAt: lastSuccess?.completedAt || null,
        }
      })
    )

    return statuses
  },
})

// Public query for viewing recent logs
export const getRecentLogsPublic = query({
  args: {
    jobName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50

    if (args.jobName) {
      const jobName = args.jobName
      return await ctx.db
        .query("cronJobLogs")
        .withIndex("by_job_name", (q) => q.eq("jobName", jobName))
        .order("desc")
        .take(limit)
    }

    return await ctx.db
      .query("cronJobLogs")
      .withIndex("by_started_at")
      .order("desc")
      .take(limit)
  },
})
