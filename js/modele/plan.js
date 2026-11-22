// Plan d'un tome : parties, chapitres et scènes (store noeudsManuscrit), rangés librement.
import { nouvelId } from './univers.js';
import { compterMots } from './statistiques.js';

export const ETATS = { 'a-ecrire': 'À écrire', brouillon: 'Brouillon', 'a-relire': 'À relire', termine: 'Terminé' };
export const SORTES_PLAN = { partie: 'Partie', chapitre: 'Chapitre', scene: 'Scène' };

export const nouveauNoeud = (tome, sorte, parentId = null) => ({
  id: nouvelId(), tomeId: tome.id, universId: tome.universId, parentId, sorte, titre: '',
  etat: 'a-ecrire', ordre: Date.now(), creeLe: Date.now(),
});

// Tous les éléments du tome (corbeille comprise : ce qui est dedans est écarté par `lignesPlan`).
export const noeudsTome = (stockage, tomeId) => stockage.query('noeudsManuscrit', 'tomeId', tomeId);

// Le plan dans l'ordre de lecture : [{ noeud, niveau, numero }]. Les chapitres sont numérotés dans tout le tome.
// Ce qui est à la corbeille, et tout ce qu'il contient, n'apparaît pas.
export function lignesPlan(noeuds) {
  const enfants = new Map();
  const ids = new Set(noeuds.map(n => n.id));
  for (const n of noeuds.filter(n => !n.corbeille)) {
    const p = ids.has(n.parentId) ? n.parentId : null; // parent disparu : rangé à la racine
    if (!enfants.has(p)) enfants.set(p, []);
    enfants.get(p).push(n);
  }
  const lignes = [];
  let chapitres = 0;
  const parcourir = (parentId, niveau) => {
    for (const n of (enfants.get(parentId) ?? []).sort((a, b) => a.ordre - b.ordre)) {
      lignes.push({ noeud: n, niveau, numero: n.sorte === 'chapitre' ? ++chapitres : null });
      parcourir(n.id, niveau + 1);
    }
  };
  parcourir(null, 0);
  return lignes;
}

export const titreNoeud = ({ noeud, numero }) => noeud.sorte === 'chapitre'
  ? `Chapitre ${numero}${noeud.titre ? ` – ${noeud.titre}` : ''}`
  : noeud.titre || `${SORTES_PLAN[noeud.sorte]} sans titre`;

// Descendants d'un élément (lui non compris).
export function descendants(noeud, noeuds) {
  const ids = new Set([noeud.id]);
  for (let ajout = true; ajout;) {
    ajout = false;
    for (const n of noeuds) if (!ids.has(n.id) && ids.has(n.parentId)) { ids.add(n.id); ajout = true; }
  }
  ids.delete(noeud.id);
  return noeuds.filter(n => ids.has(n.id));
}

// Mots de chaque ligne : son propre texte + tout ce qu'elle contient. Map id → nombre.
export async function motsPlan(stockage, lignes) {
  const propres = new Map(await Promise.all(lignes.map(async ({ noeud }) =>
    [noeud.id, compterMots((await stockage.get('textes', noeud.id))?.html)])));
  const total = new Map();
  for (let i = lignes.length - 1; i >= 0; i--) {
    const n = lignes[i].noeud;
    total.set(n.id, (total.get(n.id) ?? 0) + propres.get(n.id));
    if (n.parentId) total.set(n.parentId, (total.get(n.parentId) ?? 0) + total.get(n.id));
  }
  return total;
}

// Endroits où ranger `noeud` : parties et chapitres, sauf lui-même et ce qu'il contient (pas de boucle).
export function ciblesPossibles(noeud, lignes) {
  const exclus = new Set([noeud.id, ...descendants(noeud, lignes.map(l => l.noeud)).map(n => n.id)]);
  return lignes.filter(l => l.noeud.sorte !== 'scene' && !exclus.has(l.noeud.id));
}

// Échange la place de `noeud` avec son voisin (même parent) ; renvoie les deux éléments modifiés, ou [].
export function echanger(noeud, lignes, sens) {
  const freres = lignes.map(l => l.noeud).filter(n => n.parentId === noeud.parentId);
  const voisin = freres[freres.indexOf(noeud) + sens];
  if (!voisin) return [];
  [noeud.ordre, voisin.ordre] = [voisin.ordre, noeud.ordre];
  if (noeud.ordre === voisin.ordre) noeud.ordre += sens;
  return [noeud, voisin];
}
