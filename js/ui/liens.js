// Affichage des liens [[Nom]] dans un éditeur de texte mis en forme.

// Caractère invisible gardé de chaque côté d'un lien : sans lui, le curseur ne peut pas se placer
// avant/après un lien en début ou fin de ligne (clic, téléphone). `nettoyer` l'enlève à l'enregistrement.
const INVISIBLE = '\u200B';
const vide = v => v?.nodeType === Node.TEXT_NODE && !v.data.replaceAll(INVISIBLE, '');

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
  for (const lien of racine.querySelectorAll('.lien')) {
    for (const [voisin, ajouter] of [[lien.previousSibling, t => lien.before(t)], [lien.nextSibling, t => lien.after(t)]]) {
      if (voisin?.nodeType !== Node.TEXT_NODE) ajouter(document.createTextNode(INVISIBLE));
      else if (!voisin.data) voisin.data = INVISIBLE;
    }
  }
  // Curseur posé devant le caractère invisible qui suit un lien : on le met derrière.
  if (sel.anchorNode?.nodeType === Node.TEXT_NODE && sel.anchorOffset === 0 && sel.anchorNode.data === INVISIBLE
    && sel.anchorNode.previousSibling?.classList?.contains('lien')) sel.collapse(sel.anchorNode, 1);
}

// Lien collé au curseur, juste avant (sens -1) ou juste après (sens 1), sans compter les caractères invisibles.
function lienAuCurseur(sens) {
  const s = getSelection();
  if (!s.isCollapsed || !s.anchorNode) return null;
  const [n, o] = [s.anchorNode, s.anchorOffset];
  const suivant = v => sens < 0 ? v.previousSibling : v.nextSibling;
  let v;
  if (n.nodeType === Node.TEXT_NODE) {
    if ((sens < 0 ? n.data.slice(0, o) : n.data.slice(o)).replaceAll(INVISIBLE, '')) return null;
    v = suivant(n);
  } else v = n.childNodes[sens < 0 ? o - 1 : o];
  while (vide(v)) v = suivant(v);
  return v?.classList?.contains('lien') ? v : null;
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
    const lien = lienAuCurseur(-1) ?? lienAuCurseur(1);
    if (lien) montrer(lien); else fermer();
  });
  // Effacer contre un lien l'efface d'un coup (les téléphones n'y arrivent pas seuls) ; Ctrl+Z le remet.
  zone.addEventListener('beforeinput', e => {
    const sens = { deleteContentBackward: -1, deleteContentForward: 1 }[e.inputType];
    const lien = sens && lienAuCurseur(sens);
    if (!lien) return;
    e.preventDefault();
    const r = document.createRange();
    r.selectNode(lien);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    document.execCommand('delete');
  });
  zone.addEventListener('input', fermer);
  zone.addEventListener('focusout', e => { if (!zone.contains(e.relatedTarget)) fermer(); });
}

// Une ligne de la liste de suggestions : fiche proposée, ou « Créer la fiche « … » ».
function ligneSuggestion(c, i) {
  const li = document.createElement('li');
  li.setAttribute('role', 'option');
  li.dataset.i = i;
  if (c.creer) {
    li.className = 'creer';
    li.innerHTML = 'Créer la fiche <em></em>';
    li.querySelector('em').textContent = `« ${c.nom} »`;
    return li;
  }
  li.style.setProperty('--couleur-type', c.couleur);
  li.innerHTML = `${c.icone}<span class="nom"></span><small></small>`;
  const [d, f] = c.place;
  li.querySelector('.nom').append(c.nom.slice(0, d), Object.assign(document.createElement('b'), { textContent: c.nom.slice(d, f) }), c.nom.slice(f));
  li.querySelector('small').textContent = c.info;
  return li;
}

