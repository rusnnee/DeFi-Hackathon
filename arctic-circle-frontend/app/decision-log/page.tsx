'use client'

import { useState, useRef, useEffect } from 'react'
import { ShieldIcon, ChartBarsIcon, CoinIcon } from '@/components/pixel-icons'

// ===== MOCK DATA =====
const MOCK_TREASURY = {
  usdc: 18500,
  usyc: 12400,
  total: 30900,
  liquidity_ratio: 0.60,
  usyc_ratio: 0.40,
}

const MOCK_SIGNALS = {
  yield_rate: 6.2,
}

const MOCK_DECISIONS: Decision[] = [
  {
    id: 1,
    timestamp: '2026-02-28T09:00:01Z',
    action: 'deposit_to_usyc',
    reasoning: ['Yield at 6.2%, above 4% threshold.', 'Payroll not due for 28 days.', 'Excess funds detected: $12,400 USDC.', 'Moving to USYC for yield optimisation.'],
    yield_rate: 6.2,
    position: { usdc: 18500, usyc: 12400, total: 30900 },
    execution: { amount: 12400 },
  },
  {
    id: 2,
    timestamp: '2026-02-28T08:00:01Z',
    action: 'monitor',
    reasoning: ['Yield at 3.8%, below 4% threshold.', 'Holding in USDC. Payroll in 28 days.'],
    yield_rate: 3.8,
    position: { usdc: 30900, usyc: 0, total: 30900 },
    execution: null,
  },
  {
    id: 3,
    timestamp: '2026-02-27T09:00:01Z',
    action: 'blocked',
    reasoning: ['Payroll day. Treasury holds 22000 USDC.', 'Insufficient USDC for payroll. Need 26950 USDC. Have 22000 USDC.', 'Payroll blocked pending rebalance.'],
    yield_rate: 5.1,
    position: { usdc: 22000, usyc: 8000, total: 30000 },
    execution: null,
  },
  {
    id: 4,
    timestamp: '2026-02-26T09:00:01Z',
    action: 'withdraw_from_usyc',
    reasoning: ['Payroll in 2 days. Need 26950 USDC.', 'Withdrawing 8450 from USYC.', 'Pre-payroll rebalance initiated.'],
    yield_rate: 5.9,
    position: { usdc: 18500, usyc: 8450, total: 26950 },
    execution: { amount: 8450 },
  },
  {
    id: 5,
    timestamp: '2026-02-25T09:00:01Z',
    action: 'execute_payroll',
    reasoning: ['Pay day. All policy checks passed.', 'Distributing 24500 USDC to 5 employees.', 'Payroll executed successfully.'],
    yield_rate: 4.5,
    position: { usdc: 28000, usyc: 0, total: 28000 },
    execution: { amount: 24500 },
  },
]

// ===== Interfaces =====
interface TreasuryData {
  usdc: number
  usyc: number
  total: number
  liquidity_ratio: number
  usyc_ratio: number
}

interface SignalData {
  yield_rate: number
}

interface Decision {
  id: number | string
  timestamp: string
  action: string
  reasoning: string[]
  position: Record<string, unknown> | null
  yield_rate: number
  execution: Record<string, unknown> | null
}

type FilterAction = 'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'PAYROLL' | 'BLOCKED' | 'MONITOR'

const FILTER_ACTIONS: FilterAction[] = ['ALL', 'DEPOSIT', 'WITHDRAW', 'PAYROLL', 'BLOCKED', 'MONITOR']

