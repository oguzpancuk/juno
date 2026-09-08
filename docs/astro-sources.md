# Astrology content: sources and verification

The Turkish interpretation texts in `packages/astro/content/tr/` were
authored in-house (mainstream Western tropical astrology, no LLM at
runtime) and then verified key by key against two independent public
references per layer. Verification method: a keyword table per key was
extracted from the sources, every text was judged for semantic match
(central themes present, nothing contradicted) and direction (harmonious
vs tense), and deviations were rewritten. Scores follow ADR-0003.

| Layer                            | File                                       | Keys | Reference 1                                                           | Reference 2                                                                                       | Deviations fixed                         |
| -------------------------------- | ------------------------------------------ | ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Planet in sign, ascendant sign   | signs.json                                 | 132  | Cafe Astrology (planets-in-signs articles, rising signs)              | Astrostyle (planet pages; outer planets blend sign with house)                                    | 4                                        |
| Planet in house                  | houses.json                                | 120  | Cafe Astrology (planets-in-houses)                                    | AstroLibrary.org (interpretations)                                                                | 2 (plus 9 coherence rewrites, see NOTES) |
| Natal aspects                    | natal-aspects.json                         | 214  | Cafe Astrology (pair pages); astrology.com for outer-planet–Ascendant | Astrology King (aspect pages, natal section)                                                      | 8                                        |
| Synastry aspects                 | synastry.json                              | 255  | Cafe Astrology (synastry pair pages, compatibility score sheet)       | astrologyschool.com, Illume Astrology; Authority Astrology and Satyori where no other page exists | 15                                       |
| Element pairs, bands, retrograde | elements.json, bands.json, retrograde.json | 33   | not source-verified (short, structural texts)                         |                                                                                                   | 1 (band "high")                          |

Essential dignities (domicile, exaltation, detriment, fall) were checked
against the traditional table (Wikipedia "Essential dignity", agreeing
with Cafe Astrology): no text for a planet in fall or detriment reads
purely positive, none in domicile or exaltation purely negative.

Known weak spots, kept deliberately:

- Neptune in Aries–Leo and Pluto in Aries–Cancer/Pisces have one source
  only (no living cohort; Cafe Astrology has no page).
- Where the two references disagree (for example Saturn in Sagittarius,
  Jupiter hard aspects in synastry, Venus in the 8th house) the text
  follows the psychological reading (Cafe Astrology) rather than the
  event-oriented one.
- Sign and house texts are written as separable layers: the sign text
  owns character and tempo, the house text owns the life area, the
  aspect text owns the dynamic. No composite sign-plus-house texts exist
  (that would be 1,440 keys); the layering rule keeps them from
  contradicting each other in one reading.

Coherence between the geometry (score, strongest aspect) and the written
characters was checked on seven sample pairs by an independent evaluator
pass; the findings were applied to the texts, not to the samples
(`packages/astro/scripts/content-audit.ts` regenerates the report).
