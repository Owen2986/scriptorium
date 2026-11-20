import { dessin } from './icones.js';

// Menu « Plus » (trois points) : `entrees` = [action, icône, libellé, classe?] ou 'trait'.
export const htmlMenu = entrees => `<div class="ancre-menu">
    <button type="button" class="bouton-plus" data-action="menu" aria-expanded="false" aria-haspopup="true" aria-label="Plus d’actions">${dessin('points')}</button>
    <ul class="menu" hidden>${entrees.map(e => e === 'trait' ? '<li><hr></li>'
      : `<li><button type="button"${e[3] ? ` class="${e[3]}"` : ''} data-action="${e[0]}">${dessin(e[1])}${e[2]}</button></li>`).join('')}</ul>
  </div>`;

// Ouvre et ferme le menu (clic, Échap, sortie du menu) ; `choisi(action)` reçoit l'entrée cliquée.
export function brancherMenu(ancre, choisi) {
  const bouton = ancre.querySelector('.bouton-plus');
  const menu = ancre.querySelector('.menu');
  const ouvrir = ouvert => {
    menu.hidden = !ouvert;
    bouton.setAttribute('aria-expanded', ouvert);
    if (ouvert) menu.querySelector('button').focus();
  };
  bouton.addEventListener('click', () => ouvrir(menu.hidden));
  ancre.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { ouvrir(false); bouton.focus(); } });
  ancre.addEventListener('focusout', e => { if (!ancre.contains(e.relatedTarget)) ouvrir(false); });
  menu.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    ouvrir(false);
    choisi(action);
  });
}
