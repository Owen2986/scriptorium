import { nouvelUnivers } from './univers.js';
import { assurerTypes, typesUnivers } from './types.js';
import { nouvelleFiche } from './fiches.js';

const NOM = 'Royaume d’Elsméria';

// [type, nom, cases (une valeur « fiche » est le nom d'une autre fiche), texte, autres champs]
const FICHES = [
  ['Personnage', 'Aldric Ventemer', { 'Âge': 47, 'Espèce': 'Humain', 'Rôle': 'Protagoniste', 'Statut': 'Vivant',
    'Lieu de naissance': 'Port-Brume', 'Groupe': 'L’Ordre du Chêne' },
  '<h2>Histoire</h2><p>Fils d’un pêcheur de Port-Brume, Aldric quitte la côte à quinze ans pour servir l’Ordre du Chêne. Il y apprend l’épée, puis le silence.</p><blockquote>« Une lettre qu’on n’ouvre pas reste une promesse. »</blockquote><p>Vingt ans plus tard, il revient au port avec une lettre scellée qu’il n’a jamais ouverte.</p><hr><h2>Apparence</h2><p>Grand, les tempes grises, une cicatrice qui lui ferme à moitié l’œil gauche.</p>',
  { favori: true, etiquettes: ['tome 1'], secrets: 'La lettre vient de sa mère, qu’il croit morte. À révéler au chapitre 12.' }],
  ['Personnage', 'Maëlle Corbin', { 'Âge': 39, 'Espèce': 'Humaine', 'Rôle': 'Antagoniste', 'Statut': 'Vivant',
    'Lieu de naissance': 'Port-Brume', 'Groupe': 'La Main Grise' },
  '<p>Gouverneure de Port-Brume le jour, maîtresse de la Main Grise la nuit. Elle croit que la magie mourante doit revenir à ceux qui sauront la payer.</p>',
  { favori: true, etiquettes: ['tome 1'], secrets: 'Elle a lu la lettre d’Aldric avant lui, et l’a recachetée.' }],
  ['Personnage', 'Frère Ansel', { 'Âge': 68, 'Espèce': 'Humain', 'Rôle': 'Secondaire', 'Statut': 'Vivant', 'Groupe': 'L’Ordre du Chêne' },
    '<p>Archiviste de la Citadelle et ancien maître d’armes d’Aldric. Il tient le registre des derniers sortilèges connus.</p>'],
  ['Personnage', 'Ysolde de Brume', { 'Âge': 212, 'Espèce': 'Elfe', 'Rôle': 'Secondaire', 'Statut': 'Disparu',
    'Lieu de naissance': 'Forêt d’Ombreval' },
  '<p>Dernière gardienne d’Ombreval. On ne l’a plus vue depuis l’hiver où les arbres ont cessé de chanter.</p>', { etiquettes: ['à retravailler'] }],
  ['Personnage', 'Garrec le Passeur', { 'Âge': 55, 'Espèce': 'Humain', 'Rôle': 'Figurant', 'Statut': 'Mort', 'Lieu de naissance': 'Port-Brume' },
    '<p>Batelier qui faisait passer les marchandises de la Main Grise. Retrouvé noyé au premier chapitre.</p>'],
  ['Lieu', 'Port-Brume', { 'Sorte de lieu': 'Ville', 'Population': 12000, 'Climat': 'Brumeux et humide', 'Dirigé par': 'Maëlle Corbin' },
    '<p>Port de pêche devenu ville marchande, noyé dans le brouillard neuf mois sur douze. Les cloches y sonnent pour guider les bateaux.</p>', { favori: true }],
  ['Lieu', 'La Lanterne Noire', { 'Sorte de lieu': 'Bâtiment' },
    '<p>Taverne des quais où la Main Grise tient ses comptes, dans l’arrière-salle.</p>', { parent: 'Port-Brume' }],
  ['Lieu', 'Forêt d’Ombreval', { 'Sorte de lieu': 'Forêt', 'Climat': 'Froid et silencieux' },
    '<p>Forêt ancienne où la magie était la plus forte. Les arbres y grisent un peu plus chaque année.</p>'],
  ['Lieu', 'Citadelle de Haute-Garde', { 'Sorte de lieu': 'Bâtiment', 'Dirigé par': 'Frère Ansel' },
    '<p>Forteresse de l’Ordre du Chêne, bâtie sur une falaise au nord du royaume.</p>'],
  ['Objet', 'La Lettre scellée', { 'Sorte d’objet': 'Lettre', 'Propriétaire': 'Aldric Ventemer', 'Origine': 'Port-Brume', 'Pouvoirs': 'Aucun connu' },
    '<p>Une enveloppe au sceau de cire verte, jamais ouverte par son destinataire.</p>'],
  ['Objet', 'L’Épée de Haute-Garde', { 'Sorte d’objet': 'Arme', 'Propriétaire': 'Aldric Ventemer', 'Origine': 'Citadelle de Haute-Garde',
    'Pouvoirs': 'Sa lame s’éclaire près d’un sortilège' }, '<p>Remise à chaque chevalier de l’Ordre le jour de son serment.</p>'],
  ['Groupe/Faction', 'L’Ordre du Chêne', { 'Sorte de groupe': 'Ordre', 'Chef': 'Frère Ansel', 'Siège': 'Citadelle de Haute-Garde',
    'Devise': 'Racines profondes, branches droites' }, '<p>Ordre de chevaliers chargé de protéger ce qui reste de magie dans le royaume.</p>'],
  ['Groupe/Faction', 'La Main Grise', { 'Sorte de groupe': 'Guilde', 'Chef': 'Maëlle Corbin', 'Siège': 'La Lanterne Noire', 'Devise': 'Rien ne se perd' },
    '<p>Guilde de contrebandiers qui revend les derniers objets enchantés au plus offrant.</p>'],
  ['Créature', 'La Vouivre des brumes', { 'Habitat': 'Forêt d’Ombreval', 'Taille': 'Douze mètres', 'Danger': 'Mortelle' },
    '<p>Serpent ailé qu’on croyait éteint avec la magie. Des pêcheurs disent l’avoir vue au large.</p>'],
  ['Notion', 'L’Extinction', { 'Domaine': 'Magie', 'Résumé': 'La magie d’Elsméria s’affaiblit depuis un siècle.' },
    '<p>Personne ne sait pourquoi la magie s’éteint. L’Ordre y voit une maladie, la Main Grise une affaire.</p>'],
  ['Notion', 'Le Calendrier des marées', { 'Domaine': 'Coutume', 'Résumé': 'Les années se comptent en grandes marées.' },
    '<p>À Port-Brume, on ne compte pas les années mais les grandes marées d’équinoxe.</p>'],
];

