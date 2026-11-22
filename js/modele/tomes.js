import { nouvelId } from './univers.js';
import { compterMots } from './statistiques.js';

export const nouveauTome = (universId, donnees = {}) => ({
  id: nouvelId(), universId, titre: 'Nouveau tome', resume: '', couvertureId: null, objectif: null,
  ordre: Date.now(), creeLe: Date.now(), ...donnees,
});

// Tris de la liste des tomes : clé → [libellé, comparaison].
export const TRIS_TOMES = {
  ordre: ['Ordre choisi', (a, b) => a.ordre - b.ordre],
  recents: ['Créés récemment', (a, b) => b.creeLe - a.creeLe],
  anciens: ['Créés en premier', (a, b) => a.creeLe - b.creeLe],
};

// Tomes d'un univers hors corbeille, dans l'ordre choisi.
export const tomesUnivers = async (stockage, universId) =>
  (await stockage.query('tomes', 'universId', universId)).filter(t => !t.corbeille).sort(TRIS_TOMES.ordre[1]);

// Parties, chapitres et scènes d'un tome (hors corbeille), avec leurs textes.
const noeuds = async (stockage, tomeId) => (await stockage.query('noeudsManuscrit', 'tomeId', tomeId)).filter(n => !n.corbeille);

export async function motsTome(stockage, tomeId) {
  const textes = await Promise.all((await noeuds(stockage, tomeId)).map(n => stockage.get('textes', n.id)));
  return textes.reduce((total, t) => total + compterMots(t?.html), 0);
}

// Copie du tome, de sa couverture et de tout son contenu (nouveaux identifiants, parents suivis).
export async function dupliquerTome(stockage, tome) {
  const ops = [];
  const { corbeille, ...reste } = tome;
  const copie = { ...reste, id: nouvelId(), titre: `${tome.titre || 'Sans titre'} (copie)`, creeLe: Date.now(), ordre: Date.now() };
  const img = tome.couvertureId && await stockage.get('images', tome.couvertureId);
  copie.couvertureId = img ? nouvelId() : null;
  if (img) ops.push(['put', 'images', { ...img, id: copie.couvertureId }]);
  const liste = await noeuds(stockage, tome.id);
  const ids = new Map(liste.map(n => [n.id, nouvelId()]));
  for (const n of liste) {
    ops.push(['put', 'noeudsManuscrit', { ...n, id: ids.get(n.id), tomeId: copie.id, parentId: ids.get(n.parentId) ?? null }]);
    const t = await stockage.get('textes', n.id);
    if (t) ops.push(['put', 'textes', { ...t, noeudId: ids.get(n.id) }]);
  }
  await stockage.lot([...ops, ['put', 'tomes', copie]]);
  return copie;
}

// Ce qui n'appartient qu'au tome, à effacer avec lui pour de bon.
export async function contenuTome(stockage, tome) {
  const ops = tome.couvertureId ? [['delete', 'images', tome.couvertureId]] : [];
  for (const n of await stockage.query('noeudsManuscrit', 'tomeId', tome.id))
    ops.push(['delete', 'noeudsManuscrit', n.id], ['delete', 'textes', n.id]);
  return ops;
}
