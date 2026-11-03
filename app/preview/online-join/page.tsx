import { notFound } from "next/navigation";
import { OnlineJoinPreview } from "@/components/events/OnlineJoinPreview";

export default function OnlineJoinPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background px-4 py-5">
      <OnlineJoinPreview />
    </div>
  );
}
