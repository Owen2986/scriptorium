import { nouvelId } from './univers.js';

export const nouvelleFiche = (universId, typeId, donnees = {}) => ({
  id: nouvelId(), universId, typeId, nom: 'Nouvelle fiche', valeurs: {}, texte: '', secrets: '',
  imageId: null, galerie: [], etiquettes: [], favori: false, parentId: null, creeLe: Date.now(),
  ...donnees,
});

const parNom = (a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr');

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