// ===== Policy Status Panel =====
function PolicyPanel({ treasury, signals }: { treasury: TreasuryData; signals: SignalData }) {
  type PolicyStatus = 'SAFE' | 'AT RISK' | 'BREACHED'

  function StatusBadge({ status }: { status: PolicyStatus }) {
    const styles = {
      'SAFE': 'bg-[rgba(52,211,153,0.15)] text-usyc',
      'AT RISK': 'bg-[rgba(251,191,36,0.15)] text-amber',
      'BREACHED': 'bg-[rgba(248,113,113,0.15)] text-alert-red',
    }
    return (
      <span className={`inline-block rounded-[3px] px-2 py-0.5 font-sans text-[11px] font-medium ${styles[status]}`}>
        {status}
      </span>
    )
  }

  const liqPct = treasury.liquidity_ratio * 100
  const usycPct = treasury.usyc_ratio * 100

  const policies: { icon: React.ReactNode; label: string; rule: string; current: string; threshold: string; status: PolicyStatus }[] = [
    {
      icon: <ShieldIcon size={20} safe={true} />,
      label: 'Min Liquidity',
      rule: 'Keep >= 40% in USDC',
      current: `${liqPct.toFixed(1)}%`,
      threshold: '40%',
      status: 'SAFE',
    },
    {
      icon: <ShieldIcon size={20} safe={true} />,
      label: 'Max USYC Cap',
      rule: 'Never exceed 60% in USYC',
      current: `${usycPct.toFixed(1)}%`,
      threshold: '60%',
      status: 'SAFE',
    },
    {
      icon: <ChartBarsIcon size={20} />,
      label: 'Yield Threshold',
      rule: 'Deploy only if APY > 4%',
      current: `${signals.yield_rate.toFixed(2)}%`,
      threshold: '4%',
      status: 'SAFE',
    },
    {
      icon: <CoinIcon size={20} />,
      label: 'Payroll Buffer',
      rule: 'Maintain 110% of payroll in USDC before payday',
      current: `$${treasury.usdc.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
      threshold: '$26,950',
      status: 'AT RISK',
    },
  ]

  return (
    <section className="rounded-[4px] border border-border bg-card p-5">
      <p className="mb-4 font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        ACTIVE POLICIES
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {policies.map((p, i) => (
          <div key={i} className="rounded-[4px] border border-border bg-background p-4">
            <div className="mb-2">{p.icon}</div>
            <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{p.label}</p>
            <p className="mt-1 font-sans text-[12px] text-foreground">{p.rule}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-sans text-[14px] font-bold text-foreground">{p.current}</span>
              <span className="font-sans text-[11px] text-muted-foreground">vs {p.threshold}</span>
            </div>
            <div className="mt-2">
              <StatusBadge status={p.status} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ===== Filter Controls =====
function FilterBar({
  activeFilter,
  setActiveFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  search,
  setSearch,
}: {
  activeFilter: FilterAction
  setActiveFilter: (f: FilterAction) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  search: string
  setSearch: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Action filters */}
      <div className="flex flex-wrap gap-2">
        {FILTER_ACTIONS.map(action => (
          <button
            key={action}
            onClick={() => setActiveFilter(action)}
            className={`rounded-[3px] px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
              activeFilter === action
                ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Date + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="font-sans text-[12px] text-muted-foreground" htmlFor="date-from">From</label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-[4px] border border-border bg-input px-2 py-1 font-sans text-[13px] text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-sans text-[12px] text-muted-foreground" htmlFor="date-to">To</label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-[4px] border border-border bg-input px-2 py-1 font-sans text-[13px] text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <input
          type="text"
          placeholder="Search reasoning..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-[4px] border border-border bg-input px-3 py-1.5 font-sans text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  )
}

// ===== Decision Card =====
function DecisionCard({ decision, defaultExpanded }: { decision: Decision; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [expanded])

  // Measure on mount so default-expanded cards render correctly
  useEffect(() => {
    if (contentRef.current && expanded) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [expanded])

  const action = (decision.action || '').toUpperCase()
  const reasoningLines = decision.reasoning || []

  let borderColor = '#8B7FA8'
  let badgeBg = 'bg-[rgba(139,127,168,0.15)]'
  let badgeText = 'text-muted-foreground'

  if (['DEPOSIT_TO_USYC', 'EXECUTE_PAYROLL', 'WITHDRAW_FROM_USYC'].includes(action)) {
    borderColor = '#34D399'
    badgeBg = 'bg-[rgba(52,211,153,0.15)]'
    badgeText = 'text-usyc'
  } else if (action === 'BLOCKED') {
    borderColor = '#F87171'
    badgeBg = 'bg-[rgba(248,113,113,0.15)]'
    badgeText = 'text-alert-red'
  }

  const amount = decision.execution && typeof decision.execution === 'object' && 'amount' in decision.execution
    ? `$${Number(decision.execution.amount).toLocaleString('en-US')}`
    : '-'

  return (
    <div
      className="cursor-pointer rounded-[4px] border border-border bg-card transition-all hover:-translate-y-[1px] hover:shadow-[0_0_12px_rgba(192,132,252,0.1)]"
      style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
      onClick={() => setExpanded(e => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v) }}
      aria-expanded={expanded}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className={`rounded-[3px] px-2 py-0.5 font-sans text-[12px] font-medium uppercase ${badgeBg} ${badgeText}`}>
            {action.replace(/_/g, ' ')}
          </span>
          {amount !== '-' && (
            <span className="font-sans text-[12px] text-foreground">{amount}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-muted-foreground">{decision.timestamp}</span>
          <span className="font-sans text-[14px] text-muted-foreground">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </div>

      {/* Preview line */}
      {!expanded && (
        <div className="px-4 pb-2">
          <p className="truncate font-sans text-[13px] text-muted-foreground">
            {reasoningLines[0] || 'No reasoning provided'}
          </p>
        </div>
      )}

      {/* Expandable content */}
      <div
        style={{ maxHeight: expanded ? `${contentHeight}px` : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}
      >
        <div ref={contentRef} className="border-t border-border px-4 py-4">
          {/* Data grid */}
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AMOUNT</p>
              <p className="font-sans text-[14px] text-foreground">{amount}</p>
            </div>
            <div>
              <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">YIELD AT DECISION</p>
              <p className="font-sans text-[14px] text-foreground">{decision.yield_rate ? `${decision.yield_rate}%` : '-'}</p>
            </div>
            <div>
              <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">POSITION</p>
              <p className="font-mono text-[12px] text-muted-foreground">
                {decision.position ? `USDC: $${Number((decision.position as Record<string, number>).usdc).toLocaleString()} | USYC: $${Number((decision.position as Record<string, number>).usyc).toLocaleString()}` : '-'}
              </p>
            </div>
            <div>
              <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">POLICY RESULT</p>
              <p className="font-sans text-[14px] text-foreground">{action.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Reasoning */}
          <div>
            <p className="mb-2 font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AGENT REASONING</p>
            <div className="flex flex-col gap-1">
              {reasoningLines.map((line, i) => {
                const lineColor = action === 'BLOCKED' ? 'text-alert-red' : borderColor === '#34D399' ? 'text-usyc' : 'text-muted-foreground'
                return (
                  <p
                    key={i}
                    className={`typewriter-line font-sans text-[14px] ${lineColor}`}
                    style={{ animationDelay: `${i * 0.15}s`, opacity: 0 }}
                  >
                    {String(i + 1).padStart(2, '0')}. {line}
                  </p>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Main Decision Log Page =====
export default function DecisionLogPage() {
  const [activeFilter, setActiveFilter] = useState<FilterAction>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const filteredDecisions = MOCK_DECISIONS
    .filter(d => {
      if (activeFilter !== 'ALL') {
        const action = (d.action || '').toUpperCase()
        if (activeFilter === 'DEPOSIT' && !action.includes('DEPOSIT')) return false
        if (activeFilter === 'WITHDRAW' && !action.includes('WITHDRAW')) return false
        if (activeFilter === 'PAYROLL' && !action.includes('PAYROLL')) return false
        if (activeFilter === 'BLOCKED' && action !== 'BLOCKED') return false
        if (activeFilter === 'MONITOR' && action !== 'MONITOR') return false
      }
      if (dateFrom && d.timestamp < dateFrom) return false
      if (dateTo && d.timestamp > dateTo + 'T23:59:59') return false
      if (search) {
        const reasoningText = d.reasoning.join(' ')
        if (!reasoningText.toLowerCase().includes(search.toLowerCase())) return false
      }
      return true
    })
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Section 1: Policy Panel */}
      <PolicyPanel treasury={MOCK_TREASURY} signals={MOCK_SIGNALS} />

      {/* Section 2: Filter Controls */}
      <div className="mt-6">
        <FilterBar
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          search={search}
          setSearch={setSearch}
        />
      </div>

      {/* Section 3: Decision Cards Feed - all expanded by default */}
      <div className="mt-6 flex flex-col gap-4">
        {filteredDecisions.length === 0 ? (
          <p className="py-12 text-center font-sans text-[14px] text-muted-foreground">
            No decisions match your filters
          </p>
        ) : (
          filteredDecisions.map((d) => (
            <DecisionCard key={d.id} decision={d} defaultExpanded={false} />
          ))
        )}
      </div>
    </div>
  )
}
