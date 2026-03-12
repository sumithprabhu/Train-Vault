"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiGet } from "@/lib/api"
import { Activity as ActivityIcon } from "lucide-react"

type DatasetItem = {
  cid: string
  uploadTimestamp?: string
  createdAt: string
  treasuryRecorded?: boolean
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return iso
  }
}

export default function ActivityPage() {
  const [events, setEvents] = useState<{ timestamp: string; event: string; cid: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<{ datasets?: DatasetItem[] }>("/dataset")
      .then((data) => {
        const list = data.datasets ?? []
        const mapped = list.map((d) => ({
          timestamp: d.uploadTimestamp || d.createdAt,
          event: "Dataset uploaded",
          cid: d.cid,
          status: d.treasuryRecorded ? "Recorded onchain" : "Pending",
        }))
        setEvents(mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Activity</h1>
        <p className="text-xs text-muted-foreground font-mono">System logs and events</p>
      </div>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Events</CardTitle>
          <CardDescription className="text-xs font-mono">Dataset uploads, storage recorded, failures</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Timestamp</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Event</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Dataset CID</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-6 text-muted-foreground">Loading…</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-muted-foreground">No activity yet</td></tr>
                ) : (
                  events.map((e, i) => (
                    <tr key={`${e.cid}-${i}`} className="border-b border-border">
                      <td className="p-3">{formatDate(e.timestamp)}</td>
                      <td className="p-3">{e.event}</td>
                      <td className="p-3 font-mono truncate max-w-[160px]" title={e.cid}>{e.cid.slice(0, 16)}…</td>
                      <td className="p-3">{e.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
