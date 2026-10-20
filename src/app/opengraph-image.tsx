import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/constants";
import { logoDataUrl } from "@/lib/logo-image";

// The picture shown when a link to the site is shared (Facebook, WhatsApp,
// Messenger, X, Discord…). 1200×630 is the size they all expect.
export const alt = `${APP_NAME} — free habit tracker with streaks, charts and the Winter Arc challenge`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// made on request, so a new logo shows straight away (the host keeps each copy for an hour)
export const dynamic = "force-dynamic";

export default async function Image() {
  const logo = await logoDataUrl(128);
  const days = [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #0b1020 0%, #111a36 55%, #1d4ed8 140%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- drawn into the generated picture
            <img src={logo} width={64} height={64} alt="" style={{ borderRadius: 16 }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: "#2563eb" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h4l3-9 6 18 3-9h4" />
              </svg>
            </div>
          )}
          <div style={{ display: "flex", marginLeft: 20, fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>{APP_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>Master your routine.</div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 34, color: "#c7d2fe" }}>Free habit tracker · streaks · charts · works offline</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex" }}>
            {days.map((done, i) => (
              <div key={i} style={{ display: "flex", width: 44, height: 44, marginRight: 10, borderRadius: 12, background: done ? "#3b82f6" : "rgba(255,255,255,0.12)" }} />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: "#93c5fd", whiteSpace: "nowrap" }}>WINTER ARC · OCT 1 – JAN 31</div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