// Même liste sous un simple champ (case « plusieurs fiches liées ») : `choisir(c)` reçoit la ligne choisie.
export function suggestionsChamp(champ, proposer, choisir) {
  const liste = document.createElement('ul');
  liste.className = 'suggestions';
  liste.setAttribute('role', 'listbox');
  liste.hidden = true;
  champ.after(liste);
  let choix = [], actif = 0;
  const fermer = () => { liste.hidden = true; };
  const surligner = () => [...liste.children].forEach((li, i) => li.setAttribute('aria-selected', i === actif));
  const prendre = i => { const c = choix[i]; champ.value = ''; fermer(); choisir(c); };
  champ.addEventListener('input', () => {
    const q = champ.value.trim();
    choix = q ? proposer(q) : [];
    if (!choix.length && q) choix = [{ nom: q, creer: true }];
    if (!choix.length) return fermer();
    actif = 0;
    liste.replaceChildren(...choix.map(ligneSuggestion));
    surligner();
    liste.hidden = false;
  });
  champ.addEventListener('keydown', e => {
    if (liste.hidden) return;
    const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (d) actif = (actif + d + choix.length) % choix.length, surligner();
    else if (e.key === 'Enter') prendre(actif);
    else if (e.key === 'Escape') fermer();
    else return;
    e.preventDefault();
  });
  liste.addEventListener('mousedown', e => e.preventDefault()); // garder la main dans le champ
  liste.addEventListener('click', e => { const li = e.target.closest('li'); if (li) prendre(+li.dataset.i); });
  champ.addEventListener('blur', fermer);
}

// Liste de suggestions quand on tape [[ dans `zone` (en position relative).
// `proposer(q)` → [{ nom, place: [début, fin], info, icone (svg), couleur }] ; `creer(nom)` crée la fiche absente.
// Choisir pose [[nom]] (que `decorerLiens` transforme en lien) ; Échap ferme la liste.
export function suggestionsLiens(zone, proposer, creer) {
  const liste = document.createElement('ul');
  liste.className = 'suggestions';
  liste.setAttribute('role', 'listbox');
  liste.setAttribute('aria-label', 'Fiches proposées');
  liste.hidden = true;
  zone.append(liste);
  let choix = [], actif = 0, tape = null; // tape = [nœud texte, début de « [[ », fin]

  const fermer = () => { liste.hidden = true; tape = null; };
  const surligner = () => [...liste.children].forEach((li, i) => li.setAttribute('aria-selected', i === actif));
  const choisir = i => {
    const c = choix[i];
    const [n, debut, fin] = tape;
    fermer();
    const r = document.createRange();
    r.setStart(n, debut);
    r.setEnd(n, fin);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    document.execCommand('insertText', false, `[[${c.nom}]]`); // passe par « input » : lien affiché, texte enregistré, Ctrl+Z possible
    if (c.creer) creer(c.nom);
  };

  const ouvrir = () => {
    const s = getSelection();
    const n = s.anchorNode;
    const avant = s.isCollapsed && n?.nodeType === Node.TEXT_NODE && zone.contains(n) ? n.data.slice(0, s.anchorOffset) : '';
    const m = avant.match(/\[\[([^[\]]*)$/);
    if (!m) return fermer();
    const q = m[1];
    choix = proposer(q);
    if (!choix.length && q.trim()) choix = [{ nom: q.trim(), creer: true }];
    if (!choix.length) return fermer();
    tape = [n, m.index, s.anchorOffset];
    actif = 0;
    liste.replaceChildren(...choix.map(ligneSuggestion));
    surligner();
    liste.hidden = false;
    const r = document.createRange();
    r.setStart(n, s.anchorOffset);
    const c = r.getClientRects()[0] ?? n.parentElement.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    liste.style.top = `${c.bottom - z.top + 6}px`;
    liste.style.left = `${Math.max(0, Math.min(c.left - z.left - 40, z.width - liste.offsetWidth))}px`;
  };

  zone.addEventListener('input', ouvrir);
  zone.addEventListener('keydown', e => {
    if (liste.hidden) return;
    const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (d) actif = (actif + d + choix.length) % choix.length, surligner();
    else if (e.key === 'Enter' || e.key === 'Tab') choisir(actif);
    else if (e.key === 'Escape') fermer();
    else return;
    e.preventDefault();
    e.stopPropagation();
  });
  liste.addEventListener('mousedown', e => e.preventDefault()); // ne pas quitter le texte (voir la bulle)
  liste.addEventListener('click', e => { const li = e.target.closest('li'); if (li) choisir(+li.dataset.i); });
  zone.addEventListener('click', e => { if (!liste.contains(e.target)) fermer(); });
  zone.addEventListener('focusout', e => { if (!zone.contains(e.relatedTarget)) fermer(); });
}
