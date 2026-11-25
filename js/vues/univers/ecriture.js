import { ETATS, nouveauNoeud, noeudsTome, lignesPlan, titreNoeud, ecrivables, aOuvrir } from '../../modele/plan.js';
import { typesUnivers } from '../../modele/types.js';
import { fichesUnivers } from '../../modele/fiches.js';
import { cle, indexNoms } from '../../modele/liens.js';
import { editeur } from '../../ui/texte-riche.js';
import { decorerLiens } from '../../ui/liens.js';
import { dessin } from '../../ui/icones.js';
import { message } from '../../ui/message.js';
import { ouvrirUnivers } from './commun.js';
import { brancherLiens } from './fiches.js';

export const lienEcriture = (u, tome, n) =>
  `#/univers/${encodeURIComponent(u.id)}/manuscrit/${encodeURIComponent(tome.id)}/${encodeURIComponent(n.id)}`;

// « Écrire » : ouvre le premier chapitre ou la première scène du tome ; un plan vide reçoit un premier chapitre.
export async function ecrire(stockage, u, tome) {
  const noeuds = await noeudsTome(stockage, tome.id);
  let n = ecrivables(lignesPlan(noeuds))[0]?.noeud;
  if (!n) {
    n = nouveauNoeud(tome, 'chapitre');
    await stockage.put('noeudsManuscrit', n);
  }
  location.hash = lienEcriture(u, tome, n);
}

