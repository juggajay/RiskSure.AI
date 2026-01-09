"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface ProcoreCompany {
  id: number
  name: string
  is_active: boolean
}

export default function SelectProcoreCompanyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<ProcoreCompany[]>([])
  const [selecting, setSelecting] = useState<number | null>(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/integrations/procore/companies")
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch Procore companies. Please try again.",
          variant: "destructive"
        })
        router.push("/dashboard/settings/integrations")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      })
      router.push("/dashboard/settings/integrations")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCompany = async (companyId: number) => {
    setSelecting(companyId)
    try {
      const response = await fetch("/api/integrations/procore/select-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId })
      })

      if (response.ok) {
        router.push("/dashboard/settings/integrations?success=procore_company_selected")
      } else {
        const data = await response.json()
        toast({
          title: "Selection Failed",
          description: data.error || "Failed to select company. Please try again.",
          variant: "destructive"
        })
        setSelecting(null)
      }
    } catch (error) {
      toast({
        title: "Selection Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      })
      setSelecting(null)
    }
  }

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
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Select Procore Company</h1>
            <p className="text-slate-500">Choose which Procore company to connect</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
        <p className="text-sm text-slate-600 mb-6">
          Your Procore account has access to multiple companies. Select which company you want to sync with Shield-AI.
        </p>

        <div className="space-y-3">
          {companies.map((company) => (
            <Card
              key={company.id}
              className={`cursor-pointer transition-all hover:border-orange-300 ${
                selecting === company.id ? 'border-orange-500 bg-orange-50' : ''
              }`}
              onClick={() => !selecting && handleSelectCompany(company.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F47920] rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{company.name}</p>
                      <p className="text-sm text-slate-500">ID: {company.id}</p>
                    </div>
                  </div>
                  {selecting === company.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  ) : (
                    <Button variant="outline" size="sm">
                      Select
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {companies.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-slate-500">No companies found in your Procore account.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/dashboard/settings/integrations")}
                >
                  Back to Integrations
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
