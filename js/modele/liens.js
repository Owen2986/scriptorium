import { fichesCase } from './types.js';
import { plier, texteBrut, extrait } from './recherche.js';

// Liens [[Nom de fiche]] : un nom est reconnu sans tenir compte des majuscules, des accents ni des espaces en trop.
export const cle = nom => (nom ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[’‘]/g, "'")
  .replace(/\s+/g, ' ').trim().toLowerCase();

export const LIEN = /\[\[([^[\]]+)\]\]/g;

// Nom ou autre nom → fiche. Un nom principal l'emporte sur un surnom identique ; à égalité, la première fiche.
export function indexNoms(fiches) {
  const index = new Map();
  const ajouter = (nom, f) => { const k = cle(nom); if (k && !index.has(k)) index.set(k, f); };
  fiches.forEach(f => ajouter(f.nom, f));
  fiches.forEach(f => (f.autresNoms ?? []).forEach(n => ajouter(n, f)));
  return index;
}

export const echapper = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Remplace chaque [[ancien]] par [[nouveau]] dans un texte mis en forme (HTML).
export const renommerDans = (html, ancien, nouveau) =>
  (html ?? '').replace(LIEN, (tout, nom) => cle(nom) === cle(ancien) ? `[[${echapper(nouveau)}]]` : tout);

// Met à jour les liens de toutes les `fiches` (texte et secrets) ; renvoie les fiches modifiées.
export async function renommerLiens(stockage, fiches, ancien, nouveau) {
  const modifiees = fiches.filter(f => {
    const texte = renommerDans(f.texte, ancien, nouveau);
    const secrets = renommerDans(f.secrets, ancien, nouveau);
    if (texte === (f.texte ?? '') && secrets === (f.secrets ?? '')) return false;
    Object.assign(f, { texte, secrets });
    return true;
  });
  if (modifiees.length) await stockage.lot(modifiees.map(f => ['put', 'fiches', f]));
  return modifiees;
}

// Suggestions en tapant [[ : noms et autres noms contenant `q` (sans majuscules ni accents), ceux qui commencent par `q` d'abord.
// → [{ nom, fiche, place: [début, fin] du morceau trouvé dans `nom` }], au plus `max`.
export function suggestions(fiches, q, max = 8) {
  const m = plier(q.trim());
  const trouves = [];
  for (const fiche of fiches) {
    for (const nom of [fiche.nom, ...(fiche.autresNoms ?? [])]) {
      const i = nom ? plier(nom).indexOf(m) : -1;
      if (i >= 0) trouves.push({ nom, fiche, place: [i, i + m.length] });
    }
  }
  return trouves.sort((a, b) => (a.place[0] > 0) - (b.place[0] > 0) || a.nom.localeCompare(b.nom, 'fr')).slice(0, max);
}

// Fiches qui citent `cible` : liens [[ ]] (texte, secrets) et cases « lien vers une fiche ».
// → [{ fiche, extrait (autour du premier lien du texte, sinon null), mot (nom écrit dans ce lien), ailleurs: ['les secrets', 'la case X'] }], par nom.
export function citeeDans(cible, fiches, types) {
  const index = indexNoms(fiches);
  const vise = html => [...(html ?? '').matchAll(LIEN)].map(m => m[1].trim()).filter(n => index.get(cle(n)) === cible);
  const resultats = [];
  for (const f of fiches) {
    if (f === cible) continue;
    const [mot] = vise(f.texte);
    const ailleurs = [
      vise(f.secrets).length && 'les secrets',
      ...(types.find(t => t.id === f.typeId)?.cases ?? []).filter(c => fichesCase(c, f.valeurs?.[c.id]).includes(cible.id)).map(c => `la case ${c.nom}`),
    ].filter(Boolean);
    if (mot || ailleurs.length) resultats.push({ fiche: f, mot, extrait: mot ? extrait(texteBrut(f.texte.replace(/<(h[23])\b[^>]*>.*?<\/\1>/gs, ' ')), mot, 40, 100) : null, ailleurs });
  }
  return resultats.sort((a, b) => (a.fiche.nom || '').localeCompare(b.fiche.nom || '', 'fr'));
}
