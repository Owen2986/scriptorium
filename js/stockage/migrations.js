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
  // 2 : les icônes des types de fiches passent des émojis aux dessins de icones/types.svg.
  (db, tx) => {
    const noms = {"👤":"person","🧙":"wizard-face","🧝":"woman-elf-face","👑":"crown","⚔️":"crossed-swords","🛡️":"checked-shield","🏰":"castle","🏯":"pagoda","🏘️":"village","⛪":"church","🌲":"pine-tree","⛰️":"peaks","🌊":"big-wave","🏝️":"island","🗺️":"treasure-map","🧭":"compass","🗝️":"key","💎":"cut-diamond","📜":"scroll-unfurled","📖":"book-cover","🔮":"crystal-ball","⚗️":"potion-ball","🗡️":"broadsword","🏹":"bow-arrow","🐉":"dragon-head","🐺":"wolf-head","🦅":"eagle-head","🐍":"snake","🦄":"unicorn","👹":"orc-head","👻":"ghost","💀":"death-skull","🌙":"moon","☀️":"sun","⭐":"star-swirl","🔥":"fire","💧":"water-drop","🌿":"oak-leaf","⚙️":"cog","🚀":"rocket","🛸":"ufo","🤖":"robot-golem","🔬":"microscope","🧬":"dna1","🪐":"ringed-planet","💡":"light-bulb","⚖️":"scales","🎭":"drama-masks"};
    tx.objectStore('typesFiches').openCursor().onsuccess = e => {
      const c = e.target.result;
      if (!c) return;
      if (noms[c.value.icone]) c.update({ ...c.value, icone: noms[c.value.icone] });
      c.continue();
    };
  },
];
