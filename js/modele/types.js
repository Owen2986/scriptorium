import { nouvelId } from './univers.js';

export const SORTES = { texte: 'Texte', nombre: 'Nombre', liste: 'Liste de choix', coche: 'Case à cocher',
  fiche: 'Lien vers une fiche', fiches: 'Plusieurs fiches liées' };
// Fiches visées par une case « fiche » ou « fiches » (une valeur garde son sens quand on passe de l'une à l'autre).
export const fichesCase = (c, v) => c.sorte === 'fiche' || c.sorte === 'fiches' ? [].concat(v ?? []).filter(Boolean) : [];

// Dessins de icones/types.svg (game-icons.net, licence CC BY 3.0) → nom lu par les lecteurs d'écran.
export const ICONES = {
  'person': 'Personne', 'wizard-face': 'Magicien', 'woman-elf-face': 'Elfe', 'crown': 'Couronne',
  'crossed-swords': 'Épées croisées', 'checked-shield': 'Bouclier', 'castle': 'Château', 'pagoda': 'Pagode',
  'village': 'Village', 'church': 'Église', 'pine-tree': 'Sapin', 'peaks': 'Montagnes', 'big-wave': 'Vague',
  'island': 'Île', 'treasure-map': 'Carte au trésor', 'compass': 'Boussole', 'key': 'Clé', 'cut-diamond': 'Diamant',
  'scroll-unfurled': 'Parchemin', 'book-cover': 'Livre', 'crystal-ball': 'Boule de cristal', 'potion-ball': 'Potion',
  'broadsword': 'Épée', 'bow-arrow': 'Arc', 'dragon-head': 'Dragon', 'wolf-head': 'Loup', 'eagle-head': 'Aigle',
  'snake': 'Serpent', 'unicorn': 'Licorne', 'orc-head': 'Orc', 'ghost': 'Fantôme', 'death-skull': 'Crâne',
  'moon': 'Lune', 'sun': 'Soleil', 'star-swirl': 'Étoile', 'fire': 'Feu', 'water-drop': 'Goutte d’eau',
  'oak-leaf': 'Feuille', 'cog': 'Engrenage', 'rocket': 'Fusée', 'ufo': 'Soucoupe volante', 'robot-golem': 'Robot',
  'microscope': 'Microscope', 'dna1': 'ADN', 'ringed-planet': 'Planète', 'light-bulb': 'Ampoule', 'scales': 'Balance',
  'drama-masks': 'Masques de théâtre',
};

// Dessin d'une icône ; un nom inconnu (ancienne sauvegarde, donnée abîmée) donne le parchemin.
export const iconeSvg = nom => `<svg class="icone" aria-hidden="true"><use href="icones/types.svg#${
  Object.hasOwn(ICONES, nom) ? nom : 'scroll-unfurled'}"></use></svg>`;

export const nouvelleCase = (donnees = {}) => ({ nom: 'Nouvelle case', sorte: 'texte', ...donnees, id: donnees.id ?? nouvelId() });

export const nouveauType = (universId, donnees = {}) => ({
  id: nouvelId(), universId, nom: 'Nouveau type', icone: 'scroll-unfurled', couleur: '#5c5c5c', ordre: Date.now(), cases: [],
  ...donnees,
});

