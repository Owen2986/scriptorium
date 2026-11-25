// Petit message en bas de l'écran pendant 6 secondes, avec un bouton facultatif (« Annuler » par défaut).
// Il reste affiché quand on change de page (il est hors de la zone que le routeur remplace).
let actuel;

export function message(texte, annuler, libelle = 'Annuler') {
  actuel?.remove();
  const m = document.createElement('div');
  m.className = 'message';
  m.setAttribute('role', 'status');
  m.innerHTML = '<span></span>';
  m.firstChild.textContent = texte;
  if (annuler) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = libelle;
    b.addEventListener('click', () => { m.remove(); annuler(); });
    m.append(b);
  }
  document.body.append(m);
  actuel = m;
  let minuterie;
  const lancer = () => { minuterie = setTimeout(() => m.remove(), 6000); };
  // On laisse le temps de cliquer : le compte s'arrête quand la souris ou le clavier est sur le message.
  m.addEventListener('pointerenter', () => clearTimeout(minuterie));
  m.addEventListener('focusin', () => clearTimeout(minuterie));
  m.addEventListener('pointerleave', lancer);
  lancer();
}
