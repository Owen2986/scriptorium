import { nouvelUnivers } from '../../modele/univers.js';
import { urlImage } from '../../ui/images.js';

export async function vueAccueil(page, params, { stockage }) {
  const univers = (await stockage.tous('univers')).filter(u => !u.corbeille).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  page.innerHTML = `<div class="titre-page">
      <h1>Mes univers</h1>
      <button type="button" class="principal">Nouvel univers</button>
    </div>
    ${univers.length ? '<ul class="grille-univers"></ul>' : '<p class="vide">Aucun univers pour l’instant</p>'}`;

  for (const u of univers) {
    const li = document.createElement('li');
    li.innerHTML = `<a class="carte carte-univers"><div class="garde" aria-hidden="true"></div>
      <div class="corps"><h2></h2><p></p></div></a>`;
    const a = li.firstChild;
    a.href = `#/univers/${encodeURIComponent(u.id)}`;
    a.style.setProperty('--couleur-univers', u.couleur);
    a.querySelector('h2').textContent = u.nom || 'Sans nom';
    a.querySelector('p').textContent = u.description;
    const url = await urlImage(stockage, u.couvertureId);
    const garde = a.querySelector('.garde');
    if (url) garde.innerHTML = `<img alt="" src="${url}">`;
    else garde.textContent = (u.nom || 'S').trim().charAt(0).toUpperCase();
    page.querySelector('ul').append(li);
  }

  page.querySelector('button').addEventListener('click', async () => {
    const u = nouvelUnivers();
    await stockage.put('univers', u);
    location.hash = `#/univers/${u.id}`;
  });
}
