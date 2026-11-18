// Recherche dans les fiches d'un univers, sans tenir compte des majuscules ni des accents.

// Texte mis en forme (HTML) → texte simple, liens [[Nom]] sans leurs crochets.
export const texteBrut = html => (html ?? '')
  .replace(/<\/(p|h2|h3|blockquote|div)>|<(br|hr)\b[^>]*>/gi, ' ').replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/\[\[([^[\]]+)\]\]/g, '$1').replace(/\s+/g, ' ').trim();

// Même longueur que le texte d'origine (caractère par caractère), pour retrouver la place d'un mot dans l'original.
export const plier = s => (s ?? '').replace(/./gsu, c => {
  const p = c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’‘]/g, "'");
  return p.length === c.length ? p : c;
});

// Places [début, fin] de chaque `q` dans `texte`.
export function trouver(texte, q) {
  const t = plier(texte), m = plier(q.trim()), places = [];
  if (!m) return places;
  for (let i = t.indexOf(m); i >= 0; i = t.indexOf(m, i + m.length)) places.push([i, i + m.length]);
  return places;
}

// Bout de texte autour de la première place trouvée (ou le début du texte), coupé entre deux mots.
export function extrait(texte, q, avant = 60, apres = 120) {
  const [p] = trouver(texte, q);
  let debut = p ? Math.max(0, p[0] - avant) : 0;
  let fin = Math.min(texte.length, (p ? p[1] : 0) + apres);
  if (debut > 0 && texte[debut - 1] !== ' ') debut = texte.indexOf(' ', debut) + 1 || debut;
  if (fin < texte.length) fin = texte.lastIndexOf(' ', fin) > debut ? texte.lastIndexOf(' ', fin) : fin;
  return (debut > 0 ? '… ' : '') + texte.slice(debut, fin) + (fin < texte.length ? '…' : '');
}

// Résultats : fiches dont le nom, les autres noms, le texte, les secrets, les cases ou les étiquettes contiennent `q`.
// Chaque résultat : { fiche, type, nom (trouvé dans le nom ?), zone ('texte' | 'secrets'), extrait, aussi: [où d'autre] }.
export function chercher(fiches, types, q) {
  if (!q.trim()) return [];
  const typeDe = new Map(types.map(t => [t.id, t]));
  const nomDe = new Map(fiches.map(f => [f.id, f.nom]));
  const contient = s => trouver(String(s ?? ''), q).length > 0;
  const resultats = [];
  for (const f of fiches) {
    const type = typeDe.get(f.typeId);
    const texte = texteBrut(f.texte), secrets = texteBrut(f.secrets);
    const zones = [['texte', texte], ['secrets', secrets]].filter(([, s]) => contient(s));
    const aussi = [
      (f.autresNoms ?? []).some(contient) && 'autres noms',
      ...(type?.cases ?? []).filter(c => contient(c.sorte === 'fiche' ? nomDe.get(f.valeurs?.[c.id]) : f.valeurs?.[c.id]))
        .map(c => `case « ${c.nom} »`),
      (f.etiquettes ?? []).some(contient) && 'étiquettes',
      zones.length > 1 && 'secrets',
    ].filter(Boolean);
    const nom = contient(f.nom);
    if (!nom && !zones.length && !aussi.length) continue;
    const [zone, source] = zones[0] ?? ['texte', texte];
    resultats.push({ fiche: f, type, nom, zone: zones.length ? zone : null, extrait: source && extrait(source, zones.length ? q : ''), aussi });
  }
  return resultats.sort((a, b) => b.nom - a.nom || (a.fiche.nom || '').localeCompare(b.fiche.nom || '', 'fr'));
}
