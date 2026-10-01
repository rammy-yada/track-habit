import type { Metadata } from "next";
import { AdminCategories } from "@/components/sigmadev/AdminCategories";
import { getAdminCategories } from "@/lib/admin-data";
import { adminMetadata, requireAdmin } from "@/lib/auth";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Categories" });

export default async function AdminCategoriesPage() {
  await requireAdmin();
  return <AdminCategories categories={await getAdminCategories()} />;
}
