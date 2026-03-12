"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiKey, apiGet, API_BASE } from "@/lib/api"
import { Wallet, Plus } from "lucide-react"

function formatWei(wei: string) {
  const n = BigInt(wei)
  if (n >= BigInt(1e18)) return `${Number(n) / 1e18} USDFC`
  if (n >= BigInt(1e15)) return `${Number(n) / 1e15} mUSDFC`
  return `${wei} wei`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" })
  } catch {
    return iso
  }
}

type BillingRow = { date: string; action: string; amount: string; cid?: string }

export default function BillingPage() {
  const [balance, setBalance] = useState<string | null>(null)
  const [prepare, setPrepare] = useState<{ debitPerUploadWei: string; debitPerMonthWei: string } | null>(null)
  const [history, setHistory] = useState<BillingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getApiKey()
    if (!key) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/treasury/balance`, { headers: { "x-api-key": key } }).then((r) => r.ok ? r.json() : {}),
      fetch(`${API_BASE}/dataset/prepare`, { headers: { "x-api-key": key } }).then((r) => r.ok ? r.json() : {}),
    ])
      .then(([bal, prep]) => {
        setBalance(bal.balance != null ? String(bal.balance) : null)
        setPrepare(prep.debitPerUploadWei ? { debitPerUploadWei: prep.debitPerUploadWei, debitPerMonthWei: prep.debitPerMonthWei } : null)
        setHistory([])
      })
      .catch(() => {
        setBalance(null)
        setPrepare(null)
        setHistory([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Billing</h1>
        <p className="text-xs text-muted-foreground font-mono">Treasury balance and storage cost</p>
      </div>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Treasury balance</CardTitle>
          <CardDescription className="text-xs font-mono">Available and spent</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Available balance</p>
            <p className="text-xl font-mono font-bold">{loading ? "—" : balance != null ? formatWei(balance) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total deposited</p>
            <p className="text-xl font-mono font-bold">—</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total spent</p>
            <p className="text-xl font-mono font-bold">—</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Deposit funds</CardTitle>
          <Button asChild className="font-mono uppercase bg-foreground text-background">
            <Link href="/dashboard/billing/deposit">
              <Wallet size={14} className="mr-2" />
              Deposit funds
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground font-mono">Deposit USDFC to your treasury to pay for storage. Use the button to open wallet interaction.</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Billing history</CardTitle>
          <CardDescription className="text-xs font-mono">Deposits and storage deductions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Action</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Amount</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Dataset CID</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-muted-foreground">No billing history yet</td></tr>
                ) : (
                  history.map((row, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-3">{formatDate(row.date)}</td>
                      <td className="p-3">{row.action}</td>
                      <td className="p-3">{row.amount}</td>
                      <td className="p-3 font-mono truncate max-w-[120px]">{row.cid ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Storage pricing</CardTitle>
          <CardDescription className="text-xs font-mono">Cost model</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cost per upload</p>
            <p className="text-lg font-mono font-bold">{prepare ? formatWei(prepare.debitPerUploadWei) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cost per month</p>
            <p className="text-lg font-mono font-bold">{prepare ? formatWei(prepare.debitPerMonthWei) : "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
