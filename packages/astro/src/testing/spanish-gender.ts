/**
 * Spanish forms that give a person a gender. Turkish has none, and the app
 * matches women with women and men with men, so no Spanish text may agree
 * with the reader, the other person or the pair; a starter is sent in the
 * member's own voice. One list for every Spanish text: the chart texts and
 * engine lines (packages/astro) and the app catalog and notice (apps/mobile).
 * Forms that agree with a thing ("un vínculo generoso", "las dos cosas") are
 * not listed, or are let through by `INVARIABLE` below.
 */

/** Words ending in -o/-a that do not agree with the person before them. */
const INVARIABLE = new Set([
  'una',
  'la',
  'lo',
  'esa',
  'esta',
  'nada',
  'algo',
  'parte',
  'persona',
  'como',
  'mucho',
  'lado',
  'bajo',
  'no',
  'contigo',
  'fuera',
  'dentro',
  'miembro',
  'realista',
  'marca',
]);

/** Adjectives in -ando, which the gerund test below would let through. */
const NOT_GERUNDS = new Set(['blando', 'nefando', 'infando', 'venerando']);

/**
 * What "los dos", "ambos" or "el otro" may name instead of people: a body
 * ("los dos Soles", capitalised) or one of these nouns. Anything else after
 * them, a verb above all ("los dos buscan"), is the pair or the other
 * person. Matched case-sensitively, so a capital means a body name.
 */
const THINGS =
  'cosas|casos|partes|posturas|caras|lados|polos|extremos|mundos|ritmos|planetas|signos|aspectos|casas|elementos|energías|fuerzas|direcciones|necesidades|maneras|formas|caminos';
const THING =
  'lado|extremo|polo|día|camino|aspecto|planeta|signo|momento|punto|mundo|tiempo';
const notAThing = (nouns: string): string =>
  `(?! (\\p{Lu}|(${nouns})(?![\\p{L}])))`;

/** The adjective after a predicate verb: -o/-a, or masculine -dor/-tor/-ón. */
const ADJECTIVE = String.raw`(muy |tan |más |demasiado )?(\p{L}+(?:[oa]s?|[dt]or(?:es)?|ón|ones))(?![\p{L}])`;

/**
 * "(te sientes|eres|…) (muy )?seguro": the verb and its adjective
 * ("encantador", "juguetón" included). "Es" and "está" are left out: they
 * agree with things far more often than with a person. So is "son" after
 * its subject (23 times in the texts of 2026-10-01: "tus emociones son
 * profundas"); "son" with no subject before it, opening a sentence, is the
 * pair ("Son muy parecidos").
 */
const PREDICATES = [
  new RegExp(
    String.raw`(^|[^\p{L}])(te sientes|sentirte|sentirse|se siente|se sienten|eres|estás|estar|están|pareces|te ves|verte|te pones|ponerte|te quedas|quedarte|te vuelves|volverte) ${ADJECTIVE}`,
    'giu',
  ),
  new RegExp(String.raw`(^|[.;:!?¿¡]\s*)(son) ${ADJECTIVE}`, 'giu'),
];

export const SPANISH_PERSON_FORMS: readonly RegExp[] = [
  /(^|[^\p{L}])junt[oa]s(?![\p{L}])/iu,
  /(^|[^\p{L}])(el uno|la una)(?![\p{L}])/iu,
  // "del otro", "al otro", "el otro", but not "el otro lado".
  new RegExp(
    `(^|[^\\p{L}])([Dd]el|[Aa]l|[Ee]l) otro(?![\\p{L}])${notAThing(THING)}`,
    'u',
  ),
  // "los dos", "las dos", "ambos", "ambas" are the pair unless a thing
  // follows: "los dos se quieren", "entre ambos", but "los dos Soles".
  new RegExp(
    `(^|[^\\p{L}])([Ll]os dos|[Ll]as dos|[Aa]mbos|[Aa]mbas)(?![\\p{L}])${notAThing(THINGS)}`,
    'u',
  ),
  /(^|[^\p{L}])nosotr[oa]s(?![\p{L}])/iu,
  /(^|[^\p{L}])(tú|ti|sí|uno|ustedes) mism[oa]s?(?![\p{L}])/iu,
  /(^|[^\p{L}])(cada uno|cada una|uno por uno|los demás|(otros|los) usuarios)(?![\p{L}])/iu,
  // "Todas" alone is a label for bands; "Todos", "a todas" or "Todas
  // saben…" is people. "Todas las casas" is not.
  /(^todos|(^|[^\p{L}])(a|para|con|de) tod[oa]s|(^|[.;:!?¿¡]\s*)tod[oa]s(?= \p{L}))(?![\p{L}])(?! (los|las|tus|sus|mis|estos|estas|esos|esas)(?![\p{L}]))/iu,
  /(^|[^\p{L}])(lo|la) (denuncias|bloqueas|desbloqueas|conoces)(?![\p{L}])/iu,
];

/** Every gendered form in `text`, as it appears there. */
export function spanishGenderHits(text: string): string[] {
  const hits: string[] = [];
  for (const form of SPANISH_PERSON_FORMS) {
    const found = form.exec(text);
    if (found) hits.push(found[0].trim());
  }
  for (const predicate of PREDICATES)
    for (const found of text.matchAll(predicate)) {
      const word = (found[4] ?? '').toLocaleLowerCase('es');
      // A gerund ("estás acercando") agrees with nobody; "profundo" does.
      const gerund = /(ando|iendo|yendo)$/.test(word) && !NOT_GERUNDS.has(word);
      if (!INVARIABLE.has(word) && !gerund) hits.push(found[0].trim());
    }
  return hits;
}
