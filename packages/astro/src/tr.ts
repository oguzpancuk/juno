import type { Planet } from './bodies';
import type { Sign } from './signs';

/** Turkish display names. UI strings live with the data they name. */
export const PLANET_TR: Readonly<Record<Planet, string>> = {
  sun: 'Güneş',
  moon: 'Ay',
  mercury: 'Merkür',
  venus: 'Venüs',
  mars: 'Mars',
  jupiter: 'Jüpiter',
  saturn: 'Satürn',
  uranus: 'Uranüs',
  neptune: 'Neptün',
  pluto: 'Plüton',
};

export const SIGN_TR: Readonly<Record<Sign, string>> = {
  aries: 'Koç',
  taurus: 'Boğa',
  gemini: 'İkizler',
  cancer: 'Yengeç',
  leo: 'Aslan',
  virgo: 'Başak',
  libra: 'Terazi',
  scorpio: 'Akrep',
  sagittarius: 'Yay',
  capricorn: 'Oğlak',
  aquarius: 'Kova',
  pisces: 'Balık',
};

/** Locative form ("Koç'ta", "Yengeç'te") for "X is in Y" sentences. */
export const SIGN_TR_LOCATIVE: Readonly<Record<Sign, string>> = {
  aries: "Koç'ta",
  taurus: "Boğa'da",
  gemini: "İkizler'de",
  cancer: "Yengeç'te",
  leo: "Aslan'da",
  virgo: "Başak'ta",
  libra: "Terazi'de",
  scorpio: "Akrep'te",
  sagittarius: "Yay'da",
  capricorn: "Oğlak'ta",
  aquarius: "Kova'da",
  pisces: "Balık'ta",
};

/** Degrees within a sign as astrologers write it, e.g. 21°08′. */
export function formatDegree(degree: number): string {
  const whole = Math.floor(degree);
  const minutes = Math.floor((degree - whole) * 60);
  return `${whole}°${String(minutes).padStart(2, '0')}′`;
}
