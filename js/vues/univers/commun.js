import { assurerTypes } from '../../modele/types.js';
import { dessin } from '../../ui/icones.js';

const ONGLETS = [['', 'Présentation'], ['/fiches', 'Fiches'], ['/types', 'Types de fiches'], ['/statistiques', 'Statistiques']];

// Charge l'univers et affiche le fil d'Ariane, les onglets et la recherche. Renvoie null (page « introuvable ») s'il n'existe pas.
export async function ouvrirUnivers(page, id, stockage, onglet) {
  const u = await stockage.get('univers', id);
  if (!u || u.corbeille) {
    page.innerHTML = '<h1>Univers introuvable</h1><p><a href="#/">Retour à l’accueil</a></p>';
    return null;
  }
  await assurerTypes(stockage, u);
  const base = `#/univers/${encodeURIComponent(u.id)}`;
  page.innerHTML = `<p class="fil"><a href="#/">Mes univers</a> › <span></span></p>
    <div class="barre-univers">
      <nav class="onglets" aria-label="Sections de l’univers">
        ${ONGLETS.map(([chemin, nom]) =>
          `<a href="${base}${chemin}"${chemin === onglet ? ' aria-current="page"' : ''}>${nom}</a>`).join('')}
      </nav>
      <label class="recherche">${dessin('loupe')}<input type="search" placeholder="Chercher dans l’univers" aria-label="Chercher dans l’univers"></label>
    </div>`;
  page.style.setProperty('--couleur-univers', u.couleur);
  page.querySelector('.fil span').textContent = u.nom || 'Sans nom';
  // Taper ouvre la page de recherche ; une fois dessus, l'adresse suit le texte sans recharger la page.
  const champ = page.querySelector('.recherche input');
  champ.addEventListener('input', () => {
    const adresse = `${base}/recherche${champ.value ? '/' + encodeURIComponent(champ.value) : ''}`;
    if (onglet === '/recherche') history.replaceState(null, '', adresse); else location.hash = adresse;
  });
  return u;
}
