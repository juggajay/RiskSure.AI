"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield,
  LogOut,
  Sun,
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  FolderKanban,
  Users,
  Bell,
  Settings,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

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
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (!response.ok) {
        throw new Error("Not authenticated")
      }
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <span className="text-lg text-slate-600">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-screen">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-lg font-semibold">RiskShield AI</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={<Sun />} label="Morning Brief" href="/dashboard" active />
          <NavItem icon={<FolderKanban />} label="Projects" href="/dashboard/projects" />
          <NavItem icon={<Users />} label="Subcontractors" href="/dashboard/subcontractors" />
          <NavItem icon={<FileCheck />} label="Documents" href="/dashboard/documents" />
          <NavItem icon={<AlertTriangle />} label="Exceptions" href="/dashboard/exceptions" />
          <NavItem icon={<Bell />} label="Communications" href="/dashboard/communications" />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1">
          <NavItem icon={<Settings />} label="Settings" href="/dashboard/settings" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.company?.name || "No company"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
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
      </main>
    </div>
  )
}

function NavItem({
  icon,
  label,
  href,
  active = false
}: {
  icon: React.ReactNode
  label: string
  href: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      <span className="h-5 w-5">{icon}</span>
      <span>{label}</span>
    </Link>
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
