import { cityAt } from '@juno/geo';
import { useEffect, useState } from 'react';
import { deviceLocation } from '@/lib/location';

/**
 * The city the owner is in, for the line under their own name (owner,
 * 2026-09-23: "kisinin profilinde isim ve diger alanlar arasinda bosluk
 * yerine bulundugu sehir yazsin", then "ben zaten sadece kendi
 * profilinde sehir goziksun dedim, baskalarininkinde ayni yerde mesafe
 * gozukecek").
 *
 * Their own screen only, and never stored or sent: the point comes from
 * the device, the name is read off the offline city list, and neither
 * leaves this function. Nothing about anybody else changes, which is why
 * this needed no column, no view and no change to the privacy notice —
 * what another member sees in that same place is still the rounded
 * distance and nothing more.
 *
 * Null while it is being worked out, and null when there is no answer: a
 * refused or slow fix, or a point with no city within reach. The line is
 * simply empty then, which is what that place looked like before.
 */
export function useOwnCity(): string | null {
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const point = await deviceLocation();
      if (!live || point === undefined) return;
      // First call parses the 1 MB city list. After the fix has come
      // back rather than on mount, so the parse cannot land on the frame
      // the screen is drawing itself in.
      setCity(cityAt(point.latitude, point.longitude)?.name ?? null);
    })();
    return () => {
      live = false;
    };
  }, []);
  return city;
}
