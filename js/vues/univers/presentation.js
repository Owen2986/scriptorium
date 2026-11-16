import { nouvelId, supprimerUnivers, dupliquerUnivers } from '../../modele/univers.js';
import { urlImage } from '../../ui/images.js';
import { ouvrirUnivers } from './commun.js';

export async function vuePresentation(page, { id }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '');
  if (!u) return;

  page.insertAdjacentHTML('beforeend', `<form class="carte presentation">
      <div class="couverture"></div>
      <label>Nom <input name="nom" autocomplete="off"></label>
      <label>Description <textarea name="description" rows="6"></textarea></label>
      <label class="choix">Couleur <input type="color" name="couleur"></label>
      <fieldset>
        <legend>Image de couverture</legend>
        <div class="actions">
          <label class="bouton">Choisir une image<input type="file" name="couverture" accept="image/*" hidden></label>
          <button type="button" data-action="retirer">Retirer l’image</button>
        </div>
      </fieldset>
    </form>
    <div class="actions">
      <button type="button" data-action="dupliquer">Dupliquer l’univers</button>
      <button type="button" data-action="supprimer" class="danger">Supprimer l’univers</button>
    </div>`);

  const form = page.querySelector('form');
  const champs = form.elements;
  champs.nom.value = u.nom;
  champs.description.value = u.description;
  champs.couleur.value = u.couleur;

  const afficherCouverture = async () => {
    const url = await urlImage(stockage, u.couvertureId);
    form.querySelector('.couverture').innerHTML = url ? `<img alt="Couverture de l’univers" src="${url}">` : '';
    page.querySelector('[data-action="retirer"]').hidden = !url;
  };
  await afficherCouverture();

  // Enregistrement automatique à chaque modification.
  form.addEventListener('input', e => {
    if (!['nom', 'description', 'couleur'].includes(e.target.name)) return;
    u[e.target.name] = e.target.value;
    if (e.target.name === 'nom') page.querySelector('.fil span').textContent = u.nom || 'Sans nom';
    page.style.setProperty('--couleur-univers', u.couleur);
    stockage.put('univers', u);
  });

  const changerCouverture = async fichier => {
    const ops = u.couvertureId ? [['delete', 'images', u.couvertureId]] : [];
    u.couvertureId = null;
    if (fichier) {
      u.couvertureId = nouvelId();
      ops.push(['put', 'images', { id: u.couvertureId, universId: u.id, fichier }]);
    }
    await stockage.lot([...ops, ['put', 'univers', u]]);
    await afficherCouverture();
  };
  champs.couverture.addEventListener('change', e => e.target.files[0] && changerCouverture(e.target.files[0]));

  page.addEventListener('click', async e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'retirer') await changerCouverture(null);
    if (action === 'dupliquer') location.hash = `#/univers/${(await dupliquerUnivers(stockage, u.id)).id}`;
    if (action === 'supprimer'
      && confirm(`Supprimer « ${u.nom || 'Sans nom'} » et tout son contenu ? Cette action est définitive.`)) {
      await supprimerUnivers(stockage, u.id);
      location.hash = '#/';
    }
  });

  // Après l'affichage par le routeur (qui place lui-même le focus sur la page).
  if (u.nom === 'Nouvel univers') setTimeout(() => champs.nom.select());
}
