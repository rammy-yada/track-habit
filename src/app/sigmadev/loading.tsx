import { PageSkeleton } from "@/components/Skeleton";

// Shown immediately on navigation, until the page has its data.
export default function Loading() {
  return <PageSkeleton />;
}
