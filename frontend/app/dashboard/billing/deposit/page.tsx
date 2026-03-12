"use client"

import { useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Wallet, ArrowLeft } from "lucide-react"

export default function DepositPage() {
  const { isConnected } = useAccount()
  const [amount, setAmount] = useState("")

  return (
    <div className="max-w-lg space-y-6">
      <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Back to Billing
      </Link>
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Deposit funds</h1>
        <p className="text-xs text-muted-foreground font-mono">Add USDFC to your treasury to pay for storage</p>
      </div>
      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Treasury deposit</CardTitle>
          <CardDescription className="text-xs font-mono">Approve USDFC and deposit into the treasury contract (Filecoin Calibration)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!isConnected ? (
            <p className="text-xs text-muted-foreground font-mono">Connect your wallet to deposit.</p>
          ) : (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Amount (USDFC)</label>
                <Input
                  type="text"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button
                className="w-full font-mono uppercase bg-foreground text-background"
                disabled={!amount || Number(amount) <= 0}
                onClick={() => {
                  // TODO: wire to treasury contract — approve USDFC then deposit(amount)
                  alert("Contract deposit not wired yet. Use the backend test script or wire TREASURY_CONTRACT_ADDRESS and USDFC_TOKEN_ADDRESS in the frontend.")
                }}
              >
                <Wallet size={14} className="mr-2" />
                Deposit
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )