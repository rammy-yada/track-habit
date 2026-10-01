import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { currentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  return <Landing />;
}
