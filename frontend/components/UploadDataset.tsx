"use client";

import { useState } from "react";
import { uploadDataset } from "@/lib/api";

export default function UploadDataset() {
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await uploadDataset(file);
      setCid(result.cid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      <input
        type="file"
        accept=".csv,.json,.parquet"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button type="submit" disabled={!file || loading} style={{ marginLeft: "0.5rem" }}>
        {loading ? "Uploading…" : "Upload"}
      </button>
      {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      {cid && <p style={{ marginTop: "0.5rem" }}>CID: <code>{cid}</code></p>}
    </form>
  );
}
