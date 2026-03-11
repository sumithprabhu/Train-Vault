"use client";

import { useState, useEffect } from "react";
import { listDatasets, type Dataset } from "@/lib/api";

export function useDataset() {
  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDatasets()
      .then(setDatasets)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return { datasets: datasets ?? [], loading, error };
}
