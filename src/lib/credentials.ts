// Offering to save sign-in details in the browser's password manager (Google
// Password Manager in Chrome, and the like).
//
// A form that is sent in the background, as these are, doesn't always trigger
// the browser's own "Save password?" question. So the details typed in are
// held in memory — never written anywhere — until the sign-in is known to
// have worked, and only then handed to the browser, which asks the person.

let pending: { id: string; password: string } | null = null;

/** Called when a sign-in or sign-up form is submitted. */
export function rememberTyped(id: string, password: string): void {
  pending = id && password ? { id, password } : null;
}

/** Called once the person is inside the app: the sign-in worked, so offer to save. */
export async function offerToSave(name: string, username: string): Promise<void> {
  const typed = pending;
  pending = null;
  type Win = Window & { PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential };
  const Password = (window as Win).PasswordCredential;
  if (!typed || !Password || !navigator.credentials) return;
  try {
    // saved under the username: that is what the sign-in form's first box accepts
    await navigator.credentials.store(new Password({ id: username || typed.id, password: typed.password, name }));
  } catch {}
}

/** A sign-in didn't work: forget what was typed. */
export const forgetTyped = () => void (pending = null);
