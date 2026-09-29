import { placementName, type Planet, type Sign } from '@juno/astro';
import { t } from './strings';

/**
 * S5 placeholder: one generic line per planet. The ~360 real snippets
 * (planet × sign, planet × house, aspects) landed in v1 under
 * packages/astro/content/. Nothing here is astrology; it is scaffolding,
 * and nothing imports it any more (docs/NOTES.md, 2026-09-29).
 */
export function placementLine(planet: Planet, sign: Sign): string {
  return `${placementName(planet, sign, null)}: ${t.chart.planetThemes[planet]}.`;
}
