import "server-only";
import { query } from "./db";

export type Product = { id: number; name: string; price: string; description: string; url: string; category: string; active: boolean; clicks: number; image: string | null; createdAt: string };
type Row = { id: number; name: string; price: string; description: string; url: string; category: string; is_active: number; clicks: number; image_version: number; created_at: string };

const toProduct = (r: Row): Product => ({ id: r.id, name: r.name, price: r.price, description: r.description, url: r.url, category: r.category, active: r.is_active === 1, clicks: r.clicks, image: r.image_version > 0 ? `/shop/image/${r.id}?v=${r.image_version}` : null, createdAt: r.created_at });

/** Products, newest first. Members only ever get the ones that are switched on. */
export async function getProducts(options: { all?: boolean } = {}): Promise<Product[]> {
  return (await query<Row>(`SELECT id, name, price, description, url, category, is_active, clicks, image_version, created_at FROM products ${options.all ? "" : "WHERE is_active = 1"} ORDER BY created_at DESC, id DESC`)).map(toProduct);
}
