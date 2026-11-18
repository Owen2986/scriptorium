import { iconeSvg, typesUnivers } from '../../modele/types.js';
import { fichesUnivers } from '../../modele/fiches.js';
import { chercher, trouver } from '../../modele/recherche.js';
import { ouvrirUnivers } from './commun.js';
import { lienFiche } from './fiches.js';

// Texte avec chaque `q` entouré d'un <mark>.
function surligne(texte, q) {
  const morceaux = document.createDocumentFragment();
  let i = 0;
  for (const [debut, fin] of trouver(texte, q)) {
    const mark = document.createElement('mark');
    mark.textContent = texte.slice(debut, fin);
    morceaux.append(texte.slice(i, debut), mark);
    i = fin;
  }
  morceaux.append(texte.slice(i));
  return morceaux;
}

// Résultats de la recherche ; ils se mettent à jour à chaque lettre tapée dans la case.
export async function vueRecherche(page, { id, q = '' }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/recherche');
  if (!u) return;
  const [types, fiches] = await Promise.all([typesUnivers(stockage, u.id), fichesUnivers(stockage, u.id)]);
  page.insertAdjacentHTML('beforeend', `<div class="titre-page"><h1>Recherche</h1></div>
    <p class="vide" role="status"></p><ul class="resultats"></ul>`);
  const champ = page.querySelector('.recherche input');
  const compte = page.querySelector('[role="status"]');
  const liste = page.querySelector('.resultats');

  const afficher = () => {
    const mot = champ.value.trim();
    const resultats = chercher(fiches, types, mot);
    compte.textContent = !mot ? 'Tapez un mot pour chercher dans toutes les fiches de cet univers'
      : !resultats.length ? `Aucune fiche ne contient « ${mot} »`
      : `${resultats.length} fiche${resultats.length > 1 ? 's contiennent' : ' contient'} « ${mot} »`;
    liste.replaceChildren(...resultats.map(r => {
      const li = document.createElement('li');
      li.className = 'carte resultat';
      li.style.setProperty('--couleur-type', r.type?.couleur ?? 'var(--texte-doux)');
      li.innerHTML = `<span class="vignette-fiche">${iconeSvg(r.type?.icone ?? 'scroll-unfurled')}</span>
        <div><a></a> <small></small></div>`;
      const a = li.querySelector('a');
      a.href = lienFiche(u, r.fiche);
      a.append(surligne(r.fiche.nom || 'Sans nom', mot));
      li.querySelector('small').textContent = `· ${r.type?.nom || 'Sans type'}`;
      const div = li.querySelector('div');
      const ligne = (classe, contenu) => {
        const p = document.createElement('p');
        p.className = classe;
        p.append(contenu);
        div.append(p);
      };
      if (r.zone === 'secrets') ligne('ou', 'Trouvé dans les secrets :');
      if (r.extrait) ligne('extrait', surligne(r.extrait, r.zone ? mot : ''));
      if (r.aussi.length) ligne('ou', `${r.zone || r.nom ? 'Aussi dans' : 'Trouvé dans'} : ${r.aussi.join(', ')}`);
      return li;
    }));
  };
  // Arrivé ici en tapant : reprend tout ce qui a été tapé dans la case de la page précédente pendant le chargement.
  const ancien = document.activeElement?.closest?.('.recherche') && document.activeElement;
  champ.value = ancien ? ancien.value : q;
  champ.addEventListener('input', afficher);
  afficher();
  champ.autofocus = true; // le routeur y met la main, sans perdre de lettre
  champ.setSelectionRange(champ.value.length, champ.value.length);
  if (ancien) setTimeout(() => champ.dispatchEvent(new Event('input'))); // remet l'adresse à jour
}
