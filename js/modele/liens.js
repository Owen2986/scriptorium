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

const echapper = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
