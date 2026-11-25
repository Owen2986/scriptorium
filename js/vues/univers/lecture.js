import { noeudsTome, lignesPlan, titreNoeud } from '../../modele/plan.js';
import { LIEN } from '../../modele/liens.js';
import { nettoyer } from '../../ui/texte-riche.js';
import { dessin } from '../../ui/icones.js';
import { message } from '../../ui/message.js';
import { ouvrirUnivers } from './commun.js';
import { lienEcriture } from './ecriture.js';

export const lienLecture = (u, tome, n) =>
  `#/univers/${encodeURIComponent(u.id)}/manuscrit/${encodeURIComponent(tome.id)}/lecture${n ? '/' + encodeURIComponent(n.id) : ''}`;

// Endroit où l'on s'est arrêté de lire, par tome, propre à l'appareil.
const CLE = 'scriptorium.lecture';
const lirePositions = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; } };
const garderPosition = (tomeId, id) => {
  try { localStorage.setItem(CLE, JSON.stringify({ ...lirePositions(), [tomeId]: id })); } catch { /* retenu pour cette visite seulement */ }
};

// Lecture continue d'un tome : tout le texte à la suite, sommaire, « Modifier » par scène, reprise où l'on s'était arrêté.
export async function vueLecture(page, { id, tomeId, noeudId }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/manuscrit');
  if (!u) return;
  const tome = await stockage.get('tomes', tomeId);
  if (!tome || tome.universId !== u.id || tome.corbeille) {
    page.insertAdjacentHTML('beforeend', '<h1>Tome introuvable</h1>');
    return;
  }
  const lignes = lignesPlan(await noeudsTome(stockage, tome.id));
  const textes = new Map((await Promise.all(lignes.map(l => stockage.get('textes', l.noeud.id))))
    .filter(t => t?.html).map(t => [t.noeudId, t.html]));
  const urlTome = `#/univers/${encodeURIComponent(u.id)}/manuscrit/${encodeURIComponent(tome.id)}`;

  const fil = page.querySelector('.fil');
  fil.innerHTML = '<a href="#/">Mes univers</a> › <a></a> › <a></a> › Lecture';
  const [, lienU, lienT] = fil.querySelectorAll('a');
  lienU.href = `#/univers/${encodeURIComponent(u.id)}`;
  lienU.textContent = u.nom || 'Sans nom';
  lienT.href = urlTome;
  lienT.textContent = tome.titre || 'Sans titre';

  page.insertAdjacentHTML('beforeend', `<div class="lecture">
      <div class="voile" data-action="fermer"></div>
      <aside class="plan-leger" aria-label="Sommaire">
        <div class="tete-plan"><h2>Sommaire</h2><button type="button" class="fermer-plan" data-action="fermer">Fermer</button></div>
        <ul></ul>
        <a class="organiser" href="${urlTome}">Retour au tome</a>
      </aside>
      <article class="livre">
        <button type="button" class="ouvrir-plan" data-action="ouvrir" aria-expanded="false">${dessin('vue-liste')}Sommaire</button>
        <h1 class="titre-tome"></h1>
      </article>
    </div>`);
  const $ = s => page.querySelector(s);
  const livre = $('.livre');
  $('.titre-tome').textContent = tome.titre || 'Sans titre';

  // Le livre : titres des parties et chapitres, textes à la suite, « * * * » entre deux textes sans titre entre eux.
  // Chaque élément du plan a son repère `data-id` (même vide), pour y sauter ou y reprendre la lecture.
  let apresTexte = false;
  for (const l of lignes) {
    const n = l.noeud;
    const bloc = document.createElement('div');
    bloc.dataset.id = n.id;
    if (n.sorte === 'partie') {
      bloc.innerHTML = '<h2 class="partie"></h2>';
      bloc.firstChild.textContent = titreNoeud(l);
      apresTexte = false;
    }
    if (n.sorte === 'chapitre') {
      bloc.innerHTML = `<div class="tete-chapitre">${n.titre ? `<small>Chapitre ${l.numero}</small>` : ''}<h2></h2></div>`;
      bloc.querySelector('h2').textContent = n.titre || `Chapitre ${l.numero}`;
      apresTexte = false;
    }
    const html = textes.get(n.id);
    if (html) {
      const scene = document.createElement('section');
      scene.className = 'scene';
      // Les liens [[Nom]] deviennent du texte normal.
      scene.innerHTML = `<a class="modifier" href="${lienEcriture(u, tome, n)}">Modifier</a>${nettoyer(html).replace(LIEN, (_, nom) => nom)}`;
      scene.querySelector('.modifier').setAttribute('aria-label', `Modifier ${titreNoeud(l)}`);
      if (apresTexte) bloc.insertAdjacentHTML('beforeend', '<p class="ornement" aria-hidden="true">***</p>');
      bloc.append(scene);
      apresTexte = true;
    }
    livre.append(bloc);
  }
  if (!textes.size) livre.insertAdjacentHTML('beforeend', `<p class="vide">Ce tome n’a pas encore de texte. <a href="${urlTome}">Retour au tome</a></p>`);

  // Sommaire : parties et chapitres ; le dernier dont le titre est passé est surligné.
  const titres = lignes.filter(l => l.noeud.sorte !== 'scene');
  $('.plan-leger ul').replaceChildren(...titres.map(l => {
    const li = document.createElement('li');
    li.innerHTML = `<a class="${l.noeud.sorte}" href="#" style="--niveau:${l.niveau}"></a>`;
    li.firstChild.textContent = titreNoeud(l);
    li.firstChild.dataset.cible = l.noeud.id;
    return li;
  }));
  const bloc = idN => livre.querySelector(`[data-id="${CSS.escape(idN)}"]`);
  const aller = idN => bloc(idN)?.scrollIntoView();

  // Élément en cours de lecture : le dernier dont le haut est dans le premier tiers de l’écran (ou au-dessus).
  const actuel = () => {
    let id = null;
    for (const b of livre.querySelectorAll('[data-id]')) {
      if (b.getBoundingClientRect().top > innerHeight / 3) break;
      id = b.dataset.id;
    }
    return id;
  };
  let minuterie;
  const suivre = () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      const id = actuel();
      garderPosition(tome.id, id);
      // Dans le sommaire : la partie ou le chapitre qui contient l'élément en cours.
      const i = lignes.findIndex(l => l.noeud.id === id);
      const titre = lignes.slice(0, i + 1).reverse().find(l => l.noeud.sorte !== 'scene');
      page.querySelectorAll('.plan-leger [data-cible]').forEach(a =>
        a.dataset.cible === titre?.noeud.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    }, 200);
  };
  addEventListener('scroll', suivre, { passive: true });
  addEventListener('hashchange', () => removeEventListener('scroll', suivre), { once: true });

  const ouvrir = $('.ouvrir-plan');
  const panneau = ouvert => {
    $('.lecture').classList.toggle('plan-ouvert', ouvert);
    ouvrir.setAttribute('aria-expanded', ouvert);
  };
  page.addEventListener('click', e => {
    const cible = e.target.closest('[data-cible]');
    if (cible) {
      e.preventDefault();
      panneau(false);
      aller(cible.dataset.cible);
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'ouvrir') { panneau(true); $('.plan-leger a').focus(); }
    if (action === 'fermer') { panneau(false); ouvrir.focus(); }
  });
  page.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('.plan-ouvert')) { panneau(false); ouvrir.focus(); }
  });

  // Ouverture : à l'élément demandé (« Lire d'ici »), sinon là où l'on s'était arrêté. La page doit être affichée pour défiler.
  const reprise = !noeudId && lirePositions()[tome.id];
  requestAnimationFrame(() => {
    if (noeudId) aller(noeudId);
    else if (reprise && reprise !== lignes[0]?.noeud.id && bloc(reprise)) {
      aller(reprise);
      message('Reprise là où vous vous étiez arrêté', () => scrollTo(0, 0), 'Revenir au début');
    }
    suivre();
  });
}
