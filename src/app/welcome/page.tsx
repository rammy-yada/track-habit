import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompleteProfile } from "@/components/CompleteProfile";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { currentUser, profileComplete } from "@/lib/auth";
import { countries, guessCountry } from "@/lib/people";

export const metadata: Metadata = { title: "Finish setting up", robots: { index: false, follow: false } };

// Asked once, straight after the first sign-in (with a password or with
// Google): a few details before the app opens. Until this is done every other
// signed-in page and action sends the person back here.
export default async function WelcomePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (profileComplete(user)) redirect(user.role === "admin" ? "/sigmadev" : "/dashboard");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-10">
        <Logo href="/welcome" />
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-5 pb-16 pt-4">
        <CompleteProfile
          firstName={user.full_name.split(" ")[0]}
          username={user.username}
          // a Google sign-up was given a made-up username: say so, and let them choose
          suggested={Boolean(user.google_id)}
          gender={user.gender ?? ""}
          birthDate={user.birth_date ?? ""}
          country={user.country ?? guessCountry(user.timezone)}
          countries={countries()}
        />
      </main>
    </div>
  );
}