// Fiches d'exemple dans l'univers `u` (types de base créés au besoin).
export async function ajouterFichesExemple(stockage, u) {
  await assurerTypes(stockage, u);
  const types = new Map((await typesUnivers(stockage, u.id)).map(t => [t.nom, t]));
  const fiches = FICHES.filter(([t]) => types.has(t)).map(([t, nom, , texte, autres = {}]) =>
    nouvelleFiche(u.id, types.get(t).id, { nom, texte, secrets: autres.secrets ?? '', favori: !!autres.favori,
      etiquettes: autres.etiquettes ?? [] }));
  const idDe = new Map(fiches.map(f => [f.nom, f.id]));
  FICHES.filter(([t]) => types.has(t)).forEach(([t, , cases, , autres = {}], i) => {
    const f = fiches[i];
    f.parentId = idDe.get(autres.parent) ?? null;
    for (const c of types.get(t).cases) {
      const v = cases[c.nom];
      if (v === undefined) continue;
      if (c.sorte === 'fiche') { if (idDe.has(v)) f.valeurs[c.id] = idDe.get(v); }
      else f.valeurs[c.id] = v;
    }
  });
  await stockage.lot(fiches.map(f => ['put', 'fiches', f]));
}

// Créé une seule fois : si l'utilisateur le supprime, il ne revient pas.
export async function creerExempleSiBesoin(stockage) {
  if (!await stockage.get('meta', 'exempleCree')) {
    const u = nouvelUnivers({
      nom: NOM,
      couleur: '#5b6b2f',
      description: 'Un royaume de forêts anciennes et de cités fortifiées, où la magie s’éteint lentement. '
        + 'Univers d’exemple : explorez-le, modifiez-le ou supprimez-le librement.',
    });
    await stockage.lot([['put', 'univers', u], ['put', 'meta', { cle: 'exempleCree', valeur: true }]]);
  }
  if (await stockage.get('meta', 'fichesExemple')) return;
  // shortcut: l'univers d'exemple créé avant les fiches est retrouvé par son nom ; à retirer une fois l'appli publiée.
  const u = (await stockage.tous('univers')).find(x => x.nom === NOM);
  if (u && !(await stockage.query('fiches', 'universId', u.id)).length) await ajouterFichesExemple(stockage, u);
  await stockage.put('meta', { cle: 'fichesExemple', valeur: true });
}