// Types proposés au départ dans chaque univers ; « cible » désigne un autre type de base par son nom.
const BASE = [
  ['Personnage', 'person', '#2e5f8b', [
    ['Âge', 'nombre'], ['Espèce', 'texte'], ['Rôle', 'liste', ['Protagoniste', 'Antagoniste', 'Secondaire', 'Figurant']],
    ['Statut', 'liste', ['Vivant', 'Mort', 'Disparu', 'Inconnu']], ['Lieu de naissance', 'fiche', 'Lieu'],
    ['Groupe', 'fiche', 'Groupe/Faction']]],
  ['Lieu', 'castle', '#4f7a28', [
    ['Sorte de lieu', 'liste', ['Royaume', 'Région', 'Ville', 'Village', 'Bâtiment', 'Forêt', 'Montagne', 'Autre']],
    ['Population', 'nombre'], ['Climat', 'texte'], ['Dirigé par', 'fiche', 'Personnage']]],
  ['Objet', 'key', '#a0701a', [
    ['Sorte d’objet', 'texte'], ['Propriétaire', 'fiche', 'Personnage'], ['Origine', 'fiche', 'Lieu'], ['Pouvoirs', 'texte']]],
  ['Groupe/Faction', 'checked-shield', '#7a3b8b', [
    ['Sorte de groupe', 'liste', ['Royaume', 'Guilde', 'Ordre', 'Clan', 'Religion', 'Autre']],
    ['Chef', 'fiche', 'Personnage'], ['Siège', 'fiche', 'Lieu'], ['Devise', 'texte']]],
  ['Créature', 'dragon-head', '#a8322b', [
    ['Habitat', 'fiche', 'Lieu'], ['Taille', 'texte'], ['Danger', 'liste', ['Inoffensive', 'Méfiante', 'Dangereuse', 'Mortelle']]]],
  ['Notion', 'light-bulb', '#2f7f7a', [
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
  (await stockage.query('typesFiches', 'universId', universId)).filter(t => !t.corbeille).sort((a, b) => a.ordre - b.ordre);

// Copie un type et ses cases (sans les fiches) dans l'univers `cible` : « Nom (copie) » si le nom y est déjà pris.
// Une case « lien vers une fiche » vise le type du même nom dans `cible` (tous les types s'il n'y en a pas).
export async function copierType(stockage, type, cible) {
  await assurerTypes(stockage, cible); // sinon les types de base arriveraient plus tard, en double
  const existants = await typesUnivers(stockage, cible.id);
  const nomDe = new Map((await typesUnivers(stockage, type.universId)).map(t => [t.id, t.nom]));
  const idDe = new Map(existants.map(t => [t.nom, t.id]));
  const copie = nouveauType(cible.id, { nom: idDe.has(type.nom) ? `${type.nom} (copie)` : type.nom,
    icone: type.icone, couleur: type.couleur });
  copie.cases = type.cases.map(c => nouvelleCase({ ...structuredClone(c), id: undefined,
    ...(c.typeCibleId && { typeCibleId: c.typeCibleId === type.id ? copie.id : idDe.get(nomDe.get(c.typeCibleId)) ?? null }) }));
  await stockage.put('typesFiches', copie);
  return copie;
}

// Met un type à la corbeille. destinations : Map ficheId → id du type d'arrivée, ou null pour la corbeille.
// nouveaux : types créés pendant la suppression, enregistrés dans la même opération (tout ou rien).
// Renvoie de quoi tout remettre comme avant (pour le bouton « Annuler ») : à passer à stockage.lot.
export async function supprimerType(stockage, type, destinations = new Map(), nouveaux = []) {
  const autres = [...(await typesUnivers(stockage, type.universId)).filter(t => t.id !== type.id), ...nouveaux];
  const parId = new Map(autres.map(t => [t.id, t]));
  const ops = [['put', 'typesFiches', { ...type, corbeille: Date.now() }], ...nouveaux.map(t => ['put', 'typesFiches', t])];
  const avant = [['put', 'typesFiches', structuredClone(type)], ...nouveaux.map(t => ['delete', 'typesFiches', t.id])];

  // Les cases « lien vers une fiche » qui visaient ce type acceptent désormais tous les types.
  for (const t of autres) {
    if (!t.cases.some(c => c.typeCibleId === type.id)) continue;
    if (!nouveaux.includes(t)) avant.push(['put', 'typesFiches', structuredClone(t)]);
    t.cases = t.cases.map(c => c.typeCibleId === type.id ? { ...c, typeCibleId: null } : c);
    if (!nouveaux.includes(t)) ops.push(['put', 'typesFiches', t]);
  }

  for (const f of await stockage.query('fiches', 'typeId', type.id)) {
    if (f.corbeille) continue; // déjà à la corbeille : gardée telle quelle
    avant.push(['put', 'fiches', f]);
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
  return avant;
}
