import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

// Server-side Convex client for API routes
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!

let convexClient: ConvexHttpClient | null = null

export function getConvex(): ConvexHttpClient {
  if (!convexClient) {
    convexClient = new ConvexHttpClient(convexUrl)
  }
  return convexClient
}

// Re-export API for convenience
export { api }

// Re-export Id type
export type { Id }

// Helper to check if using Convex (always true after migration)
export function useConvex(): boolean {
  return !!process.env.NEXT_PUBLIC_CONVEX_URL
}
