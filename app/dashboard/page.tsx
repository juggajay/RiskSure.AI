"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  FolderKanban,
  Bell,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface User {
  id: string
  email: string
  name: string
  role: string
  company: {
    id: string
    name: string
    abn: string
  } | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !user) {
    return null // Layout handles loading state
  }

  return (
    <>
      {/* Top Bar */}
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Good {getTimeOfDay()}, {user.name.split(" ")[0]}!</h1>
            <p className="text-slate-500">Here&apos;s your compliance overview for today.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Compliance Rate"
            value="--"
            description="Overall portfolio"
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            trend="No data yet"
          />
          <StatCard
            title="Active Projects"
            value="0"
            description="With subcontractors"
            icon={<FolderKanban className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            title="Pending Reviews"
            value="0"
            description="COCs awaiting review"
            icon={<Clock className="h-5 w-5 text-amber-500" />}
          />
          <StatCard
            title="Stop Work Risks"
            value="0"
            description="Critical issues"
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          />
        </div>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Get Started with RiskShield AI
            </CardTitle>
            <CardDescription>
              Complete these steps to set up your insurance compliance system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <QuickStartItem
                step={1}
                title="Create your first project"
                description="Add a construction project and configure insurance requirements"
                completed={false}
                href="/dashboard/projects/new"
              />
              <QuickStartItem
                step={2}
                title="Add subcontractors"
                description="Import or manually add your subcontractors"
                completed={false}
                href="/dashboard/subcontractors"
              />
              <QuickStartItem
                step={3}
                title="Upload a Certificate of Currency"
                description="Upload your first COC and watch AI verification in action"
                completed={false}
                href="/dashboard/documents/upload"
              />
              <QuickStartItem
                step={4}
                title="Configure notifications"
                description="Set up automated communications for deficiencies and reminders"
                completed={false}
                href="/dashboard/settings/notifications"
              />
            </div>
          </CardContent>
        </Card>

        {/* Morning Brief Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stop Work Risks</CardTitle>
              <CardDescription>Subcontractors on-site today with compliance issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No stop work risks</p>
                <p className="text-sm">All subcontractors are compliant</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New COCs Received</CardTitle>
              <CardDescription>Certificates received in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <FileCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No new certificates</p>
                <p className="text-sm">Upload a COC to get started</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  trend?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
            {trend && (
              <p className="text-xs text-slate-400 mt-2">{trend}</p>
            )}
          </div>
          <div className="p-2 bg-slate-100 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickStartItem({
  step,
  title,
  description,
  completed,
  href
}: {
  step: number
  title: string
  description: string
  completed: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary hover:bg-slate-50 transition-colors group"
    >
      <div className={`
        h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
        ${completed
          ? "bg-green-100 text-green-600"
          : "bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white"
        }
      `}>
        {completed ? <CheckCircle className="h-5 w-5" /> : step}
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary" />
    </Link>
  )
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}
