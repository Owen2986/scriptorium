import { MIGRATIONS } from './migrations.js';

export const attendre = r => new Promise((ok, ko) => {
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});

export const fin = tx => new Promise((ok, ko) => {
  tx.oncomplete = () => ok();
  tx.onerror = tx.onabort = () => ko(tx.error || new Error('Transaction annulée.'));
});

export async function ouvrir(nom, migrations = MIGRATIONS) {
  const cible = migrations.length;
  const existante = (await indexedDB.databases()).find(d => d.name === nom);
  if (existante && existante.version < cible) await copieDeSecours(nom);

  const r = indexedDB.open(nom, cible);
  r.onupgradeneeded = e => {
    for (let v = e.oldVersion; v < cible; v++) migrations[v](r.result, r.transaction);
  };
  r.onblocked = () => console.warn('Scriptorium est ouvert dans un autre onglet : fermez-le pour terminer la mise à jour.');
  const db = await attendre(r);
  db.onversionchange = () => db.close(); // laisse un autre onglet faire sa migration
  return db;
}

export async function lireTout(db) {
  const noms = [...db.objectStoreNames];
  const tx = db.transaction(noms);
  const stores = {};
  await Promise.all(noms.map(async n => { stores[n] = await attendre(tx.objectStore(n).getAll()); }));
  return { schema: db.version, stores };
}

// Avant une migration, copie toute la base dans « <nom>-secours » (3 dernières copies gardées).
async function copieDeSecours(nom) {
  const db = await attendre(indexedDB.open(nom));
  const donnees = await lireTout(db);
  db.close();

  const r = indexedDB.open(nom + '-secours', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('copies', { autoIncrement: true });
  const secours = await attendre(r);
  const tx = secours.transaction('copies', 'readwrite');
  const copies = tx.objectStore('copies');
  copies.add({ date: new Date().toISOString(), ...donnees });
  const cles = await attendre(copies.getAllKeys());
  cles.slice(0, -3).forEach(c => copies.delete(c));
  await fin(tx);
  secours.close();
}
