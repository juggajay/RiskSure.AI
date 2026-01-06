"use client"

import { useState } from "react"
import {
  UserCog,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  Clock
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MOCK_USERS = [
  {
    id: '1',
    name: 'John Admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2 hours ago'
  },
  {
    id: '2',
    name: 'Sarah Manager',
    email: 'sarah@example.com',
    role: 'project_manager',
    status: 'active',
    lastLogin: '1 day ago'
  },
  {
    id: '3',
    name: 'Mike Risk',
    email: 'mike@example.com',
    role: 'risk_manager',
    status: 'active',
    lastLogin: '3 days ago'
  }
]

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
  risk_manager: { label: 'Risk Manager', color: 'bg-blue-100 text-blue-700' },
  project_manager: { label: 'Project Manager', color: 'bg-green-100 text-green-700' },
  project_administrator: { label: 'Project Admin', color: 'bg-amber-100 text-amber-700' },
  read_only: { label: 'Read Only', color: 'bg-slate-100 text-slate-700' }
}

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // This page is only accessible to admins (enforced by layout)

  return (
    <>
      {/* Top Bar */}
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
            <p className="text-slate-500">Invite users and manage access permissions</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </header>

      {/* User Management Content */}
      <div className="p-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription>{MOCK_USERS.length} users in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Last Active</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_USERS.filter(user =>
                    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((user) => (
                    <tr key={user.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_LABELS[user.role]?.color || 'bg-slate-100 text-slate-700'}`}>
                          {ROLE_LABELS[user.role]?.label || user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className="text-sm text-slate-600 capitalize">{user.status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="h-4 w-4" />
                          {user.lastLogin}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-500" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Users who haven&apos;t accepted their invitation yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500">
              <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No pending invitations</p>
              <p className="text-sm">Invited users will appear here until they accept</p>
            </div>
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Role Permissions
            </CardTitle>
            <CardDescription>Overview of what each role can access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <RolePermission
                role="Admin"
                color="purple"
                permissions={['Full access to all features', 'User management', 'Billing & subscription', 'Company settings']}
              />
              <RolePermission
                role="Risk Manager"
                color="blue"
                permissions={['View all projects', 'Portfolio-wide reporting', 'Exception approval', 'Cannot manage users or billing']}
              />
              <RolePermission
                role="Project Manager"
                color="green"
                permissions={['Full access to assigned projects', 'Add/remove subcontractors', 'Create exceptions', 'Cannot access other projects']}
              />
              <RolePermission
                role="Project Administrator"
                color="amber"
                permissions={['View assigned projects', 'Upload and review COCs', 'Send communications', 'Cannot modify project settings']}
              />
              <RolePermission
                role="Read Only"
                color="slate"
                permissions={['View projects and compliance status', 'View reports', 'Cannot modify any data']}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function RolePermission({
  role,
  color,
  permissions
}: {
  role: string
  color: string
  permissions: string[]
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <h4 className="font-medium mb-2">{role}</h4>
      <ul className="text-sm space-y-1 opacity-80">
        {permissions.map((permission, index) => (
          <li key={index}>• {permission}</li>
        ))}
      </ul>
    </div>
  )
}
