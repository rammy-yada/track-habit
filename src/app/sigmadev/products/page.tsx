import type { Metadata } from "next";
import { AdminProducts } from "@/components/sigmadev/AdminProducts";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { getProducts } from "@/lib/products";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Sellers" });

export default async function AdminProductsPage() {
  const admin = await requireAdmin();
  const products = await getProducts({ all: true });
  return <AdminProducts products={products.map((p) => ({ ...p, added: formatTimestamp(p.createdAt, admin.timezone) }))} />;
}
