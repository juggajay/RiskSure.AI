import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// ============================================================================
// SCHEDULED JOBS CONFIGURATION
// All times are in UTC. Using UTC+11 (AEDT) offset for Australian Eastern time.
// During winter (AEST/UTC+10), jobs will run 1 hour early.
// ============================================================================

// Job A: Daily Expiration Check - 6:00 AM AEDT = 19:00 UTC previous day
// Purpose: Find certificates expiring in next 30/14/7/0 days and queue alerts
crons.daily(
  "daily-expiration-check",
  { hourUTC: 19, minuteUTC: 0 },
  internal.cronJobs.runExpirationCheck
)

// Job E: Exception Expiry - 6:30 AM AEDT = 19:30 UTC previous day
// Purpose: Expire exceptions that have passed their expiry date
crons.daily(
  "exception-expiry-check",
  { hourUTC: 19, minuteUTC: 30 },
  internal.cronJobs.runExceptionExpiry
)

// Job B: Morning Brief - 7:00 AM AEDT = 20:00 UTC previous day
// Purpose: Send daily compliance summary to admins/risk managers
crons.daily(
  "morning-brief-email",
  { hourUTC: 20, minuteUTC: 0 },
  internal.cronJobs.runMorningBrief
)

// Job C: Follow-up Sequences - 8:00 AM AEDT = 21:00 UTC previous day
// Purpose: Send follow-up emails to non-responsive brokers
crons.daily(
  "automated-follow-ups",
  { hourUTC: 21, minuteUTC: 0 },
  internal.cronJobs.runFollowUpSequence
)

// Job D: Stop-Work Alerts - 9:00 AM AEDT = 22:00 UTC previous day
// Purpose: Alert project managers about non-compliant subs scheduled on-site
crons.daily(
  "stop-work-risk-alerts",
  { hourUTC: 22, minuteUTC: 0 },
  internal.cronJobs.runStopWorkAlerts
)

export default crons
