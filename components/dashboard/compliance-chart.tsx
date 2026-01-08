"use client"

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

interface ComplianceHistoryPoint {
  date: string
  total: number
  compliant: number
  nonCompliant: number
  pending: number
  exception: number
  complianceRate: number
}

interface ComplianceChartProps {
  data: ComplianceHistoryPoint[]
}

export default function ComplianceChart({ data }: ComplianceChartProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => {
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
            className="text-xs"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            className="text-xs"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const pointData = payload[0].payload as ComplianceHistoryPoint
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="font-medium">{new Date(label).toLocaleDateString()}</p>
                    <p className="text-green-600">Compliance: {pointData.complianceRate}%</p>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <p>Compliant: {pointData.compliant}</p>
                      <p>With Exception: {pointData.exception}</p>
                      <p>Non-Compliant: {pointData.nonCompliant}</p>
                      <p>Pending: {pointData.pending}</p>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="complianceRate"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#colorCompliance)"
            name="Compliance Rate"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
