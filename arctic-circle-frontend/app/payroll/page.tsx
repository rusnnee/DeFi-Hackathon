'use client'

import { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { PersonIcon, CoinIcon, ScrollIcon, FlyingMoneyIcon } from '@/components/pixel-icons'
import { useArcticToast } from '@/components/arctic-toast'
import { getEmployees } from '@/lib/api'

interface Employee {
  id: number | string
  name: string
  wallet_id: string
  salary: number
  chain?: string
  currency?: string
  label?: string
  last_paid?: string
  status?: 'ACTIVE' | 'PENDING' | 'BLOCKED'
}

type SortMode = 'NAME' | 'CHAIN' | 'AMOUNT_ASC' | 'AMOUNT_DESC' | 'LAST_PAID'

const AVATAR_GRADIENTS = [
  'from-[#C084FC] to-[#F472B6]',
  'from-[#60A5FA] to-[#C084FC]',
  'from-[#F472B6] to-[#FBBF24]',
  'from-[#34D399] to-[#60A5FA]',
  'from-[#818CF8] to-[#F472B6]',
  'from-[#FBBF24] to-[#F87171]',
]

function getGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) { hash = ((hash << 5) - hash) + name.charCodeAt(i); hash |= 0 }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getDaysUntilPayday() {
  const now = new Date()
  const payday = new Date(now.getFullYear(), now.getMonth(), 28)
  if (now > payday) payday.setMonth(payday.getMonth() + 1)
  return Math.ceil((payday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function EmployeeCard({ employee }: { employee: Employee }) {
  const [copied, setCopied] = useState(false)
  const daysLeft = getDaysUntilPayday()
  const progressPct = Math.max(0, Math.min(100, ((28 - daysLeft) / 28) * 100))
  const status = employee.status || 'ACTIVE'

  let barColor = 'bg-usyc'
  if (daysLeft <= 2) barColor = 'bg-alert-red'
  else if (daysLeft <= 7) barColor = 'bg-amber'

  const wallet = employee.wallet_id || ''
  const truncatedWallet = wallet.length > 10 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet

  function copyWallet(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(wallet).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusStyles = { ACTIVE: 'bg-[rgba(52,211,153,0.15)] text-usyc', PENDING: 'bg-[rgba(251,191,36,0.15)] text-amber', BLOCKED: 'bg-[rgba(248,113,113,0.15)] text-alert-red' }

  return (
    <div className="group rounded-[4px] border border-border bg-card p-4 transition-all hover:-translate-y-[2px] hover:shadow-[0_0_24px_rgba(192,132,252,0.2)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[4px] bg-gradient-to-br ${getGradient(employee.name)}`}>
            <span className="font-sans text-[14px] font-bold text-foreground">{getInitials(employee.name)}</span>
          </div>
          <div>
            <p className="font-sans text-[16px] font-bold leading-tight text-foreground">{employee.name}</p>
            <p className="font-sans text-[13px] text-[#8B7FA8]">{employee.label || 'Team Member'}</p>
          </div>
        </div>
        <span className={`rounded-[3px] px-2 py-0.5 font-sans text-[11px] font-medium ${statusStyles[status]}`}>{status}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <CoinIcon size={16} />
        <span className="font-sans text-[22px] font-bold text-foreground">
          ${employee.salary.toLocaleString('en-US')} <span className="text-[14px] text-muted-foreground">USDC</span>
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[12px] text-muted-foreground">{truncatedWallet}</span>
        <button onClick={copyWallet} className="relative font-sans text-[11px] text-primary hover:text-secondary" aria-label="Copy wallet address">
          {copied ? <span className="text-usyc">Copied!</span> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="1" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-[3px] bg-muted px-2 py-0.5 font-sans text-[11px] font-medium text-foreground">{employee.chain || 'ARC-TESTNET'}</span>
        <span className="font-sans text-[12px] text-muted-foreground">Last Paid: {employee.last_paid || 'Never'}</span>
      </div>

      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-[2px] bg-muted">
          <div className={`h-full rounded-[2px] ${barColor} transition-all`} style={{ width: `${progressPct}%` }} />
        </div>
        <p className="mt-1 font-sans text-[11px] text-muted-foreground">Next payment in {daysLeft} days</p>
      </div>
    </div>
  )
}

function AddEmployeeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (emp: Employee) => void }) {
  const [name, setName] = useState('')
  const [wallet, setWallet] = useState('')
  const [chain, setChain] = useState('ARC-TESTNET')
  const [salary, setSalary] = useState('')
  const [currency, setCurrency] = useState('USDC')
  const [label, setLabel] = useState('')
  const [walletError, setWalletError] = useState('')
  const [showFlyMoney, setShowFlyMoney] = useState(false)
  const { addToast } = useArcticToast()

  function validateWallet(w: string) {
    if (!w.startsWith('0x') || w.length !== 42) { setWalletError('Invalid wallet address'); return false }
    setWalletError(''); return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateWallet(wallet)) return
    const newEmp: Employee = { id: `EMP${String(Date.now()).slice(-4)}`, name, wallet_id: wallet, chain, salary: parseFloat(salary), currency, label, last_paid: 'never', status: 'PENDING' }
    setShowFlyMoney(true)
    addToast(`${name} added to payroll`, 'success')
    setTimeout(() => { onAdd(newEmp); onClose() }, 1000)
  }

  const inputClass = 'w-full rounded-[4px] border border-border bg-input px-3 py-2 font-sans text-[14px] text-foreground focus:border-primary focus:outline-none'
  const labelClass = 'block font-sans text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)]" onClick={onClose}>
      <div className="relative w-full max-w-[480px] rounded-[6px] border border-border bg-card p-8" onClick={e => e.stopPropagation()}>
        {showFlyMoney && <div className="fly-money absolute bottom-16 left-1/2 -translate-x-1/2"><FlyingMoneyIcon size={48} /></div>}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-sans text-[20px] font-bold text-foreground">Add Employee</h2>
          <button onClick={onClose} className="font-sans text-[18px] text-muted-foreground hover:text-foreground" aria-label="Close modal">X</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div><label className={labelClass} htmlFor="emp-name">Name</label><input id="emp-name" type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} /></div>
          <div>
            <label className={labelClass} htmlFor="emp-wallet">Wallet Address</label>
            <input id="emp-wallet" type="text" required value={wallet} onChange={e => { setWallet(e.target.value); setWalletError('') }} onBlur={() => wallet && validateWallet(wallet)} className={`${inputClass} ${walletError ? 'border-alert-red' : ''}`} placeholder="0x..." />
            {walletError && <p className="mt-1 font-sans text-[12px] text-alert-red">{walletError}</p>}
          </div>
          <div><label className={labelClass} htmlFor="emp-chain">Chain</label>
            <select id="emp-chain" value={chain} onChange={e => setChain(e.target.value)} className={inputClass}>
              <option value="ARC-TESTNET">ARC-TESTNET</option>
              <option value="ETH-SEPOLIA">ETH-SEPOLIA</option>
              <option value="BASE-SEPOLIA">BASE-SEPOLIA</option>
            </select>
          </div>
          <div><label className={labelClass} htmlFor="emp-salary">Salary in USDC</label><input id="emp-salary" type="number" required min="0" step="0.01" value={salary} onChange={e => setSalary(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass} htmlFor="emp-currency">Currency</label>
            <select id="emp-currency" value={currency} onChange={e => setCurrency(e.target.value)} className={inputClass}>
              <option>USDC</option><option>EURC</option>
            </select>
          </div>
          <div><label className={labelClass} htmlFor="emp-label">Role / Label</label><input id="emp-label" type="text" value={label} onChange={e => setLabel(e.target.value)} className={inputClass} /></div>
          <button type="submit" className="mt-2 w-full rounded-[4px] bg-gradient-to-r from-primary to-secondary px-5 py-[10px] font-sans text-[14px] font-medium text-primary-foreground transition-all hover:shadow-[0_0_12px_rgba(192,132,252,0.4)]">Add to Payroll</button>
        </form>
      </div>
    </div>
  )
}

function CSVUploadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (emps: Employee[]) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [parsed, setParsed] = useState<Record<string, string>[]>([])
  const [showFlyMoney, setShowFlyMoney] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useArcticToast()

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete(results) { setParsed(results.data as Record<string, string>[]) },
      error() { addToast('Failed to parse CSV', 'error') },
    })
  }

  function onDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file) }
  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (file) handleFile(file) }

  function confirmUpload() {
    const newEmps: Employee[] = parsed.map((row, i) => ({ id: `CSV${Date.now()}${i}`, name: row.name || 'Unknown', wallet_id: row.wallet || '', chain: row.chain || 'ARC-TESTNET', salary: parseFloat(row.amount) || 0, currency: row.currency || 'USDC', label: row.label || '', last_paid: 'never', status: 'PENDING' as const }))
    setShowFlyMoney(true)
    addToast(`${newEmps.length} employees uploaded`, 'success')
    setTimeout(() => { onAdd(newEmps); onClose() }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)]" onClick={onClose}>
      <div className="relative w-full max-w-[480px] rounded-[6px] border border-border bg-card p-8" onClick={e => e.stopPropagation()}>
        {showFlyMoney && <div className="fly-money absolute bottom-16 left-1/2 -translate-x-1/2"><FlyingMoneyIcon size={48} /></div>}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-sans text-[20px] font-bold text-foreground">Upload Payroll CSV</h2>
          <button onClick={onClose} className="font-sans text-[18px] text-muted-foreground hover:text-foreground" aria-label="Close modal">X</button>
        </div>
        {parsed.length === 0 ? (
          <>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}
              className={`flex h-[160px] cursor-pointer flex-col items-center justify-center rounded-[4px] border-2 border-dashed transition-colors ${dragOver ? 'border-primary bg-[rgba(192,132,252,0.05)]' : 'border-border bg-input'}`}
              role="button" tabIndex={0} aria-label="Upload CSV file">
              <ScrollIcon size={32} />
              <p className="mt-2 font-sans text-[14px] text-muted-foreground">Drop your CSV here or click to browse</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={onFileSelect} />
            <p className="mt-3 font-sans text-[12px] text-muted-foreground">Required columns: name, wallet, chain, amount, currency, label</p>
          </>
        ) : (
          <>
            <div className="mb-4 max-h-[240px] overflow-y-auto rounded-[4px] border border-border bg-input p-3">
              {parsed.map((row, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
                  <span className="font-sans text-[13px] text-foreground">{row.name}</span>
                  <span className="font-mono text-[12px] text-muted-foreground">{row.wallet ? `${row.wallet.slice(0, 6)}...${row.wallet.slice(-4)}` : '-'}</span>
                  <span className="font-sans text-[13px] text-foreground">${row.amount}</span>
                </div>
              ))}
            </div>
            <button onClick={confirmUpload} className="w-full rounded-[4px] bg-gradient-to-r from-primary to-secondary px-5 py-[10px] font-sans text-[14px] font-medium text-primary-foreground transition-all hover:shadow-[0_0_12px_rgba(192,132,252,0.4)]">Confirm Upload</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('NAME')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getEmployees()
        setEmployees(data)
      } catch (e) {
        console.error('Failed to load employees', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleAddEmployee(emp: Employee) { setEmployees(prev => [...prev, emp]) }
  function handleCSVUpload(emps: Employee[]) { setEmployees(prev => [...prev, ...emps]) }

  const sortedEmployees = [...employees].sort((a, b) => {
    switch (sortMode) {
      case 'NAME': return a.name.localeCompare(b.name)
      case 'CHAIN': return (a.chain || '').localeCompare(b.chain || '')
      case 'AMOUNT_ASC': return a.salary - b.salary
      case 'AMOUNT_DESC': return b.salary - a.salary
      case 'LAST_PAID': return (a.last_paid || '').localeCompare(b.last_paid || '')
      default: return 0
    }
  })

  const sortButtons: { label: string; mode: SortMode }[] = [
    { label: 'NAME A->Z', mode: 'NAME' },
    { label: 'CHAIN A->Z', mode: 'CHAIN' },
    { label: 'AMOUNT UP', mode: 'AMOUNT_ASC' },
    { label: 'AMOUNT DOWN', mode: 'AMOUNT_DESC' },
    { label: 'LAST PAID', mode: 'LAST_PAID' },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-sans text-[14px] text-muted-foreground">Loading employees...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-sans text-[28px] font-bold text-foreground">Payroll</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-[4px] bg-gradient-to-r from-primary to-secondary px-5 py-[10px] font-sans text-[14px] font-medium text-primary-foreground transition-all hover:shadow-[0_0_12px_rgba(192,132,252,0.4)]">
            <PersonIcon size={16} />+ Add Employee
          </button>
          <button onClick={() => setShowCSVModal(true)} className="flex items-center gap-2 rounded-[4px] border border-border bg-card px-5 py-[10px] font-sans text-[14px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary">
            <ScrollIcon size={16} />Upload CSV
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sortButtons.map(btn => (
          <button key={btn.mode} onClick={() => setSortMode(btn.mode)}
            className={`rounded-[3px] px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${sortMode === btn.mode ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'}`}>
            {btn.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedEmployees.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="font-sans text-[14px] text-muted-foreground">No employees found.</p>
          </div>
        ) : (
          sortedEmployees.map(emp => <EmployeeCard key={emp.id} employee={emp} />)
        )}
      </div>

      {showAddModal && <AddEmployeeModal onClose={() => setShowAddModal(false)} onAdd={handleAddEmployee} />}
      {showCSVModal && <CSVUploadModal onClose={() => setShowCSVModal(false)} onAdd={handleCSVUpload} />}
    </div>
  )
}