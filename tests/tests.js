import { creerStockage } from '../js/stockage/adaptateur.js';
import { MIGRATIONS } from '../js/stockage/migrations.js';
import { attendre } from '../js/stockage/indexeddb.js';
import { dupliquerUnivers, supprimerUnivers } from '../js/modele/univers.js';
import { nettoyer } from '../js/ui/texte-riche.js';
import { parentesPossibles } from '../js/modele/fiches.js';
import { creerExempleSiBesoin } from '../js/modele/exemple.js';
import { assurerTypes, typesUnivers, supprimerType, nouveauType, ICONES } from '../js/modele/types.js';

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

test('migration 2 : icônes émojis remplacées par les dessins', async () => {
  let s = await creerStockage(NOM, [MIGRATIONS[0]]);
  await s.lot([['put', 'typesFiches', { id: 't1', universId: 'u1', icone: '🐉' }],
    ['put', 'typesFiches', { id: 't2', universId: 'u1', icone: 'castle' }]]);
  s.fermer();
  s = await creerStockage(NOM);
  egal((await s.tous('typesFiches')).map(t => t.icone), ['dragon-head', 'castle']);
  s.fermer();
  const svg = await (await fetch('../icones/types.svg')).text();
  egal(Object.keys(ICONES).filter(n => !svg.includes(`id="${n}"`)), [], 'dessins manquants :');
});

test('dupliquer puis supprimer un univers avec tout son contenu', async () => {
  const s = await creerStockage(NOM);
  await s.lot([
    ['put', 'univers', { id: 'u1', nom: 'Elsméria', couvertureId: 'i1' }],
    ['put', 'typesFiches', { id: 't1', universId: 'u1', nom: 'Lieu' }],
    ['put', 'fiches', { id: 'f1', universId: 'u1', typeId: 't1', nom: 'Port-Brume' }],
    ['put', 'images', { id: 'i1', universId: 'u1', fichier: new Blob(['img']) }],
    ['put', 'fiches', { id: 'autre', universId: 'u2', typeId: 'tx', nom: 'Ailleurs' }],
  ]);
  const c = await dupliquerUnivers(s, 'u1');
  egal(c.nom, 'Elsméria (copie)');
  const [type] = await s.query('typesFiches', 'universId', c.id);
  const [fiche] = await s.query('fiches', 'universId', c.id);
  const [img] = await s.query('images', 'universId', c.id);
  egal([fiche.nom, fiche.typeId === type.id, c.couvertureId === img.id, type.id !== 't1'], ['Port-Brume', true, true, true]);
  egal(await img.fichier.text(), 'img');

  await supprimerUnivers(s, 'u1');
  egal(await s.get('univers', 'u1'), undefined);
  egal((await s.query('fiches', 'universId', 'u1')).length, 0);
  egal(await s.get('images', 'i1'), undefined);
  egal((await s.tous('fiches')).length, 2, 'copie et autre univers intacts :');
  s.fermer();
});

test('types de base créés une seule fois, liens entre types résolus', async () => {
  const s = await creerStockage(NOM);
  const u = { id: 'u1', nom: 'A' };
  await s.put('univers', u);
  await assurerTypes(s, u);
  let types = await typesUnivers(s, 'u1');
  egal(types.map(t => t.nom), ['Personnage', 'Lieu', 'Objet', 'Groupe/Faction', 'Créature', 'Notion']);
  const naissance = types[0].cases.find(c => c.nom === 'Lieu de naissance');
  egal(naissance.typeCibleId, types[1].id);
  await s.delete('typesFiches', types[5].id); // l'utilisateur supprime « Notion » : il ne revient pas
  await assurerTypes(s, await s.get('univers', 'u1'));
  egal((await typesUnivers(s, 'u1')).length, 5);
  s.fermer();
});

