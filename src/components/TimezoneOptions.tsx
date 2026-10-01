"use client";

import { useEffect, useState } from "react";
import { TIMEZONES } from "@/lib/constants";

/**
 * The choices inside a timezone <select>: a short list of common ones first,
 * then every timezone the device knows — so the app can be used from any
 * country, with habits resetting at that person's own midnight.
 */
export function TimezoneOptions({ current }: { current?: string }) {
  const [all, setAll] = useState<string[]>([]);
  useEffect(() => {
    try {
      setAll((Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? []);
    } catch {}
  }, []);
  const common = new Set(TIMEZONES.map((z) => z.value));
  const rest = all.filter((zone) => !common.has(zone));
  const known = !current || common.has(current) || rest.includes(current);
  return (
    <>
      {!known && <option value={current}>{current}</option>}
      <optgroup label="Common">
        {TIMEZONES.map((z) => (
          <option key={z.value} value={z.value}>
            {z.label}
          </option>
        ))}
      </optgroup>
      {rest.length > 0 && (
        <optgroup label="All timezones">
          {rest.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}
