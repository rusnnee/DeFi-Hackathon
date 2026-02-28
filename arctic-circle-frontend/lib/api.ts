const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function getTreasury() {
  const r = await fetch(`${BASE}/treasury`, { cache: 'no-store' })
  const data = await r.json()
  return {
    usdc: data.usdc_balance,
    usyc: data.usyc_balance,
    total: data.total,
    total_payroll: data.total_payroll ?? 0,
    liquidity_ratio: data.total > 0 ? data.usdc_balance / data.total : 0,
    usyc_ratio: data.total > 0 ? data.usyc_balance / data.total : 0,
  }
}

export async function getSignals() {
  const r = await fetch(`${BASE}/signals`, { cache: 'no-store' })
  return r.json()
}

export async function getDecisions() {
  const r = await fetch(`${BASE}/decisions`, { cache: 'no-store' })
  const data: RawDecision[] = await r.json()
  return data.map(d => ({
    id: d.id,
    timestamp: d.timestamp,
    action: d.action,
    approved: d.approved,
    reasoning: d.reasoning ? d.reasoning.split('. ').filter(Boolean) : [],
    yield_rate: d.yield_rate,
    position: {
      usdc: d.usdc_balance,
      usyc: d.usyc_balance,
      total: d.usdc_balance + d.usyc_balance,
    },
    execution: d.execution ? JSON.parse(d.execution) : null,
  }))
}

export async function getEmployees() {
  const r = await fetch(`${BASE}/employees`, { cache: 'no-store' })
  const data = await r.json()
  return data.map((e: BackendEmployee) => ({
    id: e.id,
    name: e.name,
    wallet_id: e.wallet_address,
    salary: e.salary,
    chain: e.chain || 'ARC-TESTNET',
    label: 'Team Member',
    last_paid: 'never',
    status: 'ACTIVE' as const,
  }))
}

export async function getTransaction(tx_id: string) {
  const r = await fetch(`${BASE}/transactions/${tx_id}`, { cache: 'no-store' })
  return r.json()
}

export async function triggerAgent() {
  const r = await fetch(`${BASE}/trigger`, { method: 'POST', cache: 'no-store' })
  return r.json()
}

interface RawDecision {
  id: number
  timestamp: string
  action: string
  approved: number
  reasoning: string
  usdc_balance: number
  usyc_balance: number
  yield_rate: number
  violations: string
  execution: string | null
}

interface BackendEmployee {
  id: string
  name: string
  wallet_address: string
  wallet_id: string
  salary: number
  chain?: string
}