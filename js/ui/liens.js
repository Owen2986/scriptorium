// Affichage des liens [[Nom]] dans un éditeur de texte mis en forme.

// Transforme chaque [[Nom]] de `racine` en lien d'un seul bloc. Les crochets restent dans le texte (cachés),
// si bien que l'enregistrement retrouve [[Nom]] tel quel. `existe(nom)` dit si la fiche existe.
export function decorerLiens(racine, existe) {
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  const aTraiter = [];
  for (let n; (n = marcheur.nextNode());) if (n.data.includes('[[') && !n.parentElement.closest('.lien')) aTraiter.push(n);
  const sel = getSelection();
  for (const n of aTraiter) {
    const morceaux = n.data.split(/(\[\[[^[\]]+\]\])/);
    if (morceaux.length === 1) continue;
    const curseur = sel.anchorNode === n ? sel.anchorOffset : -1;
    let pos = 0;
    let place = null;
    const neufs = morceaux.map((m, i) => {
      const debut = pos;
      pos += m.length;
      if (i % 2 === 0) {
        const t = document.createTextNode(m);
        if (!place && curseur >= debut && curseur <= pos) place = [t, curseur - debut];
        return t;
      }
      const nom = m.slice(2, -2);
      const lien = document.createElement('span');
      lien.className = existe(nom) ? 'lien' : 'lien absent';
      lien.contentEditable = 'false';
      lien.dataset.nom = nom;
      lien.innerHTML = '<span class="crochet">[[</span><span></span><span class="crochet">]]</span>';
      lien.children[1].textContent = nom;
      return lien;
    });
    n.replaceWith(...neufs);
    if (place) sel.collapse(...place); // le curseur reste juste après le lien qu'on vient de taper
  }
}

// Lien collé au curseur (avant ou après), pour ouvrir la bulle au clavier.
function lienAuCurseur() {
  const s = getSelection();
  if (!s.isCollapsed || !s.anchorNode) return null;
  const [n, o] = [s.anchorNode, s.anchorOffset];
  const texte = n.nodeType === Node.TEXT_NODE;
  const voisins = texte ? [o === 0 && n.previousSibling, o === n.length && n.nextSibling] : [n.childNodes[o - 1], n.childNodes[o]];
  return voisins.find(v => v?.classList?.contains('lien')) ?? null;
}

// Petite bulle sous le lien cliqué (ou atteint au clavier). `decrire(nom)` → { info, titre, bouton, action }.
// `zone` doit être en position relative ; la bulle y est ajoutée à la fin, donc atteignable par Tab.
export function bulleLiens(zone, decrire) {
  const bulle = document.createElement('div');
  bulle.className = 'bulle';
  bulle.hidden = true;
  bulle.innerHTML = '<small></small><span></span><button type="button"></button>';
  zone.append(bulle);
  let action;
  const fermer = () => { bulle.hidden = true; };
  const montrer = lien => {
    const d = decrire(lien.dataset.nom);
    [bulle.children[1].textContent, bulle.children[2].textContent] = [d.titre ?? '', d.bouton];
    bulle.children[0].textContent = d.info; // nom du type de la fiche
    action = d.action;
    bulle.hidden = false;
    const z = zone.getBoundingClientRect();
    const r = lien.getBoundingClientRect();
    bulle.style.top = `${r.bottom - z.top + 6}px`;
    bulle.style.left = `${Math.max(0, Math.min(r.left - z.left, z.width - bulle.offsetWidth))}px`;
  };
  // Toucher la bulle ne doit pas faire quitter le texte : sinon (iPhone) la bulle se ferme avant que le bouton reçoive le toucher.
  bulle.addEventListener('mousedown', e => e.preventDefault());
  bulle.querySelector('button').addEventListener('click', () => { fermer(); action(); });
  zone.addEventListener('click', e => {
    const lien = e.target.closest('.lien');
    if (lien) montrer(lien);
    else if (!bulle.contains(e.target)) fermer();
  });
  zone.addEventListener('keyup', e => {
    if (e.key === 'Escape') return fermer();
    if (!e.key.startsWith('Arrow') && e.key !== 'Home' && e.key !== 'End') return;
    const lien = lienAuCurseur();
    if (lien) montrer(lien); else fermer();
  });
  zone.addEventListener('input', fermer);
  zone.addEventListener('focusout', e => { if (!zone.contains(e.relatedTarget)) fermer(); });
}
