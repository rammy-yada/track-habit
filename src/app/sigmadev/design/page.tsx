import type { Metadata } from "next";
import { DecorEditor } from "@/components/sigmadev/DecorEditor";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { getDecor } from "@/lib/decor";
import { logoVersion } from "@/lib/logo";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Design" });

export default async function AdminDesignPage() {
  await requireAdmin();
  const [decor, logo] = await Promise.all([getDecor(), logoVersion()]);
  return <DecorEditor initial={decor} logo={logo} />;
}