// Écran d'écriture d'un chapitre ou d'une scène : plan léger, titre, état, texte, notes d'auteur, précédent / suivant.
export async function vueEcriture(page, { id, tomeId, noeudId }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/manuscrit');
  if (!u) return;
  const tome = await stockage.get('tomes', tomeId);
  const noeuds = tome && !tome.corbeille && tome.universId === u.id ? await noeudsTome(stockage, tome.id) : [];
  const lignes = lignesPlan(noeuds);
  const ligne = lignes.find(l => l.noeud.id === noeudId);
  if (!ligne) {
    page.insertAdjacentHTML('beforeend', '<h1>Page introuvable</h1><p>Ce chapitre ou cette scène n’existe plus.</p>');
    return;
  }
  // Une partie ne porte pas de texte : on ouvre son premier chapitre (ou on revient au tome si elle est vide).
  const urlTome = `#/univers/${encodeURIComponent(u.id)}/manuscrit/${encodeURIComponent(tome.id)}`;
  if (ligne.noeud.sorte === 'partie') {
    const l = aOuvrir(noeudId, lignes);
    location.replace(l ? lienEcriture(u, tome, l.noeud) : urlTome);
    if (!l) message('Cette partie est vide');
    return;
  }
  const noeud = ligne.noeud;
  const texte = await stockage.get('textes', noeud.id) ?? { noeudId: noeud.id, html: '' };
  const [types, fiches] = await Promise.all([typesUnivers(stockage, u.id), fichesUnivers(stockage, u.id)]);
  const index = indexNoms(fiches);
  const trouver = nom => index.get(cle(nom));
  const suite = ecrivables(lignes);
  const i = suite.indexOf(ligne);
  const [avant, apres] = [suite[i - 1], suite[i + 1]];
  const court = l => l.noeud.sorte === 'chapitre' ? `Chapitre ${l.numero}` : titreNoeud(l);

  // Fil d'Ariane : univers › tome › parties et chapitres au-dessus › élément ouvert.
  const parents = [];
  for (let p = noeuds.find(n => n.id === noeud.parentId); p; p = noeuds.find(n => n.id === p.parentId)) parents.unshift(p);
  const fil = page.querySelector('.fil');
  fil.innerHTML = '<a href="#/">Mes univers</a> › <a></a> › <a></a>';
  const [, lienU, lienT] = fil.querySelectorAll('a');
  lienU.href = `#/univers/${encodeURIComponent(u.id)}`;
  lienU.textContent = u.nom || 'Sans nom';
  lienT.href = urlTome;
  lienT.textContent = tome.titre || 'Sans titre';
  for (const l of [...parents.map(p => lignes.find(l => l.noeud === p)), ligne]) fil.append(' › ', court(l));

  page.insertAdjacentHTML('beforeend', `<div class="ecriture">
      <div class="voile" data-action="fermer"></div>
      <aside class="plan-leger" aria-label="Plan du tome">
        <div class="tete-plan"><h2>Plan</h2><button type="button" class="fermer-plan" data-action="fermer">Fermer</button></div>
        <ul></ul>
        <a class="organiser" href="${urlTome}">Organiser le plan</a>
      </aside>
      <article>
        <button type="button" class="ouvrir-plan" data-action="ouvrir" aria-expanded="false">${dessin('vue-liste')}Plan</button>
        ${noeud.sorte === 'chapitre' ? `<small class="numero-chapitre">Chapitre ${ligne.numero}</small>` : ''}
        <div class="tete-ecriture">
          <input class="titre-ecriture" autocomplete="off" aria-label="Titre">
          <select aria-label="État">${Object.entries(ETATS).map(([k, libelle]) =>
            `<option value="${k}"${k === noeud.etat ? ' selected' : ''}>${libelle}</option>`).join('')}</select>
        </div>
        <div class="zone-texte"></div>
        <details class="carte secrets"${texte.notes ? ' open' : ''}>
          <summary><svg class="icone" aria-hidden="true"><use href="icones/types.svg#key"></use></svg> Notes d’auteur</summary>
          <div class="zone-secrets"></div>
        </details>
        <nav class="suivants" aria-label="Chapitres et scènes voisins"></nav>
        <p class="etat-enregistrement" aria-live="polite"></p>
      </article>
    </div>`);
  const $ = s => page.querySelector(s);

  // Plan léger : chapitres et scènes avec leur état ; une partie mène à son premier chapitre.
  $('.plan-leger ul').replaceChildren(...lignes.map(l => {
    const li = document.createElement('li');
    li.innerHTML = `<a class="${l.noeud.sorte}" style="--niveau:${l.niveau}">${l.noeud.sorte === 'partie' ? ''
      : `<span class="etat ${l.noeud.etat}" title="${ETATS[l.noeud.etat]}"></span>`}<span></span></a>`;
    const a = li.firstChild;
    a.href = lienEcriture(u, tome, l.noeud);
    a.lastChild.textContent = titreNoeud(l);
    if (l === ligne) a.setAttribute('aria-current', 'page');
    return li;
  }));
  const lienActuel = $('.plan-leger [aria-current]');

  $('.suivants').innerHTML = [[avant, '← Précédent', ''], [apres, 'Suivant →', 'apres']].map(([l, sens, cls]) =>
    l ? `<a class="${cls}" href="${lienEcriture(u, tome, l.noeud)}"><small>${sens}</small><span></span></a>` : '').join('');
  [avant, apres].filter(Boolean).forEach((l, k) => { $('.suivants').children[k].lastChild.textContent = titreNoeud(l); });

  // Tout s'enregistre à chaque modification.
  let minuterie;
  const signaler = async promesse => {
    clearTimeout(minuterie);
    await promesse;
    $('.etat-enregistrement').textContent = 'Enregistré';
    minuterie = setTimeout(() => { $('.etat-enregistrement').textContent = ''; }, 2000);
  };
  const enregistrerTexte = () => signaler(stockage.put('textes', texte));
  const enregistrerNoeud = () => signaler(stockage.put('noeudsManuscrit', noeud));

  const titre = $('.titre-ecriture');
  titre.value = noeud.titre;
  titre.placeholder = noeud.sorte === 'chapitre' ? 'Titre (facultatif)' : 'Titre de la scène';
  titre.addEventListener('input', () => {
    noeud.titre = titre.value.trim();
    lienActuel.lastChild.textContent = titreNoeud(ligne);
    if (noeud.sorte === 'scene') fil.lastChild.textContent = titreNoeud(ligne);
    enregistrerNoeud();
  });
  $('.tete-ecriture select').addEventListener('change', e => {
    noeud.etat = e.target.value;
    Object.assign(lienActuel.querySelector('.etat'), { className: `etat ${noeud.etat}`, title: ETATS[noeud.etat] });
    enregistrerNoeud();
  });

  const decorer = racine => decorerLiens(racine, trouver);
  editeur($('.zone-texte'), texte.html, html => { texte.html = html; enregistrerTexte(); }, { nom: 'Texte', decorer });
  editeur($('.zone-secrets'), texte.notes, html => { texte.notes = html; enregistrerTexte(); },
    { barre: false, nom: 'Notes d’auteur', decorer });
  brancherLiens(page, [$('.zone-texte'), $('.zone-secrets')], { stockage, u, types, liste: fiches, trouver });

  // Téléphone : le plan est un panneau qu'on ouvre et ferme.
  const ouvrir = $('.ouvrir-plan');
  page.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action !== 'ouvrir' && action !== 'fermer') return;
    page.querySelector('.ecriture').classList.toggle('plan-ouvert', action === 'ouvrir');
    ouvrir.setAttribute('aria-expanded', action === 'ouvrir');
    (action === 'ouvrir' ? lienActuel : ouvrir).focus();
  });
  page.addEventListener('keydown', e => {
    if (e.key === 'Escape' && page.querySelector('.plan-ouvert')) $('.fermer-plan').click();
  });
}
