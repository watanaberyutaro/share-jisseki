'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, MapPin, Users, TrendingUp, CheckCircle, XCircle, Search, Filter } from 'lucide-react'

interface Performance {
  id: string
  event: {
    id: string
    name: string
    date: string
    venue: string
    team: string
  }
  au_mnp_sp1: number
  au_mnp_sp2: number
  au_mnp_sim: number
  uq_mnp_sp1: number
  uq_mnp_sp2: number
  uq_mnp_sim: number
  au_hs_sp1: number
  au_hs_sp2: number
  au_hs_sim: number
  uq_hs_sp1: number
  uq_hs_sp2: number
  uq_hs_sim: number
  cell_up_sp1: number
  cell_up_sp2: number
  cell_up_sim: number
  credit_card: number
  gold_card: number
  ji_bank_account: number
  warranty: number
  ott: number
  electricity: number
  gas: number
  network_count: number
}

export function PerformanceList() {
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'totalNewIds' | 'venue'>('date')

  useEffect(() => {
    fetchPerformances()
  }, [])

  const fetchPerformances = async () => {
    try {
      const response = await fetch('/api/performances')
      if (response.ok) {
        const data = await response.json()
        setPerformances(data)
      }
    } catch (error) {
      console.error('Failed to fetch performances:', error)
    } finally {
      setLoading(false)
    }
  }

  // 計算されたプロパティを含むパフォーマンスデータ
  const enhancedPerformances = performances.map(p => ({
    ...p,
    totalNewIds: (p.au_mnp_sp1 || 0) + (p.au_mnp_sp2 || 0) + (p.au_mnp_sim || 0) +
                 (p.uq_mnp_sp1 || 0) + (p.uq_mnp_sp2 || 0) + (p.uq_mnp_sim || 0) +
                 (p.au_hs_sp1 || 0) + (p.au_hs_sp2 || 0) + (p.au_hs_sim || 0) +
                 (p.uq_hs_sp1 || 0) + (p.uq_hs_sp2 || 0) + (p.uq_hs_sim || 0) +
                 (p.cell_up_sp1 || 0) + (p.cell_up_sp2 || 0) + (p.cell_up_sim || 0),
    totalLtv: (p.credit_card || 0) + (p.gold_card || 0) + (p.ji_bank_account || 0) +
              (p.warranty || 0) + (p.ott || 0) + (p.electricity || 0) + (p.gas || 0),
    auMnpTotal: (p.au_mnp_sp1 || 0) + (p.au_mnp_sp2 || 0) + (p.au_mnp_sim || 0),
    uqMnpTotal: (p.uq_mnp_sp1 || 0) + (p.uq_mnp_sp2 || 0) + (p.uq_mnp_sim || 0),
    auHsTotal: (p.au_hs_sp1 || 0) + (p.au_hs_sp2 || 0) + (p.au_hs_sim || 0),
    uqHsTotal: (p.uq_hs_sp1 || 0) + (p.uq_hs_sp2 || 0) + (p.uq_hs_sim || 0),
    cellUpTotal: (p.cell_up_sp1 || 0) + (p.cell_up_sp2 || 0) + (p.cell_up_sim || 0),
  }))

  const filteredAndSortedPerformances = enhancedPerformances
    .filter(p => 
      p.event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.event.team.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.event.date).getTime() - new Date(a.event.date).getTime()
        case 'totalNewIds':
          return b.totalNewIds - a.totalNewIds
        case 'venue':
          return a.event.venue.localeCompare(b.event.venue)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="glass rounded-2xl p-6 border border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="イベント名、会場、チームで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              <option value="date">日付順</option>
              <option value="totalNewIds">実績順</option>
              <option value="venue">会場順</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAndSortedPerformances.map((performance, index) => (
          <div
            key={performance.id}
            className="group glass rounded-2xl p-6 border border-border/50 hover:shadow-elegant-lg transition-all duration-300 hover:-translate-y-1 scale-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {performance.event.name}
                </h3>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(new Date(performance.event.date), 'yyyy年MM月dd日', { locale: ja })}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {performance.event.venue}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {performance.event.team}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {performance.totalNewIds >= 10 ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive/60" />
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-primary/5 rounded-xl">
                <div className="text-2xl font-bold text-primary mb-1">
                  {performance.totalNewIds}
                </div>
                <div className="text-xs text-muted-foreground">総販売数</div>
              </div>
              <div className="text-center p-3 bg-success/5 rounded-xl">
                <div className="text-2xl font-bold text-success mb-1">
                  {performance.totalLtv}
                </div>
                <div className="text-xs text-muted-foreground">LTV</div>
              </div>
              <div className="text-center p-3 bg-warning/5 rounded-xl">
                <div className="text-2xl font-bold text-warning mb-1">
                  {performance.auMnpTotal + performance.uqMnpTotal}
                </div>
                <div className="text-xs text-muted-foreground">MNP合計</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {performance.network_count || 0}
                </div>
                <div className="text-xs text-muted-foreground">NW件数</div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">au MNP</span>
                <span className="font-medium">{performance.auMnpTotal}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">UQ MNP</span>
                <span className="font-medium">{performance.uqMnpTotal}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">au HS</span>
                <span className="font-medium">{performance.auHsTotal}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">UQ HS</span>
                <span className="font-medium">{performance.uqHsTotal}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">セルアップ</span>
                <span className="font-medium">{performance.cellUpTotal}件</span>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">達成率</span>
                <span className="text-sm font-medium">
                  {Math.round((performance.totalNewIds / 20) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div
                  className="h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Math.round((performance.totalNewIds / 20) * 100), 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedPerformances.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            実績データがありません
          </h3>
          <p className="text-muted-foreground">
            実績を入力すると、ここに表示されます
          </p>
        </div>
      )}
    </div>
  )
}