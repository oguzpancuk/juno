import * as Location from 'expo-location';

/** A refused or slow fix must never hang a submit; the caller falls back. */
const LOCATION_TIMEOUT_MS = 5000;

export interface Point {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * One-shot device position, or undefined when refused, unavailable or
 * slow. Coarse accuracy on purpose: the profile stores a grid-snapped
 * point and other users only ever see a rounded distance.
 */
export async function deviceLocation(): Promise<Point | undefined> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS);
    });
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      timeout,
    ]).finally(() => clearTimeout(timer));
    if (!position) return undefined;
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return undefined;
  }
}
