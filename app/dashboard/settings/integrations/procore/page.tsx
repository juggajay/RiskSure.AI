"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Users,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProcoreProject {
  id: number
  name: string
  address?: string
  city?: string
  state_code?: string
  is_demo: boolean
  syncStatus?: 'synced' | 'not_synced' | 'conflict'
  shieldProjectId?: string
}

interface ProcoreVendor {
  id: number
  name: string
  abn?: string
  email_address?: string
  business_phone?: string
  syncStatus?: 'synced' | 'not_synced' | 'conflict' | 'abn_missing'
  shieldSubcontractorId?: string
  conflictReason?: string
}

interface ConnectionStatus {
  connected: boolean
  companyName?: string
  companyId?: number
  devMode?: boolean
  projectCount?: number
  vendorCount?: number
}

export default function ProcoreSyncPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)

  // Projects state
  const [projects, setProjects] = useState<ProcoreProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set())
  const [projectSearch, setProjectSearch] = useState("")
  const [syncingProjects, setSyncingProjects] = useState(false)

  // Vendors state
  const [vendors, setVendors] = useState<ProcoreVendor[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [selectedVendors, setSelectedVendors] = useState<Set<number>>(new Set())
  const [vendorSearch, setVendorSearch] = useState("")
  const [syncingVendors, setSyncingVendors] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/integrations/status")
      if (response.ok) {
        const data = await response.json()
        const procoreStatus = data.construction?.procore
        if (!procoreStatus?.connected) {
          router.push("/dashboard/settings/integrations")
          return
        }
        setStatus(procoreStatus)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch connection status.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    setLoadingProjects(true)
    try {
      const response = await fetch("/api/procore/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch projects from Procore.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while fetching projects.",
        variant: "destructive"
      })
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchVendors = async () => {
    setLoadingVendors(true)
    try {
      const response = await fetch("/api/procore/vendors")
      if (response.ok) {
        const data = await response.json()
        setVendors(data.vendors || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch vendors from Procore.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while fetching vendors.",
        variant: "destructive"
      })
    } finally {
      setLoadingVendors(false)
    }
  }

  const handleSyncProjects = async () => {
    if (selectedProjects.size === 0) {
      toast({
        title: "No projects selected",
        description: "Please select at least one project to sync.",
        variant: "destructive"
      })
      return
    }

    setSyncingProjects(true)
    try {
      const response = await fetch("/api/procore/projects/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: Array.from(selectedProjects) })
      })

      const data = await response.json()
      if (response.ok) {
        toast({
          title: "Projects Synced",
          description: data.message || `Synced ${data.result?.created || 0} projects.`
        })
        setSelectedProjects(new Set())
        fetchProjects() // Refresh the list
        fetchStatus() // Update stats
      } else {
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync projects.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "An error occurred during sync.",
        variant: "destructive"
      })
    } finally {
      setSyncingProjects(false)
    }
  }

  const handleSyncVendors = async () => {
    if (selectedVendors.size === 0) {
      toast({
        title: "No vendors selected",
        description: "Please select at least one vendor to sync.",
        variant: "destructive"
      })
      return
    }

    setSyncingVendors(true)
    try {
      const response = await fetch("/api/procore/vendors/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorIds: Array.from(selectedVendors),
          mergeExisting: true,
          skipDuplicates: false
        })
      })

      const data = await response.json()
      if (response.ok) {
        toast({
          title: "Vendors Synced",
          description: data.message || `Synced ${data.result?.created || 0} vendors.`
        })
        if (data.warnings && data.warnings.length > 0) {
          toast({
            title: "Warnings",
            description: data.warnings.slice(0, 3).join(", "),
            variant: "default"
          })
        }
        setSelectedVendors(new Set())
        fetchVendors() // Refresh the list
        fetchStatus() // Update stats
      } else {
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync vendors.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "An error occurred during sync.",
        variant: "destructive"
      })
    } finally {
      setSyncingVendors(false)
    }
  }

  const toggleProject = (id: number) => {
    setSelectedProjects(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleVendor = (id: number) => {
    setSelectedVendors(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.address?.toLowerCase().includes(projectSearch.toLowerCase())
  )

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.abn?.includes(vendorSearch) ||
    v.email_address?.toLowerCase().includes(vendorSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      {/* Top Bar */}
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/settings/integrations")}
            aria-label="Back to integrations"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">Procore Sync</h1>
            <p className="text-slate-500">
              {status?.companyName && `Connected to ${status.companyName}`}
              {status?.devMode && " (Dev Mode)"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {status?.projectCount !== undefined && (
              <span className="flex items-center gap-1 text-slate-600">
                <Building2 className="h-4 w-4" />
                {status.projectCount} projects
              </span>
            )}
            {status?.vendorCount !== undefined && (
              <span className="flex items-center gap-1 text-slate-600">
                <Users className="h-4 w-4" />
                {status.vendorCount} vendors
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 md:p-8 lg:p-12 max-w-5xl">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vendors
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={fetchProjects}
                  disabled={loadingProjects}
                >
                  {loadingProjects ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {projects.length === 0 ? "Load Projects" : "Refresh"}
                </Button>
                {selectedProjects.size > 0 && (
                  <Button onClick={handleSyncProjects} disabled={syncingProjects}>
                    {syncingProjects ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Sync {selectedProjects.size} Project{selectedProjects.size > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>

            {loadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">No projects loaded yet.</p>
                  <Button onClick={fetchProjects}>Load Projects from Procore</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all ${
                      selectedProjects.has(project.id) ? 'border-orange-500 bg-orange-50' : 'hover:border-slate-300'
                    }`}
                    onClick={() => project.syncStatus !== 'synced' && toggleProject(project.id)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedProjects.has(project.id)}
                          disabled={project.syncStatus === 'synced'}
                          onCheckedChange={() => toggleProject(project.id)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {project.name}
                            {project.is_demo && (
                              <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Demo</span>
                            )}
                          </p>
                          {project.address && (
                            <p className="text-sm text-slate-500">{project.address}</p>
                          )}
                        </div>
                        <SyncStatusBadge status={project.syncStatus} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search vendors by name, ABN, or email..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={fetchVendors}
                  disabled={loadingVendors}
                >
                  {loadingVendors ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {vendors.length === 0 ? "Load Vendors" : "Refresh"}
                </Button>
                {selectedVendors.size > 0 && (
                  <Button onClick={handleSyncVendors} disabled={syncingVendors}>
                    {syncingVendors ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Sync {selectedVendors.size} Vendor{selectedVendors.size > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>

            {loadingVendors ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : vendors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">No vendors loaded yet.</p>
                  <Button onClick={fetchVendors}>Load Vendors from Procore</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredVendors.map((vendor) => (
                  <Card
                    key={vendor.id}
                    className={`cursor-pointer transition-all ${
                      selectedVendors.has(vendor.id) ? 'border-orange-500 bg-orange-50' : 'hover:border-slate-300'
                    }`}
                    onClick={() => vendor.syncStatus !== 'synced' && toggleVendor(vendor.id)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedVendors.has(vendor.id)}
                          disabled={vendor.syncStatus === 'synced'}
                          onCheckedChange={() => toggleVendor(vendor.id)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{vendor.name}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            {vendor.abn && <span>ABN: {vendor.abn}</span>}
                            {vendor.email_address && <span>{vendor.email_address}</span>}
                          </div>
                          {vendor.conflictReason && (
                            <p className="text-xs text-amber-600 mt-1">{vendor.conflictReason}</p>
                          )}
                        </div>
                        <SyncStatusBadge status={vendor.syncStatus} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function SyncStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case 'synced':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Synced
        </span>
      )
    case 'conflict':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <AlertCircle className="h-3 w-3" />
          Conflict
        </span>
      )
    case 'abn_missing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <AlertCircle className="h-3 w-3" />
          No ABN
        </span>
      )
    default:
      return null
  }
}
