import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Corpus</h1>
      <p>Dataset & model provenance on Filecoin.</p>
      <nav style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
        <Link href="/upload">Upload</Link>
        <Link href="/datasets">Datasets</Link>
        <Link href="/provenance">Provenance</Link>
      </nav>
    </main>
  );
}
