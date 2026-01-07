"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FolderKanban,
  Plus,
  Search,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Filter,
  ArrowUpDown
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

interface Project {
  id: string
  name: string
  address: string | null
  state: string | null
  status: string
  start_date: string | null
  end_date: string | null
  estimated_value: number | null
  project_manager_name: string | null
  subcontractor_count: number
  compliant_count: number
  created_at: string
}

interface User {
  id: string
  role: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Completed' },
  on_hold: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'On Hold' }
}

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

type SortOption = 'name' | 'compliance_asc' | 'compliance_desc' | 'date'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [projectsRes, userRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/auth/me')
      ])

      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects)
      }

      if (userRes.ok) {
        const data = await userRes.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const canCreateProject = user && ['admin', 'risk_manager'].includes(user.role)

  // Get unique states from projects for filter options
  const availableStates = Array.from(new Set(projects.map(p => p.state).filter(Boolean))) as string[]

  // Trim search query - whitespace-only should be treated as empty search
  const trimmedSearchQuery = searchQuery.trim()

  // Filter projects
  const filteredProjects = projects
    .filter(project => {
      // Search filter - empty or whitespace-only shows all results
      const matchesSearch = !trimmedSearchQuery ||
        project.name.toLowerCase().includes(trimmedSearchQuery.toLowerCase()) ||
        project.address?.toLowerCase().includes(trimmedSearchQuery.toLowerCase()) ||
        project.state?.toLowerCase().includes(trimmedSearchQuery.toLowerCase())

      // State filter
      const matchesState = stateFilter === 'all' || project.state === stateFilter

      return matchesSearch && matchesState
    })
    .sort((a, b) => {
      // Calculate compliance rates
      const complianceA = a.subcontractor_count > 0
        ? (a.compliant_count / a.subcontractor_count) * 100
        : -1
      const complianceB = b.subcontractor_count > 0
        ? (b.compliant_count / b.subcontractor_count) * 100
        : -1

      switch (sortBy) {
        case 'compliance_asc':
          return complianceA - complianceB
        case 'compliance_desc':
          return complianceB - complianceA
        case 'date':
          const dateA = a.start_date ? new Date(a.start_date).getTime() : 0
          const dateB = b.start_date ? new Date(b.start_date).getTime() : 0
          return dateB - dateA
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

  return (
    <>
      {/* Top Bar */}
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
            <p className="text-slate-500">Manage your construction projects and compliance</p>
          </div>
          {canCreateProject && (
            <Link href="/dashboard/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Projects Content */}
      <div className="p-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-[140px]"
            >
              <option value="all">All States</option>
              {availableStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </Select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-[180px]"
            >
              <option value="name">Name (A-Z)</option>
              <option value="compliance_desc">Compliance (High to Low)</option>
              <option value="compliance_asc">Compliance (Low to High)</option>
              <option value="date">Date (Newest First)</option>
            </Select>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-slate-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </h3>
                <p className="text-slate-500 mb-4">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : user?.role === 'project_manager'
                      ? 'You have not been assigned to any projects yet'
                      : 'Create your first project to get started'
                  }
                </p>
                {canCreateProject && !searchQuery && (
                  <Link href="/dashboard/projects/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.active
  const complianceRate = project.subcontractor_count > 0
    ? Math.round((project.compliant_count / project.subcontractor_count) * 100)
    : null

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="h-full hover:border-primary transition-colors cursor-pointer group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate group-hover:text-primary" title={project.name}>
                {project.name}
              </CardTitle>
              {project.address && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate" title={project.address}>{project.address}</span>
                </CardDescription>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* State and Date */}
            <div className="flex items-center gap-4 text-sm text-slate-500">
              {project.state && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {project.state}
                </span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(project.start_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Subcontractors */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm">
                {project.subcontractor_count} subcontractor{project.subcontractor_count !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Compliance Rate */}
            {complianceRate !== null ? (
              <div className="flex items-center gap-2">
                {complianceRate === 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : complianceRate < 50 ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Compliance</span>
                    <span className="font-medium">{complianceRate}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        complianceRate === 100
                          ? 'bg-green-500'
                          : complianceRate < 50
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${complianceRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                <span>No subcontractors assigned</span>
              </div>
            )}

            {/* Project Manager */}
            {project.project_manager_name && (
              <div className="text-xs text-slate-400 pt-2 border-t">
                PM: {project.project_manager_name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
