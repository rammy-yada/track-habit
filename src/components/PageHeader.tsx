/** Sticky page title bar shared by every signed-in page. */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="sticky top-[61px] z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 py-4 backdrop-blur md:top-0 md:px-8 md:py-5">
      <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </div>
  );
}
