import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/LegalPage";
import { APP_NAME, CREATOR, LEGAL_UPDATED } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy", description: `What ${APP_NAME} collects, why, and who can see it.`, alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <section>
        <p>
          {APP_NAME} is a habit tracker made by {CREATOR.handle}. This page says plainly what it stores about you, who can see it, and how to have it removed. It collects only what the app needs to work. There are no ads and no tracking or analytics scripts.
        </p>
      </section>

      <section>
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, username, email address, timezone and avatar colour.
          </li>
          <li>
            <strong>Your password,</strong> only as a one-way bcrypt hash. Nobody, including the administrator, can read it.
          </li>
          <li>
            <strong>Your habits:</strong> their names, categories, icons, the days you ticked them, and any notes or moods you add.
          </li>
          <li>
            <strong>A profile photo,</strong> if you add one. It is resized to a small square and stripped of its metadata (such as location) before it is stored.
          </li>
          <li>
            <strong>Winter Arc membership,</strong> if you choose to join.
          </li>
        </ul>
      </section>

      <section>
        <h2>Signing in with Google</h2>
        <p>
          If you use &ldquo;Continue with Google&rdquo;, Google tells us three things: your <strong>name</strong>, your <strong>email address</strong>, and an <strong>account identifier</strong> that lets us recognise you next time. We ask for nothing else. We never see your Google password and cannot read your Gmail, contacts, Drive or any other Google data. We use this information only to create your {APP_NAME} account and sign you in, and we do not share or sell it.
        </p>
      </section>

      <section>
        <h2>Email</h2>
        <p>
          We use your email address to send a verification code when you sign up, a link when you ask to reset your password, and — only if you have joined the Winter Arc — one reminder on days you still have habits open. Every reminder has a link that turns them off, and you can also switch them off in Profile. We send no marketing email. Messages are delivered through an email service that processes them only to deliver them.
        </p>
      </section>

      <section>
        <h2>Collaboration and brand forms</h2>
        <p>If you write to us through the Collaborate or Brand deals page, we keep what you typed (your name, email address, organisation, link and message) so that we can reply. Only the administrator can read it. We don&apos;t add you to any mailing list, and we delete messages we no longer need. You don&apos;t need an account to send one.</p>
      </section>

      <section>
        <h2>Notifications</h2>
        <p>
          If you turn notifications on, your browser gives us an address for that device at its push service (Google, Apple or Mozilla). We store it and use it only to send your habit reminders, a morning quote and the Winter Arc evening reminder. Turning notifications off, or signing out of the site in your browser settings, removes it.
        </p>
      </section>

      <section>
        <h2>Sharing</h2>
        <p>
          &ldquo;Share my progress&rdquo; makes a picture of your own Winter Arc numbers and passes it to the app you choose on your device. Nothing is posted anywhere unless you post it yourself.
        </p>
      </section>

      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>
            <strong>Only you</strong> can see your habits, check-ins, notes, moods, charts and profile.
          </li>
          <li>
            <strong>Other users</strong> see nothing about you unless you join the Winter Arc. If you do, the leaderboard shows your first name, the first letter of your last name, your username, your profile photo if you have one, your points and your number of active days. Leaving the arc removes you from it.
          </li>
          <li>
            <strong>The administrator</strong> can see your name, username, email, role, join date, and how many habits and check-ins you have, and can disable or delete accounts. The administrator can also reset your password if you forget it and remove an inappropriate photo. The admin screens do not show your habit names, notes or moods.
          </li>
          <li>
            <strong>Whoever operates the database</strong> can technically access everything stored in it except your password.
          </li>
        </ul>
      </section>

      <section>
        <h2>On your device</h2>
        <ul>
          <li>
            <strong>One cookie,</strong> to keep you signed in. It is encrypted, cannot be read by scripts, and expires after 24 hours. It is essential for the app to work and is not used for tracking.
          </li>
          <li>
            <strong>Browser storage</strong> for your theme choice, whether you have seen the welcome guide, and habit ticks waiting to sync.
          </li>
          <li>
            <strong>Offline copies</strong> of the app and your main screens, so it works without a connection. Signing out removes them.
          </li>
        </ul>
      </section>

      <section>
        <h2>Services we rely on</h2>
        <p>
          The site runs on a hosting provider and stores its data with a managed PostgreSQL database provider; both process data only to run the service. Sign-in with Google is provided by Google. The Support page links to an external tip page, which has its own privacy policy and which we do not control. We do not sell or rent your data to anyone.
        </p>
      </section>

      <section>
        <h2>Keeping and deleting your data</h2>
        <p>
          Your data is kept for as long as your account exists. You can do both of these yourself from <strong>Profile → Your data</strong>: download a copy of everything we hold about you, or delete your account. Deleting it removes your habits, check-ins, notes, photo and leaderboard entry, permanently. You can also contact <Contact />.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>Passwords are hashed, the connection to the site and to the database is encrypted, and every page and action checks who is signed in before showing or changing anything. Repeated wrong passwords pause sign-in for a while, and changing your password signs out every other device. No system is perfectly secure; please use a password you don&apos;t use elsewhere.</p>
      </section>

      <section>
        <h2>Children</h2>
        <p>{APP_NAME} is not directed at children under 13, and we do not knowingly collect their data.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, the date at the top changes with it. Questions: contact <Contact />.
        </p>
      </section>
    </LegalPage>
  );
}
