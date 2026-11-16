// Texte mis en forme des fiches : seules ces balises sont gardées, sans aucun attribut.
const PERMIS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'H2', 'H3', 'BLOCKQUOTE', 'HR', 'DIV']);
const A_JETER = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'NOSCRIPT', 'TITLE', 'HEAD']);

// Nettoie du HTML venu d'ailleurs (collé, importé d'une sauvegarde) avant de l'afficher ou de l'enregistrer.
export function nettoyer(html) {
  const doc = new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html');
  const propre = parent => {
    for (const n of [...parent.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) continue;
      if (n.nodeType !== Node.ELEMENT_NODE || A_JETER.has(n.tagName)) { n.remove(); continue; }
      propre(n);
      if (PERMIS.has(n.tagName)) [...n.attributes].forEach(a => n.removeAttribute(a.name));
      else n.replaceWith(...n.childNodes); // balise inconnue : on garde seulement son texte
    }
  };
  propre(doc.body);
  return doc.body.innerHTML;
}

// Boutons de la barre : [libellé, nom lu, commande, valeur]
const BOUTONS = [
  ['<b>G</b>', 'Gras', 'bold'], ['<i>I</i>', 'Italique', 'italic'], ['<u>S</u>', 'Souligné', 'underline'],
  ['Titre', 'Titre', 'formatBlock', 'h2'], ['Sous-titre', 'Sous-titre', 'formatBlock', 'h3'],
  ['Citation', 'Citation', 'formatBlock', 'blockquote'], ['Séparateur', 'Ligne de séparation', 'insertHorizontalRule'],
];

// Transforme `zone` en éditeur avec sa barre d'outils ; `changement(html)` est appelé à chaque modification.
// shortcut: s'appuie sur document.execCommand (ancien mais pris en charge partout) ; à remplacer s'il disparaît des navigateurs.
export function editeur(zone, html, changement) {
  zone.innerHTML = `<div class="barre-texte" role="toolbar" aria-label="Mise en forme">
      ${BOUTONS.map(([l, nom, cmd, val], i) =>
        `<button type="button" data-i="${i}" aria-label="${nom}" title="${nom}">${l}</button>`).join('')}
    </div>
    <div class="texte-riche" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texte"></div>`;
  const texte = zone.querySelector('.texte-riche');
  texte.innerHTML = nettoyer(html);
  const signaler = () => changement(nettoyer(texte.innerHTML));

  zone.querySelector('.barre-texte').addEventListener('mousedown', e => e.preventDefault()); // garde la sélection
  zone.querySelector('.barre-texte').addEventListener('click', e => {
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
  texte.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  texte.addEventListener('input', signaler);
  texte.addEventListener('paste', e => {
    e.preventDefault();
    const d = e.clipboardData;
    const html = d.getData('text/html');
    if (html) document.execCommand('insertHTML', false, nettoyer(html));
    else document.execCommand('insertText', false, d.getData('text/plain'));
  });
}
