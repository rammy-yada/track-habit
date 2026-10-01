import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/LegalPage";
import { APP_NAME, LEGAL_UPDATED } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of Service", description: `The rules for using ${APP_NAME}.` };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <section>
        <p>By creating an account or using {APP_NAME}, you agree to these terms. They are short on purpose.</p>
      </section>

      <section>
        <h2>The service</h2>
        <p>{APP_NAME} lets you track habits, see your progress, and optionally take part in the Winter Arc challenge. It is provided free of charge, as it is, and may change or be unavailable at times.</p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Give accurate details, and keep your password to yourself. You are responsible for what happens under your account.</li>
          <li>One person per account. Don&apos;t create accounts for other people or by automated means.</li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Don&apos;t try to access other people&apos;s data, break or overload the service, or get around its limits.</li>
          <li>Don&apos;t put unlawful, hateful or abusive text in names, habits or notes. Names and usernames appear on the leaderboard if you join it.</li>
          <li>Don&apos;t manipulate the leaderboard.</li>
        </ul>
        <p className="mt-2">Accounts that break these rules may be disabled or deleted.</p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          Your habits and notes are yours. You allow us to store and display them to you so the app can work. How your data is handled is described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Workouts and health</h2>
        <p>Workout suggestions are general information, not medical advice. Check with a doctor before starting a new exercise routine if you have any health concerns, and stop if something hurts.</p>
      </section>

      <section>
        <h2>Tips</h2>
        <p>The Support page links to an external tip page. Tips are voluntary, are handled entirely by that service, and unlock nothing in the app.</p>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>The service is provided without warranties of any kind. To the extent the law allows, we are not liable for lost data, lost streaks, or any other loss arising from using it.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          These terms may be updated; the date at the top shows when. Continuing to use the app after a change means you accept it. Questions: contact <Contact />.
        </p>
      </section>
    </LegalPage>
  );
}
