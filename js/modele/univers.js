export const nouvelId = () => crypto.randomUUID();

// Stores dont chaque ligne porte un universId.
// shortcut: epingles (rattachées à une carte) ne sont pas encore suivies ; à ajouter à l'étape 5.
const STORES = ['typesFiches', 'fiches', 'relations', 'calendriers', 'evenements', 'cartes', 'images', 'tomes', 'versions'];

export const nouvelUnivers = (donnees = {}) => ({
  id: nouvelId(), nom: 'Nouvel univers', description: '', couleur: '#8b2e1f', couvertureId: null,
  creeLe: Date.now(), ...donnees,
});

async function contenu(stockage, id) {
  const lignes = (await Promise.all(STORES.map(async s => (await stockage.query(s, 'universId', id)).map(o => [s, o])))).flat();
  // Parties, chapitres et scènes des tomes, avec leurs textes (rattachés au tome, pas à l'univers).
  for (const [, tome] of lignes.filter(([s]) => s === 'tomes'))
    for (const n of await stockage.query('noeudsManuscrit', 'tomeId', tome.id)) {
      lignes.push(['noeudsManuscrit', n]);
      const t = await stockage.get('textes', n.id);
      if (t) lignes.push(['textes', t]);
    }
  return lignes;
}
const cleDe = (s, o) => s === 'textes' ? o.noeudId : o.id;

export async function supprimerUnivers(stockage, id) {
  const lignes = await contenu(stockage, id);
  await stockage.lot([['delete', 'univers', id], ...lignes.map(([s, o]) => ['delete', s, cleDe(s, o)])]);
}

// Copie l'univers et tout son contenu avec de nouveaux identifiants ; les références internes suivent.
export async function dupliquerUnivers(stockage, id) {
  const u = await stockage.get('univers', id);
  const lignes = await contenu(stockage, id);
  const ids = new Map([[id, nouvelId()], ...lignes.map(([s, o]) => [cleDe(s, o), nouvelId()])]);
  const remap = v => typeof v === 'string' ? (ids.get(v) ?? v)
    : Array.isArray(v) ? v.map(remap)
    : v?.constructor === Object ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remap(x)]))
    : v; // les Blob (images) sont gardés tels quels
  const copie = { ...remap(u), nom: `${u.nom} (copie)`, creeLe: Date.now() };
  await stockage.lot([['put', 'univers', copie], ...lignes.map(([s, o]) => ['put', s, remap(o)])]);
  return copie;
}
