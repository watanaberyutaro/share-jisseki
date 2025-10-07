'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Rechartsを遅延ロード（パフォーマンス向上）
export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart as unknown as ComponentType<any>),
  { ssr: false, loading: () => <div className="h-48 flex items-center justify-center text-sm text-gray-500">読み込み中...</div> }
)

export const LazyPie = dynamic(
  () => import('recharts').then((mod) => mod.Pie as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyCell = dynamic(
  () => import('recharts').then((mod) => mod.Cell as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart as unknown as ComponentType<any>),
  { ssr: false, loading: () => <div className="h-80 flex items-center justify-center text-sm text-gray-500">読み込み中...</div> }
)

export const LazyLine = dynamic(
  () => import('recharts').then((mod) => mod.Line as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart as unknown as ComponentType<any>),
  { ssr: false, loading: () => <div className="h-80 flex items-center justify-center text-sm text-gray-500">読み込み中...</div> }
)

export const LazyBar = dynamic(
  () => import('recharts').then((mod) => mod.Bar as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyXAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyYAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyCartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyTooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyLegend = dynamic(
  () => import('recharts').then((mod) => mod.Legend as unknown as ComponentType<any>),
  { ssr: false }
)

export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer as unknown as ComponentType<any>),
  { ssr: false }
)
