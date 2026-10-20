/** How much of a day's list got done, as 0 (nothing) to 4 (everything) — the shade on the Today calendar. */
export function dayLevel(done: number, due: number): number {
  if (done <= 0 || due <= 0) return 0;
  if (done >= due) return 4;
  return done / due > 0.66 ? 3 : done / due > 0.33 ? 2 : 1;
}
