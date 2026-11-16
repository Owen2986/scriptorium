// Chaque entrée fait passer le schéma de la version i à i+1.
// Ne jamais modifier une migration déjà publiée : en ajouter une nouvelle à la fin.
export const MIGRATIONS = [
  (db) => {
    const store = (nom, cle = 'id', index = []) => {
      const s = db.createObjectStore(nom, { keyPath: cle });
      index.forEach(i => s.createIndex(i, i));
    };
    store('univers');
    store('typesFiches', 'id', ['universId']);
    store('fiches', 'id', ['universId', 'typeId']);
    store('relations', 'id', ['universId', 'sourceId', 'cibleId']);
    store('calendriers', 'id', ['universId']); // les ères sont rangées dans le calendrier
    store('evenements', 'id', ['universId']);
    store('cartes', 'id', ['universId']);
    store('epingles', 'id', ['carteId']);
    store('images', 'id', ['universId']);
    store('tomes', 'id', ['universId']);
    store('noeudsManuscrit', 'id', ['tomeId', 'parentId']);
    store('textes', 'noeudId');
    store('meta', 'cle');
    store('statsJour', 'jour');
  },
];
