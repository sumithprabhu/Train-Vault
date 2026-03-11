const DEFAULT_BASE = "http://localhost:3001";

export function createClient(apiKey?: string, baseUrl?: string) {
  const base = baseUrl ?? process.env.CORPUS_API_URL ?? DEFAULT_BASE;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  return {
    async get<T>(path: string): Promise<T> {
      const res = await fetch(`${base}${path}`, { headers });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      return res.json();
    },
    async post<T>(path: string, body: unknown): Promise<T> {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      return res.json();
    },
    async upload(path: string, file: File | Blob): Promise<{ cid: string }> {
      const form = new FormData();
      form.append("file", file);
      const h: Record<string, string> = {};
      if (apiKey) h["Authorization"] = `Bearer ${apiKey}`;
      const res = await fetch(`${base}${path}`, { method: "POST", headers: h, body: form });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      return res.json();
    },
  };
}
