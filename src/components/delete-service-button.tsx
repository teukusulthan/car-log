"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteServiceAction } from "@/server/actions/services";

export function DeleteServiceButton({ recordId }: { recordId: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteButton
      label="Delete service"
      title="Delete this service?"
      description="Its items, cost and photos will be removed, and due dates recalculated from earlier services."
      onConfirm={async () => {
        await deleteServiceAction(recordId);
        toast.success("Service deleted");
        router.replace("/history");
      }}
    />
  );
}
