const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export type Dataset = {
  id: string;
  cid: string;
  previousCID: string | null;
  encrypted: boolean;
  createdAt: string;
};

function headers(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (API_KEY) (h as Record<string, string>)["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

export async function uploadDataset(file: File): Promise<{ cid: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/datasets/upload`, {
    method: "POST",
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function listDatasets(): Promise<Dataset[]> {
  const res = await fetch(`${API_BASE}/api/datasets`, { headers: headers() });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function getProvenance(): Promise<
  { id: string; datasetCID: string; modelArtifactCID: string; provenanceHash: string; createdAt: string }[]
> {
  const res = await fetch(`${API_BASE}/api/provenance`, { headers: headers() });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}
