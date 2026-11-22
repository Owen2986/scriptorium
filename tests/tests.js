import { creerStockage } from '../js/stockage/adaptateur.js';
import { MIGRATIONS } from '../js/stockage/migrations.js';
import { attendre } from '../js/stockage/indexeddb.js';
import { dupliquerUnivers, supprimerUnivers } from '../js/modele/univers.js';
import { nettoyer, depuisTexteBrut } from '../js/ui/texte-riche.js';
import { cle, indexNoms, renommerLiens, suggestions, citeeDans } from '../js/modele/liens.js';
import { decorerLiens } from '../js/ui/liens.js';
import { parentesPossibles, dupliquerFiche, TRIS } from '../js/modele/fiches.js';
import { contenuCorbeille, mettreALaCorbeille, restaurer, supprimerDefinitivement, viderCorbeille } from '../js/modele/corbeille.js';
import { etatFiche, differences, versionsFiche, garderVersion } from '../js/modele/versions.js';
import { creerExempleSiBesoin } from '../js/modele/exemple.js';
import { chercher, texteBrut, extrait } from '../js/modele/recherche.js';
import { nouveauNoeud, lignesPlan, titreNoeud, motsPlan, ciblesPossibles, echanger } from '../js/modele/plan.js';
import { nouveauTome, tomesUnivers, motsTome, dupliquerTome, TRIS_TOMES } from '../js/modele/tomes.js';
import { statistiques, compterMots } from '../js/modele/statistiques.js';
import { versMarkdown, universMarkdown, proprietes } from '../js/modele/export.js';
import { assurerTypes, typesUnivers, supprimerType, nouveauType, copierType, ICONES } from '../js/modele/types.js';

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
    'noeudsManuscrit', 'relations', 'statsJour', 'textes', 'tomes', 'typesFiches', 'univers', 'versions']);
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
  const avant = await supprimerType(s, lieu, new Map([['f1', endroit.id], ['f2', null], ['f3', nouveau.id]]), [nouveau]);
  const [f1, f2, f3] = await Promise.all(['f1', 'f2', 'f3'].map(id => s.get('fiches', id)));
  egal([f1.typeId === endroit.id, f1.valeurs], [true, { c2: 'Humide' }]);
  egal([f2.typeId, typeof f2.corbeille], [lieu.id, 'number']);
  egal(f3.typeId, nouveau.id);
  egal(typeof (await s.get('typesFiches', lieu.id)).corbeille, 'number', 'type à la corbeille :');
  egal((await typesUnivers(s, 'u1')).some(t => t.id === lieu.id), false);
  egal((await s.get('typesFiches', perso.id)).cases[0].typeCibleId, null);
  egal((await s.get('typesFiches', nouveau.id)).nom, 'Région');
  // « Annuler » remet tout comme avant.
  await s.lot(avant);
  const apres = await Promise.all(['f1', 'f2', 'f3'].map(id => s.get('fiches', id)));
  egal(apres.map(f => [f.typeId === lieu.id, f.corbeille]), [[true, undefined], [true, undefined], [true, undefined]]);
  egal([(await s.get('typesFiches', lieu.id)).corbeille, await s.get('typesFiches', nouveau.id)], [undefined, undefined]);
  egal((await s.get('typesFiches', perso.id)).cases[0].typeCibleId, lieu.id);
  s.fermer();
});

test('texte mis en forme : balises dangereuses et attributs retirés', () => {
  egal(nettoyer('<h2 style="x">Titre</h2><p onclick="y">a <b>b</b> <a href="javascript:z">lien</a></p>'),
    '<h2>Titre</h2><p>a <b>b</b> lien</p>');
  egal(nettoyer('<img src=x onerror="alert(1)"><script>alert(2)</script><p>ok</p><!-- c -->'), '<p>ok</p>');
  egal(nettoyer('<blockquote>c</blockquote><hr><u>s</u>'), '<blockquote>c</blockquote><hr><u>s</u>');
});

