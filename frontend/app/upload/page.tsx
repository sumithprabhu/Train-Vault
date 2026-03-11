import UploadDataset from "@/components/UploadDataset";
import Link from "next/link";

export default function UploadPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <Link href="/">← Home</Link>
      <h1>Upload dataset</h1>
      <UploadDataset />
    </main>
  );
}
