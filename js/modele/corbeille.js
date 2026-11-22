// Corbeille : un univers, un type, une fiche, un tome ou un élément du plan (noeud) supprimé reçoit `corbeille: <date>` au lieu d'être effacé.
import { supprimerUnivers } from './univers.js';
import { contenuTome } from './tomes.js';
import { noeudsTome, descendants } from './plan.js';

const STORE = { univers: 'univers', type: 'typesFiches', fiche: 'fiches', tome: 'tomes', noeud: 'noeudsManuscrit' };

// Tout ce qui est à la corbeille : [{ sorte, objet }]. Le contenu d'un univers à la corbeille n'est pas listé à part.
export async function contenuCorbeille(stockage) {
  const univers = await stockage.tous('univers');
  const jetes = new Set(univers.filter(u => u.corbeille).map(u => u.id));
  const elements = [];
  for (const [sorte, s] of Object.entries(STORE))
    for (const objet of await stockage.tous(s))
      if (objet.corbeille && (sorte === 'univers' || !jetes.has(objet.universId))) elements.push({ sorte, objet });
  return elements.sort((a, b) => b.objet.corbeille - a.objet.corbeille);
}

export const mettreALaCorbeille = (stockage, sorte, objet) =>
  stockage.put(STORE[sorte], { ...objet, corbeille: Date.now() });

export async function restaurer(stockage, sorte, objet, changements = {}) {
  const { corbeille, ...reste } = objet;
  await stockage.put(STORE[sorte], { ...reste, ...changements });
}

// Efface pour de bon, avec ce qui n'appartient qu'à l'élément (images et versions d'une fiche, contenu d'un univers).
export async function supprimerDefinitivement(stockage, sorte, objet) {
  if (sorte === 'univers') return supprimerUnivers(stockage, objet.id);
  const ops = sorte === 'noeud' ? [] : [['delete', STORE[sorte], objet.id]];
  if (sorte === 'fiche') {
    for (const img of [objet.imageId, ...(objet.galerie ?? [])].filter(Boolean)) ops.push(['delete', 'images', img]);
    for (const v of await stockage.query('versions', 'ficheId', objet.id)) ops.push(['delete', 'versions', v.id]);
  }
  if (sorte === 'tome') ops.push(...await contenuTome(stockage, objet));
  if (sorte === 'noeud') // l'élément, ce qu'il contient et leurs textes
    for (const n of [objet, ...descendants(objet, await noeudsTome(stockage, objet.tomeId))])
      ops.push(['delete', 'noeudsManuscrit', n.id], ['delete', 'textes', n.id]);
  await stockage.lot(ops);
}

// Vide la corbeille, ou seulement ce qui y est depuis plus de `jours` jours.
export async function viderCorbeille(stockage, jours = 0) {
  const limite = Date.now() - jours * 864e5;
  for (const { sorte, objet } of await contenuCorbeille(stockage))
    if (objet.corbeille <= limite) await supprimerDefinitivement(stockage, sorte, objet);
}