test('tri des fiches : nom dans les deux sens, modifiées puis créées récemment', () => {
  const f = [{ nom: 'Éa', creeLe: 3 }, { nom: 'bob', creeLe: 1, modifieLe: 9 }, { nom: 'Zed', creeLe: 2, modifieLe: 5 }];
  const ordre = tri => [...f].sort(TRIS[tri][1]).map(x => x.nom);
  egal(ordre('nom'), ['bob', 'Éa', 'Zed']);
  egal(ordre('nom-inverse'), ['Zed', 'Éa', 'bob']);
  egal(ordre('modifiees'), ['bob', 'Zed', 'Éa']);
  egal(ordre('creees'), ['Éa', 'Zed', 'bob']);
});

test('copier un type : même univers ou autre, « (copie) » si le nom est pris, cases « fiche » suivies par nom', async () => {
  const s = await creerStockage(NOM, MIGRATIONS);
  const a = { id: 'a', nom: 'A' }, b = { id: 'b', nom: 'B', typesCrees: true };
  await s.put('univers', a); await s.put('univers', b);
  await assurerTypes(s, a);
  const lieuB = nouveauType('b', { nom: 'Lieu' });
  await s.put('typesFiches', lieuB);
  const perso = (await typesUnivers(s, 'a')).find(t => t.nom === 'Personnage');
  const double = await copierType(s, perso, a);
  egal(double.nom, 'Personnage (copie)');
  egal(double.cases.find(c => c.nom === 'Lieu de naissance').typeCibleId, perso.cases.find(c => c.nom === 'Lieu de naissance').typeCibleId);
  const ailleurs = await copierType(s, perso, b);
  egal(ailleurs.nom, 'Personnage');
  egal(ailleurs.universId, 'b');
  egal(ailleurs.cases.map(c => c.typeCibleId ?? null).filter(x => x !== undefined && x !== null), [lieuB.id]);
  egal(ailleurs.cases.map(c => c.nom), perso.cases.map(c => c.nom));
  if (ailleurs.cases.some((c, i) => c.id === perso.cases[i].id)) throw new Error('les cases doivent avoir de nouveaux identifiants');
  egal((await copierType(s, perso, b)).nom, 'Personnage (copie)');
  s.fermer();
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

test('liens [[ ]] : noms et surnoms reconnus sans majuscules ni accents', () => {
  const f = [{ id: 'a', nom: 'Maëlle Corbin', autresNoms: ['La Gouverneure'] }, { id: 'b', nom: 'La gouverneure' }];
  const index = indexNoms(f);
  egal(index.get(cle('  maelle   CORBIN ')).id, 'a');
  egal(index.get(cle('la gouverneure')).id, 'b', 'un nom passe avant un surnom :');
  egal(cle('L’Ordre'), cle("l'ordre"));
});

test('suggestions en tapant [[ : noms et autres noms, début du nom d’abord', () => {
  const f = [{ id: 'a', nom: 'Ysolde de Brume' }, { id: 'b', nom: 'Port-Brume' }, { id: 'c', nom: 'Aldric', autresNoms: ['Le Borgne'] }, { id: 'd', nom: 'Brume-Haute' }];
  egal(suggestions(f, 'bru').map(s => s.nom), ['Brume-Haute', 'Port-Brume', 'Ysolde de Brume']);
  egal(suggestions(f, 'BOR').map(s => [s.nom, s.fiche.id, s.place]), [['Le Borgne', 'c', [3, 6]]]);
  egal(suggestions(f, 'YSOLDÉ').map(s => s.fiche.id), ['a'], 'accents ignorés :');
  egal(suggestions(f, '', 2).length, 2, 'au plus N :');
});

test('« Citée dans » : liens du texte, des secrets et cases « fiche », surnoms compris', () => {
  const types = [{ id: 'p', cases: [{ id: 'n', nom: 'Lieu de naissance', sorte: 'fiche' }] }];
  const port = { id: 'port', nom: 'Port-Brume', autresNoms: ['La Ville grise'] };
  const f = [port,
    { id: 'a', nom: 'Aldric', typeId: 'p', texte: '<h2>Histoire</h2><p>Fils d’un pêcheur de [[port-brume]].</p>', valeurs: { n: 'port' } },
    { id: 'b', nom: 'Bran', typeId: 'p', secrets: '<p>Né à [[La Ville grise]].</p>' },
    { id: 'c', nom: 'Cael', typeId: 'p', texte: '<p>[[Autre]] et Port-Brume sans lien.</p>' },
    { id: 'd', nom: 'Ville', texte: '<p>Voir [[Port-Brume]] ici.</p>' }];
  f.push({ ...port, id: 'x', texte: '<p>[[Port-Brume]]</p>' }); // homonyme : le lien vise la première fiche
  const r = citeeDans(port, f, types);
  egal(r.map(c => [c.fiche.id, c.mot, c.extrait, c.ailleurs]), [
    ['a', 'port-brume', 'Fils d’un pêcheur de port-brume.', ['la case Lieu de naissance']],
    ['b', undefined, null, ['les secrets']],
    ['x', 'Port-Brume', 'Port-Brume', []],
    ['d', 'Port-Brume', 'Voir Port-Brume ici.', []]]);
});

test('liens [[ ]] : affichés puis enregistrés tels quels', () => {
  const div = document.createElement('div');
  div.innerHTML = nettoyer('<p>Né à [[Port-Brume]], loin de [[Nulle part]].</p><p>[[Port-Brume]]</p>');
  decorerLiens(div, nom => cle(nom) === cle('port-brume'));
  egal([...div.querySelectorAll('.lien')].map(l => [l.dataset.nom, l.classList.contains('absent')]),
    [['Port-Brume', false], ['Nulle part', true], ['Port-Brume', false]]);
  const seul = div.lastChild.childNodes; // lien seul sur sa ligne : texte invisible de chaque côté pour y mettre le curseur
  egal([seul.length, seul[0].data, seul[2].data], [3, '\u200B', '\u200B']);
  egal(nettoyer(div.innerHTML), '<p>Né à [[Port-Brume]], loin de [[Nulle part]].</p><p>[[Port-Brume]]</p>');
});

test('renommer une fiche met à jour les liens de tout l’univers', async () => {
  const s = await creerStockage(NOM);
  const fiches = [
    { id: 'f1', universId: 'u1', nom: 'Aldric', texte: '<p>Vers [[port-brume]] et [[Ailleurs]]</p>', secrets: '<p>[[Port-Brume]]</p>' },
    { id: 'f2', universId: 'u1', nom: 'Autre', texte: '<p>Rien</p>', secrets: '' },
  ];
  const modifiees = await renommerLiens(s, fiches, 'Port-Brume', 'Brume & Sel');
  egal(modifiees.map(f => f.id), ['f1']);
  const f1 = await s.get('fiches', 'f1');
  egal([f1.texte, f1.secrets], ['<p>Vers [[Brume &amp; Sel]] et [[Ailleurs]]</p>', '<p>[[Brume &amp; Sel]]</p>']);
  egal(depuisTexteBrut('a <b>\nc'), '<p>a &lt;b&gt;</p><p>c</p>');
  s.fermer();
});

test('corbeille : restaurer, supprimer définitivement (avec images et versions), vider après N jours', async () => {
  const s = await creerStockage(NOM);
  await s.lot([
    ['put', 'univers', { id: 'u1', nom: 'A' }], ['put', 'univers', { id: 'u2', nom: 'B' }],
    ['put', 'fiches', { id: 'f1', universId: 'u1', nom: 'Un', imageId: 'i1', galerie: ['i2'] }],
    ['put', 'fiches', { id: 'f2', universId: 'u1', nom: 'Deux' }],
    ['put', 'fiches', { id: 'f3', universId: 'u2', nom: 'Trois' }],
    ['put', 'images', { id: 'i1', universId: 'u1' }], ['put', 'images', { id: 'i2', universId: 'u1' }],
    ['put', 'versions', { id: 'v1', ficheId: 'f1', universId: 'u1', date: 1, etat: {} }],
  ]);
  await mettreALaCorbeille(s, 'fiche', await s.get('fiches', 'f1'));
  await mettreALaCorbeille(s, 'fiche', await s.get('fiches', 'f2'));
  await mettreALaCorbeille(s, 'fiche', await s.get('fiches', 'f3'));
  await mettreALaCorbeille(s, 'univers', await s.get('univers', 'u2'));
  // Le contenu d'un univers à la corbeille n'apparaît pas à part.
  egal((await contenuCorbeille(s)).map(e => e.objet.id).sort(), ['f1', 'f2', 'u2']);
  await restaurer(s, 'fiche', await s.get('fiches', 'f2'), { typeId: 't9' });
  const f2 = await s.get('fiches', 'f2');
  egal([f2.corbeille, f2.typeId], [undefined, 't9']);
  await supprimerDefinitivement(s, 'fiche', await s.get('fiches', 'f1'));
  egal([await s.get('fiches', 'f1'), (await s.tous('images')).length, (await s.tous('versions')).length], [undefined, 0, 0]);
  await viderCorbeille(s, 30); // l'univers vient d'y aller : il reste
  egal((await contenuCorbeille(s)).map(e => e.objet.id), ['u2']);
  await viderCorbeille(s);
  egal([(await s.tous('univers')).map(u => u.id), await s.get('fiches', 'f3')], [['u1'], undefined]);
  s.fermer();
});

test('versions : différences en mots, au plus N gardées ; dupliquer une fiche copie ses images', async () => {
  const a = etatFiche({ nom: 'Aldric', texte: '<p>a</p>', valeurs: { c: 1 } });
  egal(differences(a, { ...a, texte: '<p>b</p>', valeurs: { c: 2 } }), 'texte, cases');
  const s = await creerStockage(NOM);
  const fiche = { id: 'f1', universId: 'u1', nom: 'Aldric', autresNoms: ['Le Borgne'], imageId: 'i1', galerie: ['i2'] };
  for (let i = 1; i <= 4; i++) await garderVersion(s, fiche, { ...a, texte: `v${i}` }, i, 3);
  egal((await versionsFiche(s, 'f1')).map(v => v.etat.texte), ['v4', 'v3', 'v2']);

  await s.lot([['put', 'fiches', fiche], ['put', 'images', { id: 'i1', universId: 'u1' }], ['put', 'images', { id: 'i2', universId: 'u1' }]]);
  const copie = await dupliquerFiche(s, fiche);
  egal([copie.nom, copie.autresNoms, copie.imageId === 'i1', copie.galerie.length], ['Aldric (copie)', [], false, 1]);
  egal((await s.tous('images')).length, 4);
  egal((await s.get('fiches', copie.id)).nom, 'Aldric (copie)');
  s.fermer();
});

test('recherche : sans majuscules ni accents, dans le nom, le texte, les secrets, les cases et les étiquettes', () => {
  const types = [{ id: 't', nom: 'Personnage', cases: [{ id: 'c1', nom: 'Lieu', sorte: 'fiche' }, { id: 'c2', nom: 'Rôle', sorte: 'texte' }] }];
  const fiches = [
    { id: 'a', typeId: 't', nom: 'Port-Brume', texte: '<p>Une <b>ville</b> de pêcheurs.</p>' },
    { id: 'b', typeId: 't', nom: 'Aldric', texte: '<p>Né à [[Port-Brume]].</p><p>Pêcheur.</p>', secrets: '<p>Il ment.</p>', valeurs: { c1: 'a' } },
    { id: 'c', typeId: 't', nom: 'Ysolde', secrets: '<p>Elle vit dans la brume.</p>', etiquettes: ['tome 1'] },
    { id: 'd', typeId: 't', nom: 'Garrec', valeurs: { c2: 'Pêcheur' } },
  ];
  egal(texteBrut('<p>Né à [[Port-Brume]].</p><p>A &amp; B</p>'), 'Né à Port-Brume. A & B');
  egal(chercher(fiches, types, 'BRUME').map(r => [r.fiche.id, r.nom, r.zone, r.aussi]),
    [['a', true, null, []], ['b', false, 'texte', ['la case Lieu']], ['c', false, 'secrets', []]]);
  egal(chercher(fiches, types, 'pecheur').map(r => r.fiche.id), ['b', 'd', 'a']);
  egal(chercher(fiches, types, 'TOME').map(r => r.aussi), [['les étiquettes']]);
  egal(chercher(fiches, types, '  '), []);
  egal(extrait('un deux trois quatre cinq six', 'quatre', 6, 6), '… trois quatre cinq…');
});

test('export Markdown : mise en forme, cases, liens, secrets au choix', () => {
  egal(versMarkdown('<p>Un <b>mot </b>et <i>deux</i>.</p><h2>Titre</h2><blockquote><p>A</p><p>B</p></blockquote><hr>Texte nu<br>suite', 3),
    'Un **mot** et *deux*.\n\n#### Titre\n\n> A\n> \n> B\n\n---\n\nTexte nu  \nsuite');
  const types = [{ id: 't', nom: 'Personnage', cases: [{ id: 'c1', nom: 'Âge', sorte: 'nombre' }, { id: 'c2', nom: 'Allié', sorte: 'fiche' }, { id: 'c3', nom: 'Vide', sorte: 'texte' }] }];
  const fiches = [
    { id: 'a', typeId: 't', nom: 'Aldric', autresNoms: ['Le Borgne'], parentId: 'b', valeurs: { c1: 27, c2: 'b' }, etiquettes: ['tome 1'],
      texte: '<p>Vers [[Port-Brume]].</p>', secrets: '<p>Chut</p>' },
    { id: 'b', typeId: 'x', nom: 'Port-Brume', texte: '' },
  ];
  const u = { nom: 'Elsméria', description: 'Un royaume.' };
  const attendu = '# Elsméria\n\nUn royaume.\n\n## Personnage\n\n### Aldric\n\n- Autres noms : Le Borgne\n- Dans : [[Port-Brume]]\n- Âge : 27\n- Allié : [[Port-Brume]]\n- Étiquettes : tome 1\n\nVers [[Port-Brume]].';
  egal(universMarkdown(u, types, fiches), `${attendu}\n\n## Sans type\n\n### Port-Brume\n`);
  egal(universMarkdown(u, types, fiches, true), `${attendu}\n\n#### Secrets\n\n> Chut\n\n## Sans type\n\n### Port-Brume\n`);
});

test('statistiques : mots, citations, fiches que rien ne cite, liens vers des fiches absentes', () => {
  const types = [{ id: 't', nom: 'Personnage', cases: [{ id: 'c1', sorte: 'fiche' }] }, { id: 'v', nom: 'Vide', cases: [] }];
  const fiches = [
    { id: 'a', typeId: 't', nom: 'Aldric', autresNoms: ['Le Borgne'], texte: '<p>Un deux trois.</p>' },
    { id: 'b', typeId: 't', nom: 'Bran', texte: '<p>Voir [[aldric]] et [[le borgne]], [[Tour]].</p>', secrets: '<p>[[Bran]] [[tour]]</p>', valeurs: { c1: 'a' } },
    { id: 'c', typeId: 't', nom: 'Cael', texte: '<p>[[Tour]] [[Bran]]</p>' },
  ];
  egal(compterMots('<p>Un <b>deux</b></p><p>trois</p>'), 3);
  const s = statistiques(fiches, types);
  egal([s.fiches, s.parType.map(l => [l.fiches, l.mots])], [3, [[3, 3 + 6 + 2 + 2], [0, 0]]]);
  egal(s.plusCitees.map(c => [c.fiche.id, c.n]), [['a', 3], ['b', 1]]);
  egal(s.orphelines.map(f => f.id), ['c']);
  egal(s.absents.map(a => [a.nom, a.sources.map(f => f.id)]), [['Tour', ['b', 'c']]]);
});

test('case à cocher et plusieurs fiches liées : export, « Citée dans », statistiques, recherche', () => {
  const type = { id: 't', nom: 'Groupe', cases: [{ id: 'k', nom: 'Secret', sorte: 'coche' }, { id: 'm', nom: 'Membres', sorte: 'fiches' },
    { id: 'u', nom: 'Chef', sorte: 'fiche' }] };
  const fiches = [{ id: 'a', typeId: 't', nom: 'Aldric' }, { id: 'b', typeId: 't', nom: 'Bran' },
    { id: 'o', typeId: 't', nom: 'Ordre', valeurs: { k: true, m: ['a', 'b'], u: ['b'] } }]; // u : ancienne case « plusieurs » repassée en « une »
  const nomDe = new Map(fiches.map(f => [f.id, f.nom]));
  egal(proprietes(fiches[2], type, nomDe).filter(([n]) => n !== 'Autres noms'), [['Secret', 'Oui'], ['Membres', '[[Aldric]], [[Bran]]'], ['Chef', '[[Bran]]']]);
  egal(proprietes(fiches[0], type, nomDe), [['Secret', 'Non']]);
  egal(citeeDans(fiches[1], fiches, [type]).map(r => r.ailleurs), [['la case Membres', 'la case Chef']]);
  egal(statistiques(fiches, [type]).plusCitees.map(c => [c.fiche.id, c.n]), [['b', 2], ['a', 1]]);
  egal(chercher(fiches, [type], 'bran').map(r => r.fiche.id), ['b', 'o']);
});

test('tomes : ordre, mots, dupliquer avec le contenu, corbeille et suppression', async () => {
  const s = await creerStockage(NOM);
  const t1 = nouveauTome('u1', { titre: 'Un', ordre: 2, couvertureId: 'i1' });
  const t2 = nouveauTome('u1', { titre: 'Deux', ordre: 1 });
  await s.lot([['put', 'univers', { id: 'u1', nom: 'U' }], ['put', 'tomes', t1], ['put', 'tomes', t2],
    ['put', 'images', { id: 'i1', universId: 'u1', fichier: new Blob(['c']) }],
    ['put', 'noeudsManuscrit', { id: 'c1', tomeId: t1.id, parentId: null, titre: 'Chapitre 1' }],
    ['put', 'noeudsManuscrit', { id: 's1', tomeId: t1.id, parentId: 'c1', titre: 'Scène 1' }],
    ['put', 'textes', { noeudId: 's1', html: '<p>Il était une fois [[Aria]].</p>' }]]);
  egal((await tomesUnivers(s, 'u1')).map(t => t.titre), ['Deux', 'Un']);
  egal([...[t1, t2]].sort(TRIS_TOMES.recents[1])[0].titre, [t1, t2].sort((a, b) => b.creeLe - a.creeLe)[0].titre);
  egal(await motsTome(s, t1.id), 5);

  const c = await dupliquerTome(s, t1);
  egal(c.titre, 'Un (copie)');
  const [ch, sc] = (await s.query('noeudsManuscrit', 'tomeId', c.id)).sort((a, b) => a.titre.localeCompare(b.titre));
  egal([sc.parentId === ch.id, ch.id !== 'c1', c.couvertureId !== 'i1'], [true, true, true]);
  egal(await motsTome(s, c.id), 5);
  egal(await (await s.get('images', c.couvertureId)).fichier.text(), 'c');

  await mettreALaCorbeille(s, 'tome', t1);
  egal((await tomesUnivers(s, 'u1')).map(t => t.titre), ['Deux', 'Un (copie)']);
  egal((await contenuCorbeille(s)).map(e => e.sorte), ['tome']);
  await supprimerDefinitivement(s, 'tome', await s.get('tomes', t1.id));
  egal([await s.get('tomes', t1.id), await s.get('noeudsManuscrit', 's1'), await s.get('textes', 's1'), await s.get('images', 'i1')],
    [undefined, undefined, undefined, undefined]);

  await supprimerUnivers(s, 'u1'); // emporte aussi les chapitres, scènes et textes des tomes
  egal([(await s.tous('tomes')).length, (await s.tous('noeudsManuscrit')).length, (await s.tous('textes')).length], [0, 0, 0]);
  s.fermer();
});

test('dupliquer un univers copie aussi ses tomes et leur contenu', async () => {
  const s = await creerStockage(NOM);
  const t = nouveauTome('u1', { titre: 'Un' });
  await s.lot([['put', 'univers', { id: 'u1', nom: 'U' }], ['put', 'tomes', t],
    ['put', 'noeudsManuscrit', { id: 'n1', tomeId: t.id, parentId: null }], ['put', 'textes', { noeudId: 'n1', html: '<p>Deux mots</p>' }]]);
  const copie = await dupliquerUnivers(s, 'u1');
  const [tc] = await s.query('tomes', 'universId', copie.id);
  const [nc] = await s.query('noeudsManuscrit', 'tomeId', tc.id);
  egal([tc.id !== t.id, nc.id !== 'n1', (await s.get('textes', nc.id))?.html], [true, true, '<p>Deux mots</p>']);
  egal((await s.tous('noeudsManuscrit')).length, 2);
  s.fermer();
});

test('plan : ordre de lecture, numéros de chapitres, mots, déplacer, corbeille', async () => {
  const s = await creerStockage(NOM);
  const tome = nouveauTome('u1', { titre: 'T' });
  const n = (sorte, parentId, ordre, titre = '') => ({ ...nouveauNoeud(tome, sorte, parentId), ordre, titre });
  const p1 = n('partie', null, 0, 'Début');
  const c1 = n('chapitre', p1.id, 0, 'Le retour');
  const s1 = n('scene', c1.id, 0, 'Quai'), s2 = n('scene', c1.id, 1);
  const c2 = n('chapitre', p1.id, 1);
  const c3 = n('chapitre', null, 1, 'Fin');
  const tous = [c3, s2, c2, p1, s1, c1];
  await s.lot([['put', 'tomes', tome], ...tous.map(x => ['put', 'noeudsManuscrit', x]),
    ['put', 'textes', { noeudId: s1.id, html: '<p>un deux trois</p>' }], ['put', 'textes', { noeudId: c1.id, html: '<p>quatre</p>' }],
    ['put', 'textes', { noeudId: c3.id, html: '<p>cinq six</p>' }]]);
  let lignes = lignesPlan(tous);
  egal(lignes.map(titreNoeud), ['Début', 'Chapitre 1 – Le retour', 'Quai', 'Scène sans titre', 'Chapitre 2', 'Chapitre 3 – Fin']);
  egal(lignes.map(l => l.niveau), [0, 1, 2, 2, 1, 0]);
  const mots = await motsPlan(s, lignes);
  egal([mots.get(p1.id), mots.get(c1.id), mots.get(s1.id), mots.get(c3.id)], [4, 4, 3, 2]);
  egal(await motsTome(s, tome.id), 6);

  egal(ciblesPossibles(c1, lignes).map(titreNoeud), ['Début', 'Chapitre 2', 'Chapitre 3 – Fin']); // ni lui ni ses scènes
  egal(echanger(c1, lignes, -1), []); // déjà en premier dans sa partie
  echanger(c1, lignes, 1);
  egal(lignesPlan(tous).map(titreNoeud).slice(1, 3), ['Chapitre 1', 'Chapitre 2 – Le retour']);

  await mettreALaCorbeille(s, 'noeud', c1); // le chapitre et ses scènes disparaissent du plan
  c1.corbeille = 1;
  egal(lignesPlan(tous).length, 3);
  egal(await motsTome(s, tome.id), 2);
  egal((await contenuCorbeille(s)).map(e => e.sorte), ['noeud']);
  await supprimerDefinitivement(s, 'noeud', await s.get('noeudsManuscrit', c1.id));
  egal([await s.get('noeudsManuscrit', s1.id), await s.get('textes', s1.id), await s.get('textes', c1.id)], [undefined, undefined, undefined]);
  egal((await s.tous('noeudsManuscrit')).length, 3);
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
