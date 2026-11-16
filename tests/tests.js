import { creerStockage } from '../js/stockage/adaptateur.js';
import { MIGRATIONS } from '../js/stockage/migrations.js';
import { attendre } from '../js/stockage/indexeddb.js';

const NOM = 'scriptorium-test';
const tests = [];
const test = (nom, fn) => tests.push([nom, fn]);
const effacer = nom => attendre(indexedDB.deleteDatabase(nom));
const egal = (obtenu, attendu, contexte = '') => {
  const [a, b] = [JSON.stringify(obtenu), JSON.stringify(attendu)];
  if (a !== b) throw new Error(`${contexte} attendu ${b}, obtenu ${a}`);
};

test('crée tous les stores du schéma', async () => {
  const s = await creerStockage(NOM);
  const { schema, stores } = await s.exporter();
  s.fermer();
  egal(schema, MIGRATIONS.length);
  egal(Object.keys(stores).sort(), ['calendriers', 'cartes', 'epingles', 'evenements', 'fiches', 'images', 'meta',
    'noeudsManuscrit', 'relations', 'statsJour', 'textes', 'tomes', 'typesFiches', 'univers']);
});

test('put, get, query par index, delete', async () => {
  const s = await creerStockage(NOM);
  await s.put('fiches', { id: 'f1', universId: 'u1', typeId: 't1', nom: 'Aria' });
  await s.put('fiches', { id: 'f2', universId: 'u2', typeId: 't1', nom: 'Bran' });
  egal((await s.get('fiches', 'f1')).nom, 'Aria');
  egal((await s.query('fiches', 'universId', 'u1')).map(f => f.id), ['f1']);
  egal((await s.query('fiches', 'typeId', 't1')).length, 2);
  await s.delete('fiches', 'f1');
  egal(await s.get('fiches', 'f1'), undefined);
  s.fermer();
});

test('export puis import restaure tout, images comprises', async () => {
  const s = await creerStockage(NOM);
  await s.put('univers', { id: 'u1', nom: "Terres d'Ombre" });
  await s.put('images', { id: 'i1', universId: 'u1', fichier: new Blob(['abc'], { type: 'text/plain' }) });
  const copie = await s.exporter();
  await s.delete('univers', 'u1');
  await s.put('univers', { id: 'u2', nom: 'Intrus' });
  await s.importer(copie);
  egal((await s.tous('univers')).map(u => u.nom), ["Terres d'Ombre"]);
  egal(await (await s.get('images', 'i1')).fichier.text(), 'abc');
  s.fermer();
});

test('import refuse un fichier invalide sans rien effacer', async () => {
  const s = await creerStockage(NOM);
  await s.put('univers', { id: 'u1', nom: 'A' });
  const mauvais = [
    null,
    { schema: 999, stores: {} },
    { schema: 1, stores: { inconnu: [] } },
    { schema: 1, stores: { univers: 'x' } },
    { schema: 1, stores: { univers: [{ sansId: 1 }] } },
  ];
  for (const m of mauvais) {
    let refuse = false;
    try { await s.importer(m); } catch { refuse = true; }
    egal(refuse, true, JSON.stringify(m));
  }
  egal((await s.tous('univers')).map(u => u.nom), ['A']);
  s.fermer();
});

test('copie de secours avant une migration', async () => {
  const v1 = [MIGRATIONS[0]];
  let s = await creerStockage(NOM, v1);
  await s.put('univers', { id: 'u1', nom: 'Avant' });
  s.fermer();
  s = await creerStockage(NOM, [...v1, db => db.createObjectStore('nouveau', { keyPath: 'id' })]);
  egal((await s.get('univers', 'u1')).nom, 'Avant', 'données conservées :');
  s.fermer();
  const sec = await attendre(indexedDB.open(NOM + '-secours'));
  const copies = await attendre(sec.transaction('copies').objectStore('copies').getAll());
  sec.close();
  egal(copies.length, 1);
  egal(copies[0].schema, 1);
  egal(copies[0].stores.univers[0].nom, 'Avant');
});

let echecs = 0;
for (const [nom, fn] of tests) {
  const li = document.createElement('li');
  try {
    await effacer(NOM);
    await effacer(NOM + '-secours');
    await fn();
    li.className = 'ok';
    li.textContent = `✔ ${nom}`;
  } catch (e) {
    echecs++;
    li.className = 'ko';
    li.textContent = `✘ ${nom} — ${e.message}`;
  }
  document.getElementById('resultats').append(li);
}
await effacer(NOM);
await effacer(NOM + '-secours');
document.getElementById('resume').textContent =
  echecs ? `${echecs} échec(s) sur ${tests.length}` : `${tests.length} tests réussis`;
document.body.dataset.fini = echecs ? 'ko' : 'ok';
