/**
 * The page title bar shared by every signed-in page. On a computer it stays
 * at the top while the page scrolls; on a phone it scrolls away with the
 * rest, so the whole screen is free for the content.
 */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 py-4 backdrop-blur md:sticky md:top-0 md:px-8 md:py-5">
      <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </div>
  );
}
