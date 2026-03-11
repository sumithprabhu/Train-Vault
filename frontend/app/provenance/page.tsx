import ProvenanceViewer from "@/components/ProvenanceViewer";
import Link from "next/link";

export default function ProvenancePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <Link href="/">← Home</Link>
      <h1>Model lineage</h1>
      <p>View dataset → model provenance.</p>
      <ProvenanceViewer />
    </main>
  );
}
