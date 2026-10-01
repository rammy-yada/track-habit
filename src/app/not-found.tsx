import Link from "next/link";
import { btnPrimary } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <p className="font-display text-7xl font-extrabold tracking-tight text-brand">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold">This page drifted off</h1>
        <p className="mt-2 text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className={`${btnPrimary} mt-6`}>
          Back home
        </Link>
      </div>
    </main>
  );
}
