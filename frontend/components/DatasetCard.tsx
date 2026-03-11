"use client";

import type { Dataset } from "@/lib/api";

type Props = { dataset: Dataset };

export default function DatasetCard({ dataset }: Props) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: "1rem",
        minWidth: 200,
      }}
    >
      <div><strong>CID</strong> <code>{dataset.cid}</code></div>
      {dataset.previousCID && (
        <div style={{ marginTop: "0.5rem" }}>
          <strong>Previous</strong> <code>{dataset.previousCID}</code>
        </div>
      )}
      <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
        {new Date(dataset.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
