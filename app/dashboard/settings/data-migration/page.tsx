'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileArchive,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  RefreshCw,
  Download,
  Trash2,
  Play,
  ChevronRight,
  Search
} from 'lucide-react'

interface Project {
  id: string
  name: string
}

interface MigrationDocument {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  classification: {
    classification: 'coc' | 'vendor_list' | 'policy_schedule' | 'other'
    confidence: number
  }
  status: 'pending' | 'processed' | 'error'
  errorMessage?: string
}

interface ExtractedVendor {
  name: string
  abn?: string
  email?: string
  phone?: string
  address?: string
}

interface ExtractedCOCData {
  vendorName: string
  vendorAbn?: string
  insurerName: string
  policyNumber: string
  policyStartDate: string
  policyEndDate: string
  coverages: Array<{
    type: string
    limit: number
    excess?: number
  }>
}

interface VendorMatch {
  extractedVendor: ExtractedVendor
  matchedSubcontractorId?: string
  matchedSubcontractorName?: string
  matchConfidence?: number
}

interface COCDocument {
  documentId: string
  vendorMatch?: string
  data: ExtractedCOCData
}

interface MigrationSession {
  id: string
  projectId: string
  status: 'uploading' | 'classifying' | 'reviewing' | 'importing' | 'completed' | 'failed'
  documents: MigrationDocument[]
  vendorsToCreate: ExtractedVendor[]
  vendorsToMatch: VendorMatch[]
  cocDocuments: COCDocument[]
  createdAt: string
  updatedAt: string
}

export default function DataMigrationPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [session, setSession] = useState<MigrationSession | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
        if (data.projects?.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!selectedProject) {
      setError('Please select a project first')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', selectedProject)

    try {
      const res = await fetch('/api/migration', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setSession(data.session)
      setStep('review')
      setSuccess(`Successfully processed ${data.summary.documentsProcessed} documents`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleImport() {
    if (!session) return

    setIsImporting(true)
    setError(null)

    try {
      const res = await fetch('/api/migration/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          importCOCs: true
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setStep('complete')
      setSuccess(`Import complete! Created ${data.results.subcontractorsCreated} vendors, imported ${data.results.documentsImported} COCs`)

      // Refresh session
      const sessionRes = await fetch(`/api/migration?sessionId=${session.id}`)
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setSession(sessionData.session)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleCancel() {
    if (!session) return

    try {
      await fetch(`/api/migration?sessionId=${session.id}`, {
        method: 'DELETE'
      })
      setSession(null)
      setStep('upload')
      setSuccess(null)
    } catch (err) {
      setError('Failed to cancel migration')
    }
  }

  function getClassificationIcon(classification: string) {
    switch (classification) {
      case 'coc':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'vendor_list':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />
      case 'policy_schedule':
        return <FileText className="w-5 h-5 text-purple-500" />
      default:
        return <FileText className="w-5 h-5 text-gray-400" />
    }
  }

  function getClassificationLabel(classification: string) {
    switch (classification) {
      case 'coc':
        return 'Certificate of Currency'
      case 'vendor_list':
        return 'Vendor List'
      case 'policy_schedule':
        return 'Policy Schedule'
      default:
        return 'Other'
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Settings
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FileArchive className="w-8 h-8 text-blue-600" />
          AI-Powered Data Migration
        </h1>
        <p className="mt-2 text-gray-600">
          Bulk import your existing insurance compliance data. Upload a ZIP file containing COC documents,
          vendor lists (Excel/CSV), or policy schedules, and our AI will automatically extract and classify the data.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : step === 'review' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-100' : step === 'review' || step === 'complete' ? 'bg-green-100' : 'bg-gray-100'}`}>
              {step === 'review' || step === 'complete' ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <span className="font-medium">Upload</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
          <div className={`flex items-center gap-2 ${step === 'review' ? 'text-blue-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-blue-100' : step === 'complete' ? 'bg-green-100' : 'bg-gray-100'}`}>
              {step === 'complete' ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <span className="font-medium">Review & Map</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
          <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'complete' ? 'bg-green-100' : 'bg-gray-100'}`}>
              {step === 'complete' ? <CheckCircle className="w-5 h-5" /> : '3'}
            </div>
            <span className="font-medium">Complete</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Project & Upload Files</h2>

          {/* Project Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Imported vendors and COCs will be associated with this project.
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${isUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-600">Processing files...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-sm text-gray-500">
                    ZIP, PDF, Excel, CSV, or images (max 50MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Supported Formats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Supported File Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <FileArchive className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">ZIP Archive</p>
                  <p className="text-sm text-gray-500">Multiple files in one upload</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">PDF Documents</p>
                  <p className="text-sm text-gray-500">COCs, policy schedules</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Spreadsheets</p>
                  <p className="text-sm text-gray-500">Vendor lists (XLSX, CSV)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && session && (
        <div className="space-y-6">
          {/* Documents Processed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Processed Documents ({session.documents.length})
            </h2>
            <div className="space-y-2">
              {session.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getClassificationIcon(doc.classification.classification)}
                    <div>
                      <p className="font-medium text-gray-900">{doc.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {getClassificationLabel(doc.classification.classification)} •
                        {(doc.classification.confidence * 100).toFixed(0)}% confidence •
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  {doc.status === 'processed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : doc.status === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* New Vendors to Create */}
          {session.vendorsToCreate.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                New Vendors to Create ({session.vendorsToCreate.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Name</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">ABN</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Email</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.vendorsToCreate.map((vendor, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-medium text-gray-900">{vendor.name}</td>
                        <td className="py-2 px-3 text-gray-600 font-mono text-sm">{vendor.abn || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{vendor.email || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{vendor.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matched Vendors */}
          {session.vendorsToMatch.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-500" />
                Matched to Existing Vendors ({session.vendorsToMatch.length})
              </h2>
              <div className="space-y-2">
                {session.vendorsToMatch.map((match, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Extracted</p>
                        <p className="font-medium text-gray-900">{match.extractedVendor.name}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Matched To</p>
                        <p className="font-medium text-green-700">{match.matchedSubcontractorName}</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      {((match.matchConfidence || 0) * 100).toFixed(0)}% match
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COC Documents */}
          {session.cocDocuments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                COC Documents to Import ({session.cocDocuments.length})
              </h2>
              <div className="space-y-3">
                {session.cocDocuments.map((coc, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{coc.data.vendorName}</p>
                        <p className="text-sm text-gray-500">{coc.data.insurerName} • Policy #{coc.data.policyNumber}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {coc.data.policyStartDate} - {coc.data.policyEndDate}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {coc.data.coverages.map((coverage, cidx) => (
                        <span key={cidx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {coverage.type.replace(/_/g, ' ')}: {formatCurrency(coverage.limit)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel Migration
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Confirm & Import
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Migration Complete!</h2>
          <p className="text-gray-600 mb-6">
            Your data has been successfully imported into the system.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">{session?.vendorsToCreate.length || 0}</p>
              <p className="text-sm text-gray-500">Vendors Created</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600">{session?.vendorsToMatch.length || 0}</p>
              <p className="text-sm text-gray-500">Vendors Matched</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-600">{session?.cocDocuments.length || 0}</p>
              <p className="text-sm text-gray-500">COCs Imported</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Link
              href={`/dashboard/projects/${selectedProject}`}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              View Project
            </Link>
            <button
              onClick={() => {
                setSession(null)
                setStep('upload')
                setSuccess(null)
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Start New Migration
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
