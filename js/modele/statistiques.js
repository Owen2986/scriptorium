import { fichesCase } from './types.js';
import { cle, indexNoms, LIEN } from './liens.js';
import { texteBrut } from './recherche.js';

export const compterMots = html => texteBrut(html).split(' ').filter(Boolean).length;

// Chiffres d'un univers : fiches et mots par type, citations ([[ ]] et cases « lien vers une fiche »), liens vers des fiches absentes.
export function statistiques(fiches, types) {
  const index = indexNoms(fiches);
  const citations = new Map(fiches.map(f => [f.id, 0]));
  const absents = new Map(); // clé du nom → { nom, sources: [fiches] }
  const parType = new Map(types.map(t => [t.id, { type: t, fiches: 0, mots: 0 }]));
  let mots = 0;
  for (const f of fiches) {
    const n = compterMots(f.texte) + compterMots(f.secrets);
    mots += n;
    const ligne = parType.get(f.typeId);
    if (ligne) { ligne.fiches++; ligne.mots += n; }
    for (const [, nom] of `${f.texte ?? ''} ${f.secrets ?? ''}`.matchAll(LIEN)) {
      const cible = index.get(cle(nom));
      if (cible) { if (cible.id !== f.id) citations.set(cible.id, citations.get(cible.id) + 1); continue; }
      const a = absents.get(cle(nom)) ?? absents.set(cle(nom), { nom: nom.trim(), sources: [] }).get(cle(nom));
      if (!a.sources.includes(f)) a.sources.push(f);
    }
    for (const c of types.find(t => t.id === f.typeId)?.cases ?? []) {
      for (const id of fichesCase(c, f.valeurs?.[c.id])) {
        if (citations.has(id) && id !== f.id) citations.set(id, citations.get(id) + 1);
      }
    }
  }
  const fiche = new Map(fiches.map(f => [f.id, f]));
  const parNom = (a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr');
  return {
    fiches: fiches.length, mots,
    parType: [...parType.values()],
    plusCitees: [...citations].filter(([, n]) => n).sort((a, b) => b[1] - a[1] || parNom(fiche.get(a[0]), fiche.get(b[0])))
      .slice(0, 5).map(([id, n]) => ({ fiche: fiche.get(id), n })),
    orphelines: fiches.filter(f => !citations.get(f.id)),
    absents: [...absents.values()].sort(parNom),
  };
}
