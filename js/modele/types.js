import { nouvelId } from './univers.js';

export const SORTES = { texte: 'Texte', nombre: 'Nombre', liste: 'Liste de choix', fiche: 'Lien vers une fiche' };

export const ICONES = ['👤', '🧙', '🧝', '👑', '⚔️', '🛡️', '🏰', '🏯', '🏘️', '⛪', '🌲', '⛰️', '🌊', '🏝️', '🗺️', '🧭',
  '🗝️', '💎', '📜', '📖', '🔮', '⚗️', '🗡️', '🏹', '🐉', '🐺', '🦅', '🐍', '🦄', '👹', '👻', '💀',
  '🌙', '☀️', '⭐', '🔥', '💧', '🌿', '⚙️', '🚀', '🛸', '🤖', '🔬', '🧬', '🪐', '💡', '⚖️', '🎭'];

export const nouvelleCase = (donnees = {}) => ({ nom: 'Nouvelle case', sorte: 'texte', ...donnees, id: donnees.id ?? nouvelId() });

export const nouveauType = (universId, donnees = {}) => ({
  id: nouvelId(), universId, nom: 'Nouveau type', icone: '📜', couleur: '#5c5c5c', ordre: Date.now(), cases: [],
  ...donnees,
});

// Types proposés au départ dans chaque univers ; « cible » désigne un autre type de base par son nom.
const BASE = [
  ['Personnage', '👤', '#2e5f8b', [
    ['Âge', 'nombre'], ['Espèce', 'texte'], ['Rôle', 'liste', ['Protagoniste', 'Antagoniste', 'Secondaire', 'Figurant']],
    ['Statut', 'liste', ['Vivant', 'Mort', 'Disparu', 'Inconnu']], ['Lieu de naissance', 'fiche', 'Lieu'],
    ['Groupe', 'fiche', 'Groupe/Faction']]],
  ['Lieu', '🏰', '#4f7a28', [
    ['Sorte de lieu', 'liste', ['Royaume', 'Région', 'Ville', 'Village', 'Bâtiment', 'Forêt', 'Montagne', 'Autre']],
    ['Population', 'nombre'], ['Climat', 'texte'], ['Dirigé par', 'fiche', 'Personnage']]],
  ['Objet', '🗝️', '#a0701a', [
    ['Sorte d’objet', 'texte'], ['Propriétaire', 'fiche', 'Personnage'], ['Origine', 'fiche', 'Lieu'], ['Pouvoirs', 'texte']]],
  ['Groupe/Faction', '🛡️', '#7a3b8b', [
    ['Sorte de groupe', 'liste', ['Royaume', 'Guilde', 'Ordre', 'Clan', 'Religion', 'Autre']],
    ['Chef', 'fiche', 'Personnage'], ['Siège', 'fiche', 'Lieu'], ['Devise', 'texte']]],
  ['Créature', '🐉', '#a8322b', [
    ['Habitat', 'fiche', 'Lieu'], ['Taille', 'texte'], ['Danger', 'liste', ['Inoffensive', 'Méfiante', 'Dangereuse', 'Mortelle']]]],
  ['Notion', '💡', '#2f7f7a', [
    ['Domaine', 'liste', ['Magie', 'Religion', 'Histoire', 'Science', 'Coutume', 'Autre']], ['Résumé', 'texte']]],
];

export function typesDeBase(universId) {
  const types = BASE.map(([nom, icone, couleur], i) => nouveauType(universId, { nom, icone, couleur, ordre: i }));
  const parNom = new Map(types.map(t => [t.nom, t.id]));
  BASE.forEach(([, , , cases], i) => {
    types[i].cases = cases.map(([nom, sorte, extra]) => nouvelleCase({
      nom, sorte,
      ...(sorte === 'liste' && { choix: extra }),
      ...(sorte === 'fiche' && { typeCibleId: parNom.get(extra) }),
    }));
  });
  return types;
}

// Les types de base sont créés la première fois qu'on ouvre un univers (y compris ceux créés avant cette fonction).
export async function assurerTypes(stockage, u) {
  if (u.typesCrees) return;
  u.typesCrees = true;
  await stockage.lot([...typesDeBase(u.id).map(t => ['put', 'typesFiches', t]), ['put', 'univers', u]]);
}

export const typesUnivers = async (stockage, universId) =>
  (await stockage.query('typesFiches', 'universId', universId)).sort((a, b) => a.ordre - b.ordre);

// Supprime un type. destinations : Map ficheId → id du type d'arrivée, ou null pour la corbeille.
// nouveaux : types créés pendant la suppression, enregistrés dans la même opération (tout ou rien).
export async function supprimerType(stockage, type, destinations = new Map(), nouveaux = []) {
  const autres = [...(await typesUnivers(stockage, type.universId)).filter(t => t.id !== type.id), ...nouveaux];
  const parId = new Map(autres.map(t => [t.id, t]));
  const ops = [['delete', 'typesFiches', type.id], ...nouveaux.map(t => ['put', 'typesFiches', t])];

  // Les cases « lien vers une fiche » qui visaient ce type acceptent désormais tous les types.
  for (const t of autres) {
    if (!t.cases.some(c => c.typeCibleId === type.id)) continue;
    t.cases = t.cases.map(c => c.typeCibleId === type.id ? { ...c, typeCibleId: null } : c);
    if (!nouveaux.includes(t)) ops.push(['put', 'typesFiches', t]);
  }

  for (const f of await stockage.query('fiches', 'typeId', type.id)) {
    if (f.corbeille) continue; // déjà à la corbeille : gardée telle quelle
    const arrivee = parId.get(destinations.get(f.id));
    if (!arrivee) {
      ops.push(['put', 'fiches', { ...f, corbeille: Date.now() }]);
      continue;
    }
    // Les valeurs passent dans les cases du nouveau type qui portent le même nom.
    const valeurs = {};
    for (const c of type.cases) {
      const cible = arrivee.cases.find(n => n.nom.toLowerCase() === c.nom.toLowerCase());
      if (cible && f.valeurs?.[c.id] !== undefined) valeurs[cible.id] = f.valeurs[c.id];
    }
    ops.push(['put', 'fiches', { ...f, typeId: arrivee.id, valeurs }]);
  }
  await stockage.lot(ops);
}
