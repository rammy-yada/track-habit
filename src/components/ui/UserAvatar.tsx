import { initial } from "@/lib/text";

export type AvatarInfo = { id: number; name: string; color: string; version: number };

/** A person's photo if they have one, otherwise their initial on their colour. */
export function UserAvatar({ user, size, className = "" }: { user: AvatarInfo; size: number; className?: string }) {
  if (user.version > 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- already a 256px WebP; nothing for the image optimiser to do
      <img src={`/api/avatar/${user.id}?v=${user.version}`} alt="" width={size} height={size} loading="lazy" decoding="async" className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size, background: user.color }} />
    );
  }
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`} style={{ width: size, height: size, background: user.color, fontSize: Math.round(size * 0.4) }}>
      {initial(user.name)}
    </span>
  );
}
