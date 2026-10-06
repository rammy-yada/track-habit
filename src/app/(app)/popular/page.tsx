import type { Metadata } from "next";
import { PopularScreen } from "@/components/PopularScreen";
import { requireUser } from "@/lib/auth";
import { getPopular } from "@/lib/popular";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Popular" };

// What people here are doing, and (once the admin has added something) what
// is for sale. A screen of its own: no title bar, no tab bar, just a way back.
export default async function PopularPage() {
  const user = await requireUser();
  const [popular, products] = await Promise.all([getPopular(user.id), getProducts()]);
  return <PopularScreen popular={popular} products={products.map(({ id, name, price, description, category, image }) => ({ id, name, price, description, category, image }))} />;
}