test('supprimer un type : fiches déplacées (valeurs gardées par nom de case) ou mises à la corbeille', async () => {
  const s = await creerStockage(NOM);
  const lieu = nouveauType('u1', { nom: 'Lieu', cases: [{ id: 'c1', nom: 'Climat', sorte: 'texte' }] });
  const endroit = nouveauType('u1', { nom: 'Endroit', cases: [{ id: 'c2', nom: 'climat', sorte: 'texte' }] });
  const perso = nouveauType('u1', { nom: 'Personnage', cases: [{ id: 'c3', nom: 'Né à', sorte: 'fiche', typeCibleId: lieu.id }] });
  const nouveau = nouveauType('u1', { nom: 'Région', cases: [] });
  await s.lot([lieu, endroit, perso].map(t => ['put', 'typesFiches', t]).concat([
    ['put', 'fiches', { id: 'f1', universId: 'u1', typeId: lieu.id, nom: 'Port-Brume', valeurs: { c1: 'Humide' } }],
    ['put', 'fiches', { id: 'f2', universId: 'u1', typeId: lieu.id, nom: 'Ruines' }],
    ['put', 'fiches', { id: 'f3', universId: 'u1', typeId: lieu.id, nom: 'Plaine' }],
  ]));
  await supprimerType(s, lieu, new Map([['f1', endroit.id], ['f2', null], ['f3', nouveau.id]]), [nouveau]);
  const [f1, f2, f3] = await Promise.all(['f1', 'f2', 'f3'].map(id => s.get('fiches', id)));
  egal([f1.typeId === endroit.id, f1.valeurs], [true, { c2: 'Humide' }]);
  egal([f2.typeId, typeof f2.corbeille], [lieu.id, 'number']);
  egal(f3.typeId, nouveau.id);
  egal(await s.get('typesFiches', lieu.id), undefined);
  egal((await s.get('typesFiches', perso.id)).cases[0].typeCibleId, null);
  egal((await s.get('typesFiches', nouveau.id)).nom, 'Région');
  s.fermer();
});

test('texte mis en forme : balises dangereuses et attributs retirés', () => {
  egal(nettoyer('<h2 style="x">Titre</h2><p onclick="y">a <b>b</b> <a href="javascript:z">lien</a></p>'),
    '<h2>Titre</h2><p>a <b>b</b> lien</p>');
  egal(nettoyer('<img src=x onerror="alert(1)"><script>alert(2)</script><p>ok</p><!-- c -->'), '<p>ok</p>');
  egal(nettoyer('<blockquote>c</blockquote><hr><u>s</u>'), '<blockquote>c</blockquote><hr><u>s</u>');
});

test('fiche parente : ni elle-même ni ses descendantes', () => {
  const f = [{ id: 'a' }, { id: 'b', parentId: 'a' }, { id: 'c', parentId: 'b' }, { id: 'd' }];
  egal(parentesPossibles(f[0], f).map(x => x.id), ['d']);
  egal(parentesPossibles(f[2], f).map(x => x.id), ['a', 'b', 'd']);
});

test('fiches d’exemple créées une fois, liens entre fiches résolus', async () => {
  const s = await creerStockage(NOM);
  await creerExempleSiBesoin(s);
  await creerExempleSiBesoin(s);
  const [u] = await s.tous('univers');
  const fiches = await s.query('fiches', 'universId', u.id);
  egal(fiches.length, 16);
  const ids = new Set(fiches.map(f => f.id));
  const types = await typesUnivers(s, u.id);
  const casesFiche = types.flatMap(t => t.cases.filter(c => c.sorte === 'fiche').map(c => c.id));
  const liens = fiches.flatMap(f => casesFiche.filter(c => f.valeurs[c]).map(c => f.valeurs[c]));
  egal(liens.length > 15 && liens.every(l => ids.has(l)), true, 'liens valides :');
  egal(ids.has(fiches.find(f => f.nom === 'La Lanterne Noire').parentId), true, 'parente :');
  s.fermer();
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
