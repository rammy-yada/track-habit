"use client";

/** A card whose soft glow follows the cursor (see .spotlight in globals.css). */
export function Spotlight({ className = "", children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`spotlight ${className}`}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }}
    >
      {children}
    </div>
  );
}
