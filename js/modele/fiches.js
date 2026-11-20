import { nouvelId } from './univers.js';

export const nouvelleFiche = (universId, typeId, donnees = {}) => ({
  id: nouvelId(), universId, typeId, nom: 'Nouvelle fiche', valeurs: {}, texte: '', secrets: '',
  imageId: null, galerie: [], etiquettes: [], autresNoms: [], favori: false, parentId: null, creeLe: Date.now(),
  ...donnees,
});

// Copie complète d'une fiche (images comprises, recopiées pour que chaque fiche ait les siennes), sans les autres noms.
export async function dupliquerFiche(stockage, f) {
  const ops = [];
  const copierImage = async id => {
    const img = id && await stockage.get('images', id);
    if (!img) return null;
    const copie = { ...img, id: nouvelId() };
    ops.push(['put', 'images', copie]);
    return copie.id;
  };
  const { corbeille, modifieLe, ...reste } = structuredClone(f);
  const copie = { ...reste, id: nouvelId(), nom: `${f.nom || 'Sans nom'} (copie)`, autresNoms: [], creeLe: Date.now(),
    imageId: await copierImage(f.imageId), galerie: (await Promise.all((f.galerie ?? []).map(copierImage))).filter(Boolean) };
  await stockage.lot([...ops, ['put', 'fiches', copie]]);
  return copie;
}

const parNom =(a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr');

const recente = (cle, a, b) => (b[cle] ?? b.creeLe ?? 0) - (a[cle] ?? a.creeLe ?? 0) || parNom(a, b);
// Ordres de tri de la liste des fiches : clé → [libellé, comparaison].
export const TRIS = {
  nom: ['Nom, de A à Z', parNom],
  'nom-inverse': ['Nom, de Z à A', (a, b) => parNom(b, a)],
  modifiees: ['Modifiées récemment', (a, b) => recente('modifieLe', a, b)],
  creees: ['Créées récemment', (a, b) => recente('creeLe', a, b)],
};

// Fiches d'un univers hors corbeille, par ordre alphabétique.
export const fichesUnivers = async (stockage, universId) =>
  (await stockage.query('fiches', 'universId', universId)).filter(f => !f.corbeille).sort(parNom);

// Fiches qu'on peut choisir comme parente de `fiche` : ni elle-même ni ses descendantes (pas de boucle).
export function parentesPossibles(fiche, fiches) {
  const exclues = new Set([fiche.id]);
  for (let ajout = true; ajout;) {
    ajout = false;
    for (const f of fiches) if (!exclues.has(f.id) && exclues.has(f.parentId)) { exclues.add(f.id); ajout = true; }
  }
  return fiches.filter(f => !exclues.has(f.id));
}
