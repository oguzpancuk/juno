import {
  PLANET_TR,
  SIGN_TR_LOCATIVE,
  type Planet,
  type Sign,
} from '@juno/astro';

/**
 * S5 placeholder: one generic line per planet. The ~360 real snippets
 * (planet × sign, planet × house, aspects) land in v1 under
 * packages/astro/content/tr. Nothing here is astrology; it is scaffolding.
 */
const PLANET_THEME: Readonly<Record<Planet, string>> = {
  sun: 'kimliğini ve yaşam enerjini anlatır',
  moon: 'duygusal ihtiyaçlarını ve iç dünyanı anlatır',
  mercury: 'düşünme ve iletişim biçimini anlatır',
  venus: 'sevme ve ilişki kurma biçimini anlatır',
  mars: 'isteklerini ve harekete geçme tarzını anlatır',
  jupiter: 'nerede genişlediğini ve şansını anlatır',
  saturn: 'sorumluluklarını ve sınırlarını anlatır',
  uranus: 'nerede farklı olduğunu anlatır',
  neptune: 'hayallerini ve sezgilerini anlatır',
  pluto: 'dönüşüm gücünü anlatır',
};

export function placementLine(planet: Planet, sign: Sign): string {
  return `${PLANET_TR[planet]} ${SIGN_TR_LOCATIVE[sign]}: ${PLANET_THEME[planet]}.`;
}
