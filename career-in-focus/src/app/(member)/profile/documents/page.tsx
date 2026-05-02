import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listUserDocuments } from "@/lib/documents";
import { DocumentsClient } from "./documents-client";

export const metadata = { title: "המסמכים שלי | קריירה בפוקוס" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const initialDocs = process.env.BLOB_READ_WRITE_TOKEN
    ? await listUserDocuments(session.user.id).catch(() => [])
    : [];

  // Pass the documents as plain JSON-friendly objects (Date → ISO string).
  const docs = initialDocs.map((d) => ({
    ...d,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6">
      <DocumentsClient userId={session.user.id} initialDocuments={docs} />
    </div>
  );
}
