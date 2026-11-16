import { assurerTypes } from '../../modele/types.js';

const ONGLETS = [['', 'Présentation'], ['/fiches', 'Fiches'], ['/types', 'Types de fiches']];

// Charge l'univers et affiche le fil d'Ariane + les onglets. Renvoie null (page « introuvable ») s'il n'existe pas.
export async function ouvrirUnivers(page, id, stockage, onglet) {
  const u = await stockage.get('univers', id);
  if (!u) {
    page.innerHTML = '<h1>Univers introuvable</h1><p><a href="#/">Retour à l’accueil</a></p>';
    return null;
  }
  await assurerTypes(stockage, u);
  const base = `#/univers/${encodeURIComponent(u.id)}`;
  page.innerHTML = `<p class="fil"><a href="#/">Mes univers</a> › <span></span></p>
    <nav class="onglets" aria-label="Sections de l’univers">
      ${ONGLETS.map(([chemin, nom]) =>
        `<a href="${base}${chemin}"${chemin === onglet ? ' aria-current="page"' : ''}>${nom}</a>`).join('')}
    </nav>`;
  page.style.setProperty('--couleur-univers', u.couleur);
  page.querySelector('.fil span').textContent = u.nom || 'Sans nom';
  return u;
}
