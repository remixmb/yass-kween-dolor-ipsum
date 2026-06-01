/**
 * The obscure, genuine origins of "lorem ipsum".
 *
 * Lorem ipsum is not nonsense — it is scrambled Latin lifted from Cicero's
 * *de Finibus Bonorum et Malorum* ("On the Ends of Good and Evil"), written in
 * 45 BC. The passage is a meditation on pleasure and pain; the familiar
 * `dolorem ipsum` literally means "pain itself".
 *
 * The Yass Kween theme carries these roots: lower the yassification and this
 * ancient vocabulary resurfaces; raise it and the glam takes over.
 */

/**
 * Authentic words from Cicero's *de Finibus* §1.10.32–33 — the true source of
 * the lorem ipsum passage. Lowercase and de-duplicated.
 */
export const LOREM_ORIGIN_WORDS: readonly string[] = [
  'neque',
  'porro',
  'quisquam',
  'est',
  'qui',
  'dolorem',
  'ipsum',
  'quia',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipisci',
  'velit',
  'sed',
  'non',
  'numquam',
  'eius',
  'modi',
  'tempora',
  'incidunt',
  'labore',
  'dolore',
  'magnam',
  'aliquam',
  'quaerat',
  'voluptatem',
  'enim',
  'ad',
  'minima',
  'veniam',
  'nostrum',
  'exercitationem',
  'ullam',
  'corporis',
  'suscipit',
  'laboriosam',
  'nisi',
  'aliquid',
  'ex',
  'ea',
  'commodi',
  'consequatur',
  'vero',
  'eos',
  'accusamus',
  'iusto',
  'odio',
  'dignissimos',
  'ducimus',
  'blanditiis',
  'praesentium',
  'voluptatum',
  'deleniti',
  'atque',
  'corrupti',
  'quos',
  'dolores',
  'quas',
  'molestias',
  'excepturi',
  'sint',
  'occaecati',
  'cupiditate',
  'provident',
];

/** A short, shareable note about where lorem ipsum actually comes from. */
export const LOREM_ORIGIN_STORY =
  'Lorem ipsum is not gibberish. It is scrambled Latin from Cicero’s ' +
  '"de Finibus Bonorum et Malorum" (On the Ends of Good and Evil), written ' +
  'in 45 BC — a treatise on pleasure and pain. The familiar ' +
  '"dolorem ipsum" means "pain itself". Dial the yassification down and ' +
  'these ancient roots resurface; dial it up and it is pure glam.';

/**
 * English glosses for Cicero's source words — so hovering a blended word can
 * reveal not just the Latin root but what it means. From *de Finibus*
 * 1.10.32–33.
 */
export const LATIN_GLOSS: Readonly<Record<string, string>> = {
  neque: 'nor',
  porro: 'furthermore',
  quisquam: 'anyone',
  est: 'is',
  qui: 'who',
  dolorem: 'pain',
  ipsum: 'itself',
  quia: 'because',
  dolor: 'pain',
  sit: 'let it be',
  amet: 'loves',
  consectetur: 'pursues',
  adipisci: 'to attain',
  velit: 'wishes',
  sed: 'but',
  non: 'not',
  numquam: 'never',
  eius: 'of it',
  modi: 'of a kind',
  tempora: 'times',
  incidunt: 'befall',
  labore: 'by toil',
  dolore: 'by pain',
  magnam: 'great',
  aliquam: 'some',
  quaerat: 'seeks',
  voluptatem: 'pleasure',
  enim: 'indeed',
  ad: 'toward',
  minima: 'least',
  veniam: 'I may come',
  nostrum: 'our',
  exercitationem: 'exertion',
  ullam: 'any',
  corporis: 'of the body',
  suscipit: 'undertakes',
  laboriosam: 'laborious',
  nisi: 'unless',
  aliquid: 'anything',
  ex: 'out of',
  ea: 'that',
  commodi: 'advantage',
  consequatur: 'would follow',
  vero: 'but truly',
  eos: 'them',
  accusamus: 'we accuse',
  iusto: 'rightful',
  odio: 'with hatred',
  dignissimos: 'most worthy',
  ducimus: 'we deem',
  blanditiis: 'by flatteries',
  praesentium: 'of present things',
  voluptatum: 'of pleasures',
  deleniti: 'charmed',
  atque: 'and also',
  corrupti: 'corrupted',
  quos: 'whom',
  dolores: 'sorrows',
  quas: 'which',
  molestias: 'annoyances',
  excepturi: 'to take exception',
  sint: 'may be',
  occaecati: 'blinded',
  cupiditate: 'by desire',
  provident: 'they foresee',
};

/** Look up the English gloss for a Cicero source word (or `''` if unknown). */
export function gloss(word: string): string {
  return LATIN_GLOSS[String(word).toLowerCase()] ?? '';
}
