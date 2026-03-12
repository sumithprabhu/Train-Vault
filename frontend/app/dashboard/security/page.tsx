"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getApiKey, apiGet, API_BASE } from "@/lib/api"
import { Key, Plus, Copy, Trash2 } from "lucide-react"

type ApiKeyRow = {
  id: string
  name?: string
  prefix: string
  createdAt: string
  lastUsed?: string
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" })
  } catch {
    return iso
  }
}

export default function SecurityPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  useEffect(() => {
    const key = getApiKey()
    if (!key) return
    setLoading(true)
    apiGet<{ keys?: ApiKeyRow[] }>("/user/keys")
      .then((data) => setKeys(data.keys ?? []))
      .catch(() => {
        const k = getApiKey()
        if (k) setKeys([{ id: "current", name: "Primary", prefix: k.slice(0, 12) + "…", createdAt: "" }])
        else setKeys([])
      })
      .finally(() => setLoading(false))
  }, [])

  const createKey = async () => {
    setCreateOpen(false)
    setNewKeyName("")
    alert("Additional API keys are not supported yet. Use the key created at login.")
  }

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Security & access</h1>
        <p className="text-xs text-muted-foreground font-mono">API keys and developer access</p>
      </div>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-mono uppercase tracking-wider">API keys</CardTitle>
            <CardDescription className="text-xs font-mono">Create and revoke keys</CardDescription>
          </div>
          <Button
            size="sm"
            className="font-mono uppercase bg-foreground text-background"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} className="mr-2" />
            Create API key
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Key name</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Prefix</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Created</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Last used</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-muted-foreground">Loading…</td></tr>
                ) : keys.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-muted-foreground">No API keys. Create one to use the API.</td></tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="border-b border-border">
                      <td className="p-3">{k.name || "—"}</td>
                      <td className="p-3 font-mono">{k.prefix}…</td>
                      <td className="p-3">{formatDate(k.createdAt)}</td>
                      <td className="p-3">{k.lastUsed ? formatDate(k.lastUsed) : "—"}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyKey(k.prefix)}>
                          <Copy size={12} />
                        </Button>
                      </td>
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
          <CardTitle className="text-base font-mono uppercase tracking-wider">API usage</CardTitle>
          <CardDescription className="text-xs font-mono">Requests and rate limits</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Requests today</p>
            <p className="text-lg font-mono font-bold">—</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Requests this month</p>
            <p className="text-lg font-mono font-bold">—</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Rate limit status</p>
            <p className="text-lg font-mono font-bold">OK</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="font-mono border-2 border-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">Create API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Key name</label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production"
                className="font-mono"
              />
            </div>
            <Button className="w-full font-mono uppercase" onClick={createKey}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent className="font-mono border-2 border-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">Copy your key</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">This is the only time you will see the full key. Store it securely.</p>
          {createdKey && (
            <div className="flex gap-2">
              <Input readOnly value={createdKey} className="font-mono text-xs" />
              <Button size="sm" onClick={() => copyKey(createdKey)}><Copy size={14} /></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
