// Historique d'une fiche : un état gardé chaque fois qu'on quitte la fiche après l'avoir modifiée.
// Les images ne sont pas suivies (revenir à une version garde les images actuelles).
import { nouvelId } from './univers.js';

const CHAMPS = { nom: 'nom', autresNoms: 'autres noms', texte: 'texte', secrets: 'secrets', valeurs: 'cases',
  etiquettes: 'étiquettes', parentId: 'fiche parente' };

export const etatFiche = f => structuredClone(Object.fromEntries(Object.keys(CHAMPS).map(k => [k, f[k] ?? null])));

export const memeEtat = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Ce qui diffère entre deux états, en mots : « texte, cases ».
export const differences = (a, b) => Object.entries(CHAMPS).filter(([k]) => !memeEtat(a[k], b[k])).map(([, mot]) => mot).join(', ');

// Versions d'une fiche, la plus récente d'abord.
export const versionsFiche = async (stockage, ficheId) =>
  (await stockage.query('versions', 'ficheId', ficheId)).sort((a, b) => b.date - a.date);

// Garde `etat` (daté de `date`) et efface les plus anciennes au-delà de `max`.
export async function garderVersion(stockage, fiche, etat, date, max) {
  const anciennes = (await versionsFiche(stockage, fiche.id)).slice(Math.max(0, max - 1));
  await stockage.lot([
    ['put', 'versions', { id: nouvelId(), ficheId: fiche.id, universId: fiche.universId, date, etat }],
    ...anciennes.map(v => ['delete', 'versions', v.id]),
  ]);
}
