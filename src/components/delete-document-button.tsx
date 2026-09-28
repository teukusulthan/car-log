"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteDocumentAction } from "@/server/actions/documents";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteButton
      label="Delete document"
      title="Delete this document?"
      description="Its reminder and photos will be removed."
      onConfirm={async () => {
        await deleteDocumentAction(documentId);
        toast.success("Document deleted");
        router.replace("/documents");
      }}
    />
  );
}
