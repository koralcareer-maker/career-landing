import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listUserDocuments, DOC_TYPE_LABELS } from "@/lib/documents";
import {
  uploadDocumentForUser,
  deleteDocumentForUser,
} from "@/lib/actions/admin-documents";
import { AdminDocumentsClient } from "./admin-documents-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "מסמכים של משתמש | אדמין" };

export default async function AdminUserDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, membershipType: true },
  });
  if (!user) notFound();

  // List existing documents. Tolerate the Blob store not being
  // configured yet — Coral can still upload (the upload action will
  // surface a clear error if BLOB_READ_WRITE_TOKEN is missing).
  const initialDocs = process.env.BLOB_READ_WRITE_TOKEN
    ? await listUserDocuments(id).catch(() => [])
    : [];

  // Plain JSON-friendly (Date → ISO string) for the client.
  const docs = initialDocs.map((d) => ({
    ...d,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" dir="rtl">
      <AdminDocumentsClient
        targetUser={user}
        initialDocuments={docs}
        docTypeLabels={DOC_TYPE_LABELS}
        uploadAction={uploadDocumentForUser}
        deleteAction={deleteDocumentForUser}
      />
    </div>
  );
}
