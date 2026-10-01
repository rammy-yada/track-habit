"use client";

import { useEffect } from "react";
import { offerToSave } from "@/lib/credentials";

/** Sits on the first screens after signing in: if a password was just typed, offers to save it in the browser's password manager. */
export function SaveCredential({ name, username }: { name: string; username: string }) {
  useEffect(() => void offerToSave(name, username), [name, username]);
  return null;
}
