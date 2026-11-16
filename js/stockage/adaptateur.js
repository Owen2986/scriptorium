import { ouvrir, lireTout, attendre, fin } from './indexeddb.js';

// Seul point d'accès aux données pour le reste de l'application.
export async function creerStockage(nom = 'scriptorium', migrations) {
  const db = await ouvrir(nom, migrations);
  const lire = s => db.transaction(s).objectStore(s);
  const ecrire = async (s, action) => {
    const tx = db.transaction(s, 'readwrite');
    action(tx.objectStore(s));
    await fin(tx); // résout seulement une fois l'écriture enregistrée
  };

  return {
    get: (s, id) => attendre(lire(s).get(id)),
    tous: s => attendre(lire(s).getAll()),
    query: (s, index, valeur) => attendre(lire(s).index(index).getAll(valeur)),
    put: (s, obj) => ecrire(s, st => st.put(obj)),
    delete: (s, id) => ecrire(s, st => st.delete(id)),
    exporter: () => lireTout(db),
    importer: donnees => importer(db, donnees),
    fermer: () => db.close(),
  };
}

// Remplace toute la base. Tout ou rien : en cas de problème, rien n'est effacé.
// shortcut: n'accepte que le même schéma ou plus ancien sans convertir les données ; à revoir à la 2e migration.
async function importer(db, donnees) {
  const noms = [...db.objectStoreNames];
  if (!donnees || typeof donnees.stores !== 'object' || !(donnees.schema <= db.version))
    throw new Error('Fichier de sauvegarde invalide.');
  for (const [n, lignes] of Object.entries(donnees.stores))
    if (!noms.includes(n) || !Array.isArray(lignes)) throw new Error(`Fichier de sauvegarde invalide (${n}).`);

  const tx = db.transaction(noms, 'readwrite');
  const termine = fin(tx);
  try {
    for (const n of noms) {
      const s = tx.objectStore(n);
      s.clear();
      (donnees.stores[n] || []).forEach(o => s.put(o));
    }
  } catch (e) {
    tx.abort();
    termine.catch(() => {});
    throw new Error(`Fichier de sauvegarde invalide : ${e.message}`);
  }
  await termine;
}
