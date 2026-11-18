import { iconeSvg, typesUnivers } from '../../modele/types.js';
import { fichesUnivers } from '../../modele/fiches.js';
import { statistiques } from '../../modele/statistiques.js';
import { ouvrirUnivers } from './commun.js';
import { lienFiche, avecType, creer } from './fiches.js';

const nombre = n => n.toLocaleString('fr');

// Chiffres de l'univers, fiches les plus citées, fiches que rien ne cite, liens vers des fiches absentes.
export async function vueStatistiques(page, { id }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/statistiques');
  if (!u) return;
  const [types, fiches] = await Promise.all([typesUnivers(stockage, u.id), fichesUnivers(stockage, u.id)]);
  const s = statistiques(fiches, types);
  const typeDe = new Map(types.map(t => [t.id, t]));

  page.insertAdjacentHTML('beforeend', `<div class="stats">
    <div class="titre-page"><h1>Statistiques</h1></div>
    <div class="chiffres">
      <div><strong>${nombre(s.fiches)}</strong><span>fiche${s.fiches > 1 ? 's' : ''}</span></div>
      <div><strong>${nombre(s.mots)}</strong><span>mot${s.mots > 1 ? 's' : ''}</span></div>
    </div>
    <table>
      <thead><tr><th scope="col">Type</th><th scope="col" class="n">Fiches</th><th scope="col" class="n">Mots</th></tr></thead>
      <tbody>${s.parType.map(l => `<tr style="--couleur-type:${l.type.couleur}">
        <td>${iconeSvg(l.type.icone)}<span></span></td><td class="n">${nombre(l.fiches)}</td><td class="n">${nombre(l.mots)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="deux-col">
      <section><h2>Les plus citées</h2><ol class="liste-stats citees"></ol></section>
      <section><h2>Que rien ne cite <small>${s.orphelines.length}</small></h2><ul class="liste-stats orphelines"></ul></section>
    </div>
    <h2>Liens vers des fiches absentes <small>${s.absents.length}</small></h2>
    <ul class="liste-stats absents"></ul>
  </div>`);
  page.querySelectorAll('tbody span').forEach((span, i) => { span.textContent = s.parType[i].type.nom || 'Sans nom'; });

  // Une fiche : icône de son type + lien.
  const ligneFiche = (f, fin = '') => {
    const t = typeDe.get(f.typeId);
    const li = document.createElement('li');
    if (t) li.style.setProperty('--couleur-type', t.couleur);
    li.innerHTML = `${t ? iconeSvg(t.icone) : ''}<a></a>${fin}`;
    li.querySelector('a').href = lienFiche(u, f);
    li.querySelector('a').textContent = f.nom || 'Sans nom';
    return li;
  };
  const remplir = (ul, lignes, vide) => {
    if (lignes.length) ul.replaceChildren(...lignes);
    else ul.outerHTML = `<p class="vide">${vide}</p>`;
  };
  remplir(page.querySelector('.citees'),
    s.plusCitees.map(({ fiche, n }, i) => ligneFiche(fiche, `<span class="nb">${i ? '' : 'cité '}${n} fois</span>`)),
    'Aucune fiche n’est encore citée');
  remplir(page.querySelector('.orphelines'), s.orphelines.map(f => ligneFiche(f)),
    s.fiches ? 'Toutes les fiches sont citées' : 'Aucune fiche pour l’instant');
  remplir(page.querySelector('.absents'), s.absents.map((a, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span><span class="lien absent"></span> <span class="vide">dans</span> </span>
      <span class="actions"><button type="button" class="principal" data-creer="${i}">Créer la fiche</button></span>`;
    li.querySelector('.absent').textContent = a.nom;
    const ou = li.querySelector('span');
    a.sources.forEach((f, j) => {
      const lien = document.createElement('a');
      lien.href = lienFiche(u, f);
      lien.textContent = f.nom || 'Sans nom';
      ou.append(...(j ? [', ', lien] : [lien]));
    });
    return li;
  }), 'Aucun lien vers une fiche absente');

  page.addEventListener('click', e => {
    const b = e.target.closest('[data-creer]');
    if (b) avecType(page, types, t => creer(stockage, u, t, s.absents[b.dataset.creer].nom));
  });
}
