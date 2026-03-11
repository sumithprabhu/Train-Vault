"use client";

import type { Dataset } from "@/lib/api";

type Props = { datasets: Dataset[] };

export default function VersionGraph({ datasets }: Props) {
  if (datasets.length === 0) return <p>No version history.</p>;

  return (
    <div style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
      {datasets.map((d, i) => (
        <div key={d.id} style={{ marginBottom: "0.5rem" }}>
          {i > 0 && <span style={{ marginRight: "0.5rem" }}>↳</span>}
          <code>{d.cid}</code>
          {d.previousCID && <span style={{ color: "#666" }}> ← {d.previousCID}</span>}
        </div>
      ))}
    </div>
  );
}
