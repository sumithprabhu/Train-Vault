"use client";

import { useState, useEffect } from "react";
import { getProvenance } from "@/lib/api";

type ProvenanceEntry = {
  id: string;
  datasetCID: string;
  modelArtifactCID: string;
  provenanceHash: string;
  createdAt: string;
};

export default function ProvenanceViewer() {
  const [entries, setEntries] = useState<ProvenanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProvenance()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading lineage…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (entries.length === 0) return <p>No model runs recorded.</p>;

  return (
    <div style={{ marginTop: "1rem" }}>
      {entries.map((e) => (
        <div
          key={e.id}
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          <div>Dataset CID: <code>{e.datasetCID}</code></div>
          <div>Model artifact CID: <code>{e.modelArtifactCID}</code></div>
          <div>Provenance hash: <code>{e.provenanceHash}</code></div>
          <div style={{ fontSize: "0.875rem", color: "#666" }}>
            {new Date(e.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
