import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { currentUser } from "@/lib/auth";

export default async function HomePage() {
  if (await currentUser()) redirect("/dashboard");
  return <Landing />;
}
