'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  FileCheck,
  FileX,
  AlertTriangle,
  Shield,
  Clock,
  Mail,
  Info,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  user_id: string
  company_id: string
  type: string
  title: string
  message: string
  link: string | null
  entity_type: string | null
  entity_id: string | null
  read: number
  created_at: string
}

const notificationIcons: Record<string, React.ReactNode> = {
  coc_received: <FileCheck className="h-5 w-5 text-blue-500" />,
  coc_verified: <Check className="h-5 w-5 text-green-500" />,
  coc_failed: <FileX className="h-5 w-5 text-red-500" />,
  exception_created: <Shield className="h-5 w-5 text-amber-500" />,
  exception_approved: <CheckCheck className="h-5 w-5 text-green-500" />,
  exception_expired: <Clock className="h-5 w-5 text-red-500" />,
  expiration_warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  communication_sent: <Mail className="h-5 w-5 text-blue-500" />,
  stop_work_risk: <AlertTriangle className="h-5 w-5 text-red-500" />,
  system: <Info className="h-5 w-5 text-slate-500" />,
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=100')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n.id) ? { ...n, read: 1 } : n
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: 1 })))
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const clearAll = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE'
      })
      if (res.ok) {
        setNotifications([])
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 lg:p-12 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-700">No notifications</p>
            <p className="text-slate-500 mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => {
                  if (!notification.read) {
                    markAsRead([notification.id])
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  notification,
  onRead
}: {
  notification: Notification
  onRead: () => void
}) {
  const icon = notificationIcons[notification.type] || notificationIcons.system

  const content = (
    <div
      className={cn(
        'flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors',
        !notification.read && 'bg-blue-50/50'
      )}
      onClick={onRead}
    >
      <div className="p-2.5 bg-slate-100 rounded-lg shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm',
            !notification.read && 'font-semibold'
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0 mt-1" />
          )}
        </div>
        <p className="text-sm text-slate-600 mt-1">
          {notification.message}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
    </div>
  )

  if (notification.link) {
    return (
      <Link href={notification.link}>
        {content}
      </Link>
    )
  }

  return content
}
