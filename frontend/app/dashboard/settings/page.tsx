"use client"

import { useAccount } from "wagmi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getApiKey } from "@/lib/api"
import { Settings as SettingsIcon } from "lucide-react"

function truncate(s: string) {
  if (s.length <= 10) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

export default function SettingsPage() {
  const { address } = useAccount()
  const apiKey = getApiKey()
  const keyOwner = apiKey ? truncate(apiKey.slice(0, 12)) : "—"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Settings</h1>
        <p className="text-xs text-muted-foreground font-mono">Account configuration</p>
      </div>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Account info</CardTitle>
          <CardDescription className="text-xs font-mono">Wallet and API key owner</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">User wallet</Label>
            <p className="font-mono text-sm mt-1">{address ? `${address.slice(0, 10)}…${address.slice(-8)}` : "—"}</p>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">API key owner</Label>
            <p className="font-mono text-sm mt-1">{keyOwner}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Preferences</CardTitle>
          <CardDescription className="text-xs font-mono">Default network and notifications</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-mono">Default network</Label>
              <p className="text-[10px] text-muted-foreground font-mono">Filecoin Calibration</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono">Email notifications</Label>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
