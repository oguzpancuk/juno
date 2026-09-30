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
  // Agreeing with a thing named before the verb, in today's texts.
  'marca',
  'parejos',
  'entrelazados',
  'difusas',
]);

/** "(te sientes|eres|…) (muy )?seguro": the verb and its adjective. */
const PREDICATE =
  /(^|[^\p{L}])(te sientes|sentirte|sentirse|se sienten|eres|estás|estar|están|pareces|te quedas|quedarte|te vuelves|volverte) (muy |tan |más |demasiado )?(\p{L}+[oa]s?)(?![\p{L}])/giu;

export const SPANISH_PERSON_FORMS: readonly RegExp[] = [
  /(^|[^\p{L}])junt[oa]s(?![\p{L}])/iu,
  /(^|[^\p{L}])(el uno|la una)(?![\p{L}])/iu,
  // "del otro", "al otro", "el otro", but not "el otro lado".
  /(^|[^\p{L}])(de|a)?l otro(?![\p{L}])(?! (lado|extremo|polo))/iu,
  // "los dos" or "las dos" alone is a pair; "los dos Soles" is not.
  /(^|[^\p{L}])(los|las) dos(?![\p{L}])(?! \p{L})/iu,
  /(^|[^\p{L}])(para|a|de|con) (ambos|ambas)(?![\p{L}])/iu,
  /(^|[^\p{L}])nosotr[oa]s(?![\p{L}])/iu,
  /(^|[^\p{L}])(tú|ti|sí|uno|ustedes) mism[oa]s?(?![\p{L}])/iu,
  /(^|[^\p{L}])(cada uno|uno por uno|los demás|(otros|los) usuarios)(?![\p{L}])/iu,
  // "Todas" alone is a label for bands; "Todos" or "a todas" is people.
  /(^todos|(^|[^\p{L}])(a|para|con|de) tod[oa]s)(?![\p{L}])(?! (los|las|tus|sus|mis|estos|estas|esos|esas)(?![\p{L}]))/iu,
  /(^|[^\p{L}])(lo|la) (denuncias|bloqueas|desbloqueas|conoces)(?![\p{L}])/iu,
];

/** Every gendered form in `text`, as it appears there. */
export function spanishGenderHits(text: string): string[] {
  const hits: string[] = [];
  for (const form of SPANISH_PERSON_FORMS) {
    const found = form.exec(text);
    if (found) hits.push(found[0].trim());
  }
  for (const found of text.matchAll(PREDICATE)) {
    const word = (found[4] ?? '').toLocaleLowerCase('es');
    // A gerund ("estás acercando") agrees with nobody.
    if (!INVARIABLE.has(word) && !word.endsWith('ndo'))
      hits.push(found[0].trim());
  }
  return hits;
}
