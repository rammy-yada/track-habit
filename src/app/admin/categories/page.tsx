import type { Metadata } from "next";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { getAdminCategories } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  return <AdminCategories categories={await getAdminCategories()} />;
}
