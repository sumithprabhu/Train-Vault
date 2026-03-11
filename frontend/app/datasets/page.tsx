import DatasetCard from "@/components/DatasetCard";
import Link from "next/link";
import { useDataset } from "@/hooks/useDataset";

export default function DatasetsPage() {
  const { datasets, loading, error } = useDataset();

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <Link href="/">← Home</Link>
      <h1>Datasets</h1>
      <p>List datasets and CIDs.</p>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {datasets?.length === 0 && !loading && <p>No datasets yet.</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
        {datasets?.map((d) => (
          <DatasetCard key={d.id} dataset={d} />
        ))}
      </div>
    </main>
  );
}
