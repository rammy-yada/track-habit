import { redirect } from "next/navigation";
import { AuthAside } from "@/components/auth/AuthAside";
import { ThemeToggle } from "@/components/ThemeToggle";
import { currentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/sigmadev" : "/dashboard");
  return (
    <div className="flex min-h-dvh">
      <AuthAside />
      <main className="relative flex flex-1 items-center justify-center px-5 py-12">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
