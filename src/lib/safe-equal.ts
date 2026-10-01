import { timingSafeEqual } from "node:crypto";

/** Compares two secrets without leaking, through timing, how much of a guess was right. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
