import { dessin } from './icones.js';

// Texte mis en forme des fiches : seules ces balises sont gardées, sans aucun attribut.
const PERMIS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'H2', 'H3', 'BLOCKQUOTE', 'HR', 'DIV']);
const BLOCS = new Set(['P', 'H2', 'H3', 'BLOCKQUOTE', 'HR']);
const A_JETER = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'NOSCRIPT', 'TITLE', 'HEAD']);

// Nettoie du HTML venu d'ailleurs (collé, importé d'une sauvegarde) avant de l'afficher ou de l'enregistrer.
export function nettoyer(html) {
  const doc = new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html');
  const propre = parent => {
    for (const n of [...parent.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) { n.data = n.data.replaceAll('\u200B', ''); continue; } // caractères invisibles autour des liens
      if (n.nodeType !== Node.ELEMENT_NODE || A_JETER.has(n.tagName)) { n.remove(); continue; }
      propre(n);
      if (PERMIS.has(n.tagName)) [...n.attributes].forEach(a => n.removeAttribute(a.name));
      else n.replaceWith(...n.childNodes); // balise inconnue : on garde seulement son texte
    }
  };
  propre(doc.body);
  // Texte tapé hors paragraphe (début d'un texte vide, ancienne <div>) : rangé dans des <p>.
  let p = null;
  for (const n of [...doc.body.childNodes]) {
    if (n.nodeName === 'DIV') { p = doc.createElement('p'); p.append(...n.childNodes); n.replaceWith(p); p = null; continue; }
    if (BLOCS.has(n.nodeName)) { p = null; continue; }
    if (!p) {
      if (n.nodeType === Node.TEXT_NODE && !n.data.trim()) { n.remove(); continue; } // espaces entre deux blocs
      p = doc.createElement('p');
      n.before(p);
    }
    p.append(n);
  }
  doc.body.querySelectorAll(':scope > p').forEach(q => { if (!q.textContent.trim() && !q.querySelector('br')) q.remove(); });
  return doc.body.innerHTML;
}

// Boutons de la barre : [libellé, nom lu, commande, valeur]
const BOUTONS = [
  ['<b>G</b>', 'Gras', 'bold'], ['<i>I</i>', 'Italique', 'italic'], ['<u>S</u>', 'Souligné', 'underline'],
  ['Titre', 'Titre', 'formatBlock', 'h2'], ['Sous-titre', 'Sous-titre', 'formatBlock', 'h3'],
  ['Citation', 'Citation', 'formatBlock', 'blockquote'], ['Séparateur', 'Ligne de séparation', 'insertHorizontalRule'],
];

// Ancien texte brut (secrets d'avant le texte mis en forme) : une ligne = un paragraphe.
export function depuisTexteBrut(s) {
  if (!s || s.trimStart().startsWith('<')) return s;
  return s.split('\n').map(ligne => {
    const p = document.createElement('p');
    p.textContent = ligne;
    return p.outerHTML;
  }).join('');
}

// Transforme `zone` en éditeur ; `changement(html)` est appelé à chaque modification.
// Options : `barre` (barre de mise en forme), `nom` (nom lu), `decorer(texte)` (appelé à l'affichage et à chaque frappe).
// shortcut: s'appuie sur document.execCommand (ancien mais pris en charge partout) ; à remplacer s'il disparaît des navigateurs.
export function editeur(zone, html, changement, { barre = true, nom = 'Texte', decorer = () => {} } = {}) {
  zone.innerHTML = `${barre ? `<div class="barre-texte" role="toolbar" aria-label="Mise en forme">
      ${BOUTONS.map(([l, n], i) => `<button type="button" data-i="${i}" aria-label="${n}" title="${n}">${l}</button>`).join('')}
      <span class="annuler-retablir">
        <button type="button" data-histoire="undo" aria-label="Annuler" title="Annuler (Ctrl+Z)">${dessin('annuler')}</button>
        <button type="button" data-histoire="redo" aria-label="Rétablir" title="Rétablir (Ctrl+Y)">${dessin('retablir')}</button>
      </span>
    </div>` : ''}
    <div class="texte-riche" contenteditable="true" role="textbox" aria-multiline="true"></div>`;
  const texte = zone.querySelector('.texte-riche');
  texte.setAttribute('aria-label', nom);
  texte.innerHTML = nettoyer(html);
  decorer(texte);
  const signaler = () => changement(nettoyer(texte.innerHTML));
  texte.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  texte.addEventListener('input', () => { decorer(texte); signaler(); });
  texte.addEventListener('paste', e => {
    e.preventDefault();
    const d = e.clipboardData;
    const html = d.getData('text/html');
    if (html) document.execCommand('insertHTML', false, nettoyer(html));
    else document.execCommand('insertText', false, d.getData('text/plain'));
  });
  if (!barre) return;

  zone.querySelector('.barre-texte').addEventListener('mousedown', e => e.preventDefault()); // garde la sélection
  zone.querySelector('.barre-texte').addEventListener('click', e => {
    const h = e.target.closest('[data-histoire]');
    if (h) {
      texte.focus();
      document.execCommand(h.dataset.histoire); // déclenche « input », donc l'enregistrement
      return;
    }
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const [, , cmd, val] = BOUTONS[b.dataset.i];
    texte.focus();
    document.execCommand('defaultParagraphSeparator', false, 'p');
    // Un deuxième clic sur Titre / Sous-titre / Citation remet un paragraphe normal.
    const actuel = document.queryCommandValue('formatBlock').toLowerCase();
    document.execCommand(cmd, false, cmd === 'formatBlock' && actuel === val ? 'p' : val);
    signaler();
  });
}
